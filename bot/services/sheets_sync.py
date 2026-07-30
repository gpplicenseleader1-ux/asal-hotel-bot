"""Two-way Google Sheets sync for the hotel's «Брони» worksheet.

Supabase is the single source of truth; the sheet is a live projection plus a
command queue keyed by "ID брони" (the same short id shown to guests/admins,
see utils.helpers.get_booking_id). Ported from the reference BOTASS bot's
sheets_sync.py (SQLite) and adapted to Supabase — push/pull logic mirrors that
design, simplified where our schema doesn't need the SQLite-specific machinery
(no manual-create-from-sheet support; that wasn't asked for here).

Fully feature-flagged: sync_loop is only started (see main.py) when both
GOOGLE_SA_JSON and GOOGLE_SHEETS_ID are set. Any failure here is caught and
logged — it must never crash the poller or block booking.
"""

import logging
from datetime import date, datetime, timezone

import gspread

import config
from services import booking_service
from services.google_auth import get_credentials
from services.supabase_client import get_service_client
from utils.helpers import get_booking_id

logger = logging.getLogger(__name__)

SCOPES = ["https://www.googleapis.com/auth/spreadsheets"]
SHEET_TAB = "Брони"

# 1-based column numbers. Columns 1-17 are BOT-OWNED (rewritten every push
# cycle from Supabase); push must NEVER touch 18-21 (staff/receipt-owned).
HEADERS = [
    "Дата брони", "ID брони", "Имя", "Телефон", "Telegram ID", "Номер", "Тип",
    "Заезд", "Выезд", "Ночей", "Гостей", "Дети", "Доп.матрас", "Способ оплаты",
    "Сумма (UZS)", "Оплачено (да/нет)", "Статус",
    "Действие", "Примечание",
    # staff-INPUT columns, used only by the "Изменить даты" action. Kept OUT of
    # the 19-column base spec's Заезд/Выезд (those are bot-owned and would be
    # overwritten by the very next push before pull could read a staff edit —
    # this mirrors how the reference bot avoids the same race).
    "Новый заезд", "Новый выезд",
]
(C_CREATED, C_CODE, C_NAME, C_PHONE, C_TGID, C_ROOM, C_TYPE,
 C_CHECKIN, C_CHECKOUT, C_NIGHTS, C_GUESTS, C_KIDS, C_EXTRA_BED, C_PAY,
 C_TOTAL, C_PAID, C_STATUS, C_ACTION, C_NOTE, C_NEW_IN, C_NEW_OUT) = range(1, len(HEADERS) + 1)

BOT_COLS = (C_CREATED, C_CODE, C_NAME, C_PHONE, C_TGID, C_ROOM, C_TYPE,
            C_CHECKIN, C_CHECKOUT, C_NIGHTS, C_GUESTS, C_KIDS, C_EXTRA_BED,
            C_PAY, C_TOTAL, C_PAID, C_STATUS)

ACT_CONFIRM, ACT_CANCEL, ACT_CHECKIN, ACT_REDATE = (
    "подтвердить", "отменить", "заселить", "изменить даты",
)

_STATUS_LABELS = {
    "pending": "Ожидает", "confirmed": "Подтверждено",
    "cancelled": "Отменено", "completed": "Завершено",
}
_PAY_LABELS = {"cash": "Наличные", "transfer": "Перевод", "card": "Карта"}

_ws: gspread.Worksheet | None = None


def _col_letter(n: int) -> str:
    s = ""
    while n > 0:
        n, r = divmod(n - 1, 26)
        s = chr(65 + r) + s
    return s


def _get_worksheet() -> gspread.Worksheet:
    global _ws
    if _ws is None:
        creds = get_credentials(SCOPES)
        gc = gspread.authorize(creds)
        gc.set_timeout((10, 30))  # bound a black-holed connection instead of hanging forever
        sh = gc.open_by_key(config.GOOGLE_SHEETS_ID)
        try:
            ws = sh.worksheet(SHEET_TAB)
        except gspread.WorksheetNotFound:
            ws = sh.add_worksheet(title=SHEET_TAB, rows=1000, cols=len(HEADERS))
        current = ws.row_values(1) if ws.row_count else []
        if current[: len(HEADERS)] != HEADERS:
            ws.update(values=[HEADERS], range_name=f"A1:{_col_letter(len(HEADERS))}1")
        _ws = ws
    return _ws


