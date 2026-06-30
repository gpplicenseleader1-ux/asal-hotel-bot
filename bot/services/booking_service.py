import asyncio
import uuid
import logging
from datetime import date
from typing import Any, Optional

from aiogram import Bot

import config
from keyboards.admin import booking_action_keyboard
from services.supabase_client import get_service_client
from services import sheets_service, calendar_service
from utils.helpers import loyalty_tier_from_nights

logger = logging.getLogger(__name__)


async def get_or_create_user(
    telegram_id: int,
    username: str | None,
    full_name: str,
    lang: str = "ru",
) -> dict[str, Any]:
    db = get_service_client()
    default_user: dict[str, Any] = {
        "telegram_id": telegram_id,
        "username": username or "",
        "full_name": full_name,
        "language": lang,
        "loyalty_status": "base",
        "nights_count": 0,
        "discount_percent": 0,
    }
    try:
        result = db.table("users").select("*").eq("telegram_id", telegram_id).execute()
        if result.data:
            return result.data[0]
    except Exception as exc:
        logger.error("get_or_create_user select failed: %s", exc, exc_info=True)
        return default_user
    try:
        created = db.table("users").insert(default_user).execute()
        if created.data:
            return created.data[0]
    except Exception as exc:
        logger.error("get_or_create_user insert failed: %s", exc, exc_info=True)
    return default_user


async def update_user_language(telegram_id: int, lang: str) -> None:
    db = get_service_client()
    db.table("users").update({"language": lang}).eq("telegram_id", telegram_id).execute()


async def get_available_room(room_type: str, check_in: date, check_out: date) -> Optional[dict[str, Any]]:
    db = get_service_client()
    result = db.rpc(
        "first_available_room",
        {
            "p_type": room_type,
            "p_check_in": check_in.isoformat(),
            "p_check_out": check_out.isoformat(),
        },
    ).execute()
    data = result.data
    if not data:
        return None
    # Supabase returns a single-row RPC result as a dict, not a list
    if isinstance(data, list):
        return data[0] if data else None
    return data


async def create_booking(
    user_telegram_id: int,
    room_id: str,
    room_type: str,
    check_in: date,
    check_out: date,
    nights: int,
    total_price: float,
    guest_name: str,
    guest_phone: str,
    guests_count: int,
    payment_method: str,
    source: str = "telegram",
) -> dict[str, Any]:
    db = get_service_client()
    booking = {
        "id": str(uuid.uuid4()),
        "user_telegram_id": user_telegram_id,
        "room_id": room_id,
        "room_type": room_type,
        "check_in": check_in.isoformat(),
        "check_out": check_out.isoformat(),
        "nights": nights,
        "total_price": total_price,
        "guest_name": guest_name,
        "guest_phone": guest_phone,
        "guests_count": guests_count,
        "payment_method": payment_method,
        "payment_status": "pending",
        "status": "confirmed",
        "source": source,
    }
    result = db.table("bookings").insert(booking).execute()
    return result.data[0]


async def update_room_status(room_id: str, status: str) -> None:
    db = get_service_client()
    db.table("rooms").update({"status": status}).eq("id", room_id).execute()


async def update_booking_status(booking_id: str, status: str) -> dict[str, Any] | None:
    db = get_service_client()
    result = db.table("bookings").update({"status": status}).eq("id", booking_id).execute()
    if result.data:
        return result.data[0]
    return None


async def get_user_bookings(telegram_id: int) -> list[dict[str, Any]]:
    db = get_service_client()
    result = (
        db.table("bookings")
        .select("*, rooms(room_number, type)")
        .eq("user_telegram_id", telegram_id)
        .order("created_at", desc=True)
        .limit(10)
        .execute()
    )
    return result.data or []


async def get_bookings_for_date(target_date: date) -> list[dict[str, Any]]:
    db = get_service_client()
    result = (
        db.table("bookings")
        .select("*, rooms(room_number, type)")
        .lte("check_in", target_date.isoformat())
        .gte("check_out", target_date.isoformat())
        .neq("status", "cancelled")
        .execute()
    )
    return result.data or []


async def get_bookings_for_period(start: date, end: date) -> list[dict[str, Any]]:
    db = get_service_client()
    result = (
        db.table("bookings")
        .select("*, rooms(room_number, type)")
        .gte("check_in", start.isoformat())
        .lte("check_in", end.isoformat())
        .neq("status", "cancelled")
        .order("check_in")
        .execute()
    )
    return result.data or []


