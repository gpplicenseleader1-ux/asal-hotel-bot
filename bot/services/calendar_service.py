import logging
from typing import Any

from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build

import config

logger = logging.getLogger(__name__)

SCOPES = ["https://www.googleapis.com/auth/calendar"]

ROOM_TYPE_COLORS = {
    "standard":     "9",   # Blueberry
    "junior_suite": "6",   # Tangerine
    "suite":        "11",  # Tomato
}

_service = None


def _get_service():
    global _service
    if _service is None:
        creds = Credentials.from_service_account_file(config.GOOGLE_CREDENTIALS_PATH, scopes=SCOPES)
        _service = build("calendar", "v3", credentials=creds)
    return _service


async def create_booking_event(booking: dict[str, Any], room_number: str) -> str | None:
    try:
        service = _get_service()
        room_type = booking.get("room_type", "standard")
        guest_name = booking.get("guest_name", "")
        event = {
            "summary": f"Номер {room_number} — {guest_name}",
            "description": (
                f"ID брони: {booking.get('id', '')[:8].upper()}\n"
                f"Гость: {guest_name}\n"
                f"Телефон: {booking.get('guest_phone', '')}\n"
                f"Тип номера: {room_type}\n"
                f"Гостей: {booking.get('guests_count', 1)}\n"
                f"Оплата: {booking.get('payment_method', '')}\n"
                f"Сумма: ${booking.get('total_price', 0)}\n"
                f"Источник: {booking.get('source', 'telegram')}"
            ),
            "start": {"date": booking["check_in"]},
            "end": {"date": booking["check_out"]},
            "colorId": ROOM_TYPE_COLORS.get(room_type, "1"),
        }
        result = service.events().insert(calendarId=config.GOOGLE_CALENDAR_ID, body=event).execute()
        logger.info(f"Calendar event created: {result.get('id')}")
        return result.get("id")
    except Exception as e:
        logger.error(f"Calendar create error: {e}")
        return None


async def delete_booking_event(event_id: str) -> None:
    try:
        service = _get_service()
        service.events().delete(calendarId=config.GOOGLE_CALENDAR_ID, eventId=event_id).execute()
        logger.info(f"Calendar event deleted: {event_id}")
    except Exception as e:
        logger.error(f"Calendar delete error: {e}")