def _fmt_dt(raw: str | None) -> str:
    if not raw:
        return ""
    try:
        return datetime.fromisoformat(raw.replace("Z", "+00:00")).strftime("%d.%m.%Y %H:%M")
    except (ValueError, AttributeError):
        return raw


def _fmt_date(raw: str | None) -> str:
    if not raw:
        return ""
    try:
        return date.fromisoformat(raw).strftime("%d.%m.%Y")
    except (ValueError, TypeError):
        return raw


def _parse_date(raw: str) -> date | None:
    s = (raw or "").strip()
    if not s:
        return None
    for fmt in ("%d.%m.%Y", "%Y-%m-%d"):
        try:
            return datetime.strptime(s, fmt).date()
        except ValueError:
            continue
    return None


def _status_label(status: str, checked_in: bool) -> str:
    label = _STATUS_LABELS.get(status, status or "")
    if checked_in and status == "confirmed":
        label += " · заселён"
    return label


def _booking_to_row(b: dict) -> dict[int, str]:
    room = b.get("rooms") or {}
    room_type = str(room.get("type") or "")
    room_label = config.ROOM_TYPES.get(room_type, {}).get("ru", {}).get("name", room_type)
    return {
        C_CREATED: _fmt_dt(b.get("created_at")),
        C_CODE: get_booking_id(str(b.get("id", ""))),
        C_NAME: b.get("guest_name") or "",
        C_PHONE: b.get("guest_phone") or "",
        C_TGID: str(b.get("user_telegram_id") or ""),
        C_ROOM: room.get("room_number") or "",
        C_TYPE: room_label,
        C_CHECKIN: _fmt_date(b.get("check_in")),
        C_CHECKOUT: _fmt_date(b.get("check_out")),
        C_NIGHTS: str(b.get("nights") or ""),
        # guests_count / children / extra-bed aren't persisted columns on `bookings`
        # (see supabase/migrations) — left blank rather than guessed.
        C_GUESTS: "",
        C_KIDS: "",
        C_EXTRA_BED: "",
        C_PAY: _PAY_LABELS.get(str(b.get("payment_method") or ""), b.get("payment_method") or ""),
        C_TOTAL: str(int(b.get("total_price") or 0)),
        C_PAID: "да" if b.get("payment_status") == "paid" else "нет",
        C_STATUS: _status_label(str(b.get("status") or ""), bool(b.get("checked_in"))),
    }


def _fetch_bookings() -> list[dict]:
    db = get_service_client()
    result = (
        db.table("bookings")
        .select("*, rooms(room_number, type, price_per_night)")
        .order("created_at", desc=True)
        .limit(1000)
        .execute()
    )
    return result.data or []


def push_once(bookings: list[dict]) -> None:
    """Supabase -> sheet. Upserts each booking by "ID брони"; never touches the
    staff-owned Действие/Примечание/Новый заезд/Новый выезд columns."""
    ws = _get_worksheet()
    values = ws.get_all_values()
    existing_row_by_code: dict[str, int] = {}
    for i, row in enumerate(values[1:], start=2):  # row 1 is the header
        code = row[C_CODE - 1] if len(row) >= C_CODE else ""
        if code:
            existing_row_by_code[code.strip()] = i

    updates: list[dict] = []
    appends: list[list[str]] = []
    for b in bookings:
        try:
            cells = _booking_to_row(b)
        except Exception:
            logger.exception("sheets push: failed to build row for booking %s", b.get("id"))
            continue
        code = cells[C_CODE]
        row_idx = existing_row_by_code.get(code)
        if row_idx is not None:
            start, end = _col_letter(1), _col_letter(len(BOT_COLS))
            row_values = [cells[c] for c in BOT_COLS]
            updates.append({"range": f"{start}{row_idx}:{end}{row_idx}", "values": [row_values]})
        else:
            row_values = [""] * len(HEADERS)
            for col in BOT_COLS:
                row_values[col - 1] = cells[col]
            appends.append(row_values)

    try:
        if updates:
            ws.batch_update(updates, value_input_option="RAW")
        for row_values in appends:
            ws.append_row(row_values, value_input_option="RAW")
    except Exception:
        logger.exception("sheets push: write failed")


