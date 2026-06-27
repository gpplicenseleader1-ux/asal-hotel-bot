import json
import logging
from datetime import date

from aiogram import F, Router
from aiogram.types import Message

import config
from middlewares.i18n import t
from services import booking_service

logger = logging.getLogger(__name__)
router = Router()


@router.message(F.web_app_data)
async def handle_web_app_booking(message: Message, lang: str = "ru") -> None:
    try:
        payload = json.loads(message.web_app_data.data)
    except (json.JSONDecodeError, AttributeError, TypeError):
        await message.answer(t("error_generic", lang))
        return

    required_keys = {
        "room_type", "check_in", "check_out",
        "guest_name", "guest_phone", "guests_count", "payment_method",
    }
    if not required_keys.issubset(payload.keys()):
        logger.warning("Mini-app payload missing keys: %s", payload.keys())
        await message.answer(t("error_generic", lang))
        return

    try:
        room_type      = str(payload["room_type"])
        check_in       = date.fromisoformat(str(payload["check_in"]))
        check_out      = date.fromisoformat(str(payload["check_out"]))
        guest_name     = str(payload["guest_name"]).strip()
        guest_phone    = str(payload["guest_phone"]).strip()
        guests_count   = int(payload["guests_count"])
        payment_method = str(payload["payment_method"])
    except (ValueError, KeyError) as exc:
        logger.warning("Mini-app payload parse error: %s", exc)
        await message.answer(t("error_generic", lang))
        return

    if room_type not in config.ROOM_TYPES:
        await message.answer(t("error_generic", lang))
        return
    if payment_method not in config.PAYMENT_METHODS:
        await message.answer(t("error_generic", lang))
        return
    if (check_out - check_in).days < 1:
        await message.answer(t("error_generic", lang))
        return

    room = await booking_service.get_available_room(room_type, check_in, check_out)
    if not room:
        await message.answer(t("no_available_rooms", lang))
        return

    await booking_service.get_or_create_user(
        telegram_id=message.from_user.id,
        username=message.from_user.username,
        full_name=message.from_user.full_name or guest_name,
        lang=lang,
    )

    nights      = (check_out - check_in).days
    total_price = config.ROOM_TYPES[room_type]["price"] * nights
    room_number = str(room.get("room_number", ""))

    booking = await booking_service.create_booking(
        user_telegram_id=message.from_user.id,
        room_id=room["id"],
        room_type=room_type,
        check_in=check_in,
        check_out=check_out,
        nights=nights,
        total_price=total_price,
        guest_name=guest_name,
        guest_phone=guest_phone,
        guests_count=guests_count,
        payment_method=payment_method,
        source="website",
    )

    await booking_service.update_room_status(room["id"], "occupied")
    await booking_service.update_loyalty_after_booking(message.from_user.id, nights)

    await booking_service.notify_booking_created(
        booking=booking,
        room_number=room_number,
        user_telegram_id=message.from_user.id,
        bot=message.bot,
        lang=lang,
    )