async def get_monthly_stats(year: int, month: int) -> dict[str, Any]:
    db = get_service_client()
    result = db.rpc("monthly_stats", {"p_year": year, "p_month": month}).execute()
    if result.data:
        return result.data[0]
    return {"total_bookings": 0, "total_revenue": 0, "occupancy_pct": 0}


async def update_loyalty_after_booking(telegram_id: int, nights: int) -> None:
    db = get_service_client()
    user = db.table("users").select("nights_count").eq("telegram_id", telegram_id).execute()
    if not user.data:
        return
    current_nights = (user.data[0].get("nights_count") or 0) + nights
    new_tier = loyalty_tier_from_nights(current_nights)
    discount_map = {"base": 0, "silver": 5, "gold": 10}
    db.table("users").update({
        "nights_count": current_nights,
        "loyalty_status": new_tier,
        "discount_percent": discount_map[new_tier],
    }).eq("telegram_id", telegram_id).execute()


async def get_all_user_telegram_ids() -> list[int]:
    db = get_service_client()
    result = db.table("users").select("telegram_id").execute()
    return [row["telegram_id"] for row in (result.data or [])]


async def notify_booking_created(
    booking: dict[str, Any],
    room_number: str,
    user_telegram_id: int,
    bot: Bot,
    lang: str = "ru",
) -> None:
    booking_id   = str(booking.get("id", ""))
    short_id     = booking_id[:8].upper()
    room_type    = str(booking.get("room_type", ""))
    check_in     = str(booking.get("check_in", ""))
    check_out    = str(booking.get("check_out", ""))
    nights       = booking.get("nights", 0)
    total_price  = booking.get("total_price", 0)
    guest_name   = str(booking.get("guest_name", ""))
    guest_phone  = str(booking.get("guest_phone", ""))
    guests_count = booking.get("guests_count", 1)

    room_label    = config.ROOM_TYPES.get(room_type, {}).get(lang, {}).get("name", room_type)
    payment_label = config.PAYMENT_METHODS.get(str(booking.get("payment_method", "")), {}).get(lang, "")

    def _fmt(d: str) -> str:
        try:
            y, m, day = d.split("-")
            return f"{day}.{m}.{y}"
        except (ValueError, AttributeError):
            return d

    ci_fmt = _fmt(check_in)
    co_fmt = _fmt(check_out)

    total_fmt = f"{int(total_price):,} сум".replace(",", " ")

    # 1. Admin notifications
    async def _notify_admins() -> None:
        admin_msg = (
            f"🔔 <b>Новое бронирование (мини-приложение)</b>\n\n"
            f"📋 <code>{short_id}</code>\n"
            f"👤 {guest_name}  📱 {guest_phone}\n"
            f"🏨 {room_label}  #{room_number}\n"
            f"📅 {ci_fmt} → {co_fmt} ({nights} н.)\n"
            f"👥 Гостей: {guests_count}\n"
            f"💳 {payment_label}\n"
            f"💰 {total_fmt}"
        )
        for admin_id in config.ADMIN_IDS:
            try:
                await bot.send_message(
                    admin_id,
                    admin_msg,
                    parse_mode="HTML",
                    reply_markup=booking_action_keyboard(booking_id),
                )
            except Exception as exc:
                logger.error("Admin notify %s failed: %s", admin_id, exc)

    # 2. Google Sheets
    async def _sync_sheets() -> None:
        await sheets_service.append_booking(booking, room_number)

    # 3. Client confirmation — warm thank-you
    async def _send_client_msg() -> None:
        text = (
            "Спасибо за бронирование! С вами свяжутся представители отеля Asal. "
            "Наши контакты: +998 91 116 71 57. "
            "Локация: https://maps.google.com/?q=5+Naqshbandi+St,+Bukhara"
        )
        await bot.send_message(user_telegram_id, text)

    # 4. Google Calendar event
    async def _sync_calendar() -> None:
        await calendar_service.create_booking_event(booking, room_number)

    async def _safe(coro_fn: Any, name: str) -> None:
        try:
            await coro_fn()
        except Exception as exc:
            logger.error("notify_booking_created[%s] failed: %s", name, exc, exc_info=True)

    await asyncio.gather(
        _safe(_notify_admins,    "admins"),
        _safe(_sync_sheets,      "sheets"),
        _safe(_send_client_msg,  "client_msg"),
        _safe(_sync_calendar,    "calendar"),
    )