async def _apply_action(action: str, booking: dict, new_in_raw: str, new_out_raw: str) -> str:
    booking_id = str(booking["id"])
    stamp = datetime.now(timezone.utc).astimezone().strftime("%H:%M")

    if action == ACT_CONFIRM:
        await booking_service.update_booking_status(booking_id, "confirmed")
        return f"✅ Подтверждено {stamp}"

    if action == ACT_CANCEL:
        updated = await booking_service.update_booking_status(booking_id, "cancelled")
        room_id = (updated or booking).get("room_id")
        if room_id:
            await booking_service.update_room_status(room_id, "available")
        return f"❌ Отменено {stamp}"

    if action == ACT_CHECKIN:
        await booking_service.mark_checked_in(booking_id)
        return f"🏨 Заселено {stamp}"

    if action == ACT_REDATE:
        new_in = _parse_date(new_in_raw)
        new_out = _parse_date(new_out_raw)
        if not new_in or not new_out:
            return "✖ укажите Новый заезд и Новый выезд (ДД.ММ.ГГГГ)"
        if new_out <= new_in:
            return "✖ выезд должен быть позже заезда"
        room = booking.get("rooms") or {}
        room_type = str(room.get("type") or "")
        price = (config.ROOM_TYPES.get(room_type) or {}).get("price")
        if price is None:
            return "✖ неизвестный тип номера у брони"
        nights = (new_out - new_in).days
        total = price * nights
        await booking_service.update_booking_dates(booking_id, new_in, new_out, nights, total)
        return f"📅 Даты изменены на {new_in.strftime('%d.%m')}→{new_out.strftime('%d.%m')} {stamp}"

    return f"✖ неизвестное действие «{action}»"


async def pull_once(bookings: list[dict]) -> None:
    """Sheet -> Supabase. Reads the Действие column; applies a recognised
    action, writes a receipt to Примечание, and clears Действие (that clearing
    IS the "already processed" marker for the next cycle)."""
    ws = _get_worksheet()
    values = ws.get_all_values()
    by_code = {get_booking_id(str(b["id"])): b for b in bookings}

    for i, row in enumerate(values[1:], start=2):
        action_raw = row[C_ACTION - 1] if len(row) >= C_ACTION else ""
        action = action_raw.strip().lower()
        if not action:
            continue
        code = (row[C_CODE - 1] if len(row) >= C_CODE else "").strip()
        booking = by_code.get(code)

        if not booking:
            note = "✖ ID брони не найден" if code else "✖ пустой ID брони"
            writes = {C_ACTION: "", C_NOTE: note}
        else:
            new_in = row[C_NEW_IN - 1] if len(row) >= C_NEW_IN else ""
            new_out = row[C_NEW_OUT - 1] if len(row) >= C_NEW_OUT else ""
            try:
                note = await _apply_action(action, booking, new_in, new_out)
            except Exception:
                logger.exception("sheets pull: action failed for row %s", i)
                note = "✖ ошибка при применении"
            writes = {C_ACTION: "", C_NOTE: note}
            if action == ACT_REDATE and not note.startswith("✖"):
                writes[C_NEW_IN] = ""
                writes[C_NEW_OUT] = ""

        try:
            ws.batch_update(
                [{"range": f"{_col_letter(col)}{i}", "values": [[val]]} for col, val in writes.items()],
                value_input_option="RAW",
            )
        except Exception:
            logger.exception("sheets pull: write-back failed for row %s", i)


async def sync_loop(bot) -> None:
    """Forever: push then pull, every SHEETS_SYNC_INTERVAL_SECONDS. One bad
    cycle logs and retries — never crashes the poller. Backs off (capped at
    ~10 min) on repeated failures so a Google outage doesn't hammer the API."""
    import asyncio

    interval = max(15, config.SHEETS_SYNC_INTERVAL_SECONDS)
    fails = 0
    while True:
        try:
            bookings = _fetch_bookings()
            push_once(bookings)
            await pull_once(bookings)
            fails = 0
        except Exception:
            fails += 1
            logger.exception("sheets sync cycle failed (%d in a row)", fails)
        delay = interval if fails == 0 else min(interval * (2 ** min(fails, 5)), 600)
        await asyncio.sleep(delay)
