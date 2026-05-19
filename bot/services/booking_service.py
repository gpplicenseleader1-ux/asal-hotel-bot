import uuid
import logging
from datetime import date
from typing import Any, Optional

from services.supabase_client import get_service_client
from utils.helpers import loyalty_tier_from_nights

logger = logging.getLogger(__name__)


async def get_or_create_user(
    telegram_id: int,
    username: str | None,
    full_name: str,
    lang: str = "ru",
) -> dict[str, Any]:
    db = get_service_client()
    result = db.table("users").select("*").eq("telegram_id", telegram_id).execute()
    if result.data:
        return result.data[0]
    new_user = {
        "telegram_id": telegram_id,
        "username": username or "",
        "full_name": full_name,
        "language": lang,
        "loyalty_status": "base",
        "nights_count": 0,
        "discount_percent": 0,
    }
    created = db.table("users").insert(new_user).execute()
    return created.data[0]


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
    if result.data:
        return result.data[0]
    return None


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
        "check_in": check_in.isoformat(),
        "check_out": check_out.isoformat(),
        "nights": nights,
        "total_price": total_price,
        "guest_name": guest_name,
        "guest_phone": guest_phone,
        "payment_method": payment_method,
        "payment_status": "pending",
        "status": "pending",
        "source": source,
    }
    result = db.table("bookings").insert(booking).execute()
    return result.data[0]


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
    return {"total_bookings": 0, "total_revenue": 0, "occupancy_rate": 0}


async def update_loyalty_after_booking(telegram_id: int, nights: int) -> None:
    db = get_service_client()
    user = db.table("users").select("nights_count").eq("telegram_id", telegram_id).execute()
    if not user.data:
        return
    current_nights = user.data[0]["nights_count"] + nights
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
