import logging
from datetime import datetime
from typing import Any

import gspread
from google.oauth2.service_account import Credentials

import config

logger = logging.getLogger(__name__)

SCOPES = [
    "https://spreadsheets.google.com/feeds",
    "https://www.googleapis.com/auth/drive",
]

_gc: gspread.Client | None = None


def _get_client() -> gspread.Client:
    global _gc
    if _gc is None:
        creds = Credentials.from_service_account_file(config.GOOGLE_CREDENTIALS_PATH, scopes=SCOPES)
        _gc = gspread.authorize(creds)
    return _gc


def _get_sheet(sheet_name: str) -> gspread.Worksheet:
    gc = _get_client()
    spreadsheet = gc.open_by_key(config.GOOGLE_SHEETS_ID)
    try:
        return spreadsheet.worksheet(sheet_name)
    except gspread.WorksheetNotFound:
        ws = spreadsheet.add_worksheet(title=sheet_name, rows=1000, cols=20)
        return ws


def init_sheets() -> None:
    """Create sheets with headers if they don't exist."""
    bookings_sheet = _get_sheet("Брони")
    if not bookings_sheet.row_values(1):
        bookings_sheet.append_row([
            "ID брони", "Дата создания", "Гость", "Телефон", "Тип номера",
            "Номер комнаты", "Заезд", "Выезд", "Ночей", "Сумма ($)",
            "Оплата", "Статус", "Источник",
        ])

    stats_sheet = _get_sheet("Статистика")
    if not stats_sheet.row_values(1):
        stats_sheet.append_row([
            "Месяц", "Год", "Всего броней", "Доход ($)", "Ср. ночей", "Заполняемость %",
        ])


_BOOKINGS_HEADER = [
    "Booking ID", "Guest Name", "Phone", "Room Type",
    "Check-in", "Check-out", "Nights", "Guests",
    "Payment", "Total", "Status", "Created At",
]


async def append_booking(booking: dict[str, Any], room_number: str) -> None:
    try:
        ws = _get_sheet("Брони")
        if not ws.row_values(1):
            ws.append_row(_BOOKINGS_HEADER)
        booking_id = str(booking.get("id", ""))[:8].upper()
        row = [
            booking_id,
            booking.get("guest_name", ""),
            booking.get("guest_phone", ""),
            booking.get("room_type", ""),
            booking.get("check_in", ""),
            booking.get("check_out", ""),
            booking.get("nights", 0),
            booking.get("guests_count", 1),
            booking.get("payment_method", ""),
            booking.get("total_price", 0),
            booking.get("status", "confirmed"),
            datetime.now().strftime("%d.%m.%Y %H:%M"),
        ]
        ws.append_row(row)
        logger.info("Booking %s appended to Sheets", booking_id)
    except Exception as e:
        logger.error("Sheets append error: %s", e)


async def update_booking_status_in_sheet(booking_id: str, new_status: str) -> None:
    try:
        ws = _get_sheet("Брони")
        short_id = booking_id[:8].upper()
        cell = ws.find(short_id)
        if cell:
            status_col = 12
            ws.update_cell(cell.row, status_col, new_status)
    except Exception as e:
        logger.error(f"Sheets update error: {e}")
