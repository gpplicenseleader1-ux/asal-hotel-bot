import logging
from datetime import date

from aiogram import Router, F
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.types import Message, CallbackQuery, ReplyKeyboardRemove

from keyboards.booking import (
    room_type_keyboard, calendar_keyboard, guests_keyboard,
    phone_keyboard, payment_keyboard, confirm_keyboard,
)
from keyboards.admin import booking_action_keyboard
from keyboards.main_menu import main_menu_keyboard
from middlewares.i18n import t
from services import booking_service, sheets_service, calendar_service
from utils.helpers import format_date, nights_count, calculate_price, format_price, get_booking_id
import config

logger = logging.getLogger(__name__)
router = Router()


class BookingFSM(StatesGroup):
    select_type = State()
    select_check_in = State()
    select_check_out = State()
    select_guests = State()
    enter_name = State()
    enter_phone = State()
    select_payment = State()
    confirm = State()


@router.callback_query(F.data == "book:start")
async def book_start(callback: CallbackQuery, state: FSMContext, lang: str = "ru") -> None:
    await state.clear()
    await state.set_state(BookingFSM.select_type)
    await callback.message.edit_text(
        t("book_select_type", lang),
        reply_markup=room_type_keyboard(lang),
        parse_mode="HTML",
    )
    await callback.answer()


@router.callback_query(BookingFSM.select_type, F.data.startswith("rt:"))
async def select_room_type(callback: CallbackQuery, state: FSMContext, lang: str = "ru") -> None:
    room_type = callback.data.split(":")[1]
    await state.update_data(room_type=room_type)
    await state.set_state(BookingFSM.select_check_in)

    today = date.today()
    await callback.message.edit_text(
        t("book_select_checkin", lang),
        reply_markup=calendar_keyboard(today.year, today.month, lang, "ci", min_date=today),
        parse_mode="HTML",
    )
    await callback.answer()


@router.callback_query(BookingFSM.select_check_in, F.data.startswith("ci:nav:"))
async def checkin_nav(callback: CallbackQuery, state: FSMContext, lang: str = "ru") -> None:
    _, _, year, month = callback.data.split(":")
    await callback.message.edit_reply_markup(
        reply_markup=calendar_keyboard(int(year), int(month), lang, "ci", min_date=date.today())
    )
    await callback.answer()


@router.callback_query(BookingFSM.select_check_in, F.data.startswith("ci:d:"))
async def select_check_in(callback: CallbackQuery, state: FSMContext, lang: str = "ru") -> None:
    _, _, year, month, day = callback.data.split(":")
    check_in = date(int(year), int(month), int(day))
    if check_in < date.today():
        await callback.answer(t("invalid_date", lang), show_alert=True)
        return

    await state.update_data(check_in=check_in.isoformat())
    await state.set_state(BookingFSM.select_check_out)

    from datetime import timedelta
    min_checkout = check_in + timedelta(days=1)
    await callback.message.edit_text(
        t("book_select_checkout", lang, check_in=format_date(check_in, lang)),
        reply_markup=calendar_keyboard(check_in.year, check_in.month, lang, "co", min_date=min_checkout),
        parse_mode="HTML",
    )
    await callback.answer()


@router.callback_query(BookingFSM.select_check_out, F.data.startswith("co:nav:"))
async def checkout_nav(callback: CallbackQuery, state: FSMContext, lang: str = "ru") -> None:
    data = await state.get_data()
    check_in = date.fromisoformat(data["check_in"])
    from datetime import timedelta
    min_checkout = check_in + timedelta(days=1)
    _, _, year, month = callback.data.split(":")
    await callback.message.edit_reply_markup(
        reply_markup=calendar_keyboard(int(year), int(month), lang, "co", min_date=min_checkout)
    )
    await callback.answer()


@router.callback_query(BookingFSM.select_check_out, F.data.startswith("co:d:"))
async def select_check_out(callback: CallbackQuery, state: FSMContext, lang: str = "ru") -> None:
    data = await state.get_data()
    check_in = date.fromisoformat(data["check_in"])
    _, _, year, month, day = callback.data.split(":")
    check_out = date(int(year), int(month), int(day))

    if check_out <= check_in:
        await callback.answer(t("invalid_date", lang), show_alert=True)
        return

    await state.update_data(check_out=check_out.isoformat())
    await state.set_state(BookingFSM.select_guests)
    await callback.message.edit_text(
        t("book_select_guests", lang),
        reply_markup=guests_keyboard(lang),
        parse_mode="HTML",
    )
    await callback.answer()


@router.callback_query(BookingFSM.select_guests, F.data.startswith("guests:"))
async def select_guests(callback: CallbackQuery, state: FSMContext, lang: str = "ru") -> None:
    guests = int(callback.data.split(":")[1])
    await state.update_data(guests=guests)
    await state.set_state(BookingFSM.enter_name)
    await callback.message.edit_text(
        t("book_enter_name", lang),
        parse_mode="HTML",
    )
    await callback.answer()


@router.message(BookingFSM.enter_name)
async def enter_name(message: Message, state: FSMContext, lang: str = "ru") -> None:
    name = message.text.strip() if message.text else ""
    if not name or len(name) < 2:
        await message.answer(t("error_generic", lang))
        return
    await state.update_data(guest_name=name)
    await state.set_state(BookingFSM.enter_phone)
    await message.answer(
        t("book_enter_phone", lang),
        reply_markup=phone_keyboard(lang),
        parse_mode="HTML",
    )


@router.message(BookingFSM.enter_phone, F.contact)
async def enter_phone_contact(message: Message, state: FSMContext, lang: str = "ru") -> None:
    from utils.helpers import phone_normalize
    phone = phone_normalize(message.contact.phone_number)
    await _proceed_to_payment(message, state, lang, phone)


@router.message(BookingFSM.enter_phone, F.text)
async def enter_phone_text(message: Message, state: FSMContext, lang: str = "ru") -> None:
    from utils.helpers import phone_normalize
    phone = phone_normalize(message.text.strip())
    await _proceed_to_payment(message, state, lang, phone)


async def _proceed_to_payment(message: Message, state: FSMContext, lang: str, phone: str) -> None:
    try:
        await state.update_data(guest_phone=phone)
        await state.set_state(BookingFSM.select_payment)
        # Dismiss the phone-share ReplyKeyboard, then add the inline payment buttons
        payment_msg = await message.answer(
            t("book_select_payment", lang),
            reply_markup=ReplyKeyboardRemove(),
            parse_mode="HTML",
        )
        await payment_msg.edit_reply_markup(reply_markup=payment_keyboard(lang))
    except Exception as e:
        logger.error(f"Payment transition failed: {e}", exc_info=True)
        await message.answer(t("error_generic", lang), reply_markup=ReplyKeyboardRemove())


@router.callback_query(BookingFSM.select_payment, F.data.startswith("pay:"))
async def select_payment(callback: CallbackQuery, state: FSMContext, lang: str = "ru") -> None:
    payment_method = callback.data.split(":")[1]
    await state.update_data(payment_method=payment_method)
    await state.set_state(BookingFSM.confirm)

    data = await state.get_data()
    check_in = date.fromisoformat(data["check_in"])
    check_out = date.fromisoformat(data["check_out"])
    room_type = data["room_type"]
    nights = nights_count(check_in, check_out)
    base_price = config.ROOM_TYPES[room_type]["price"]
    total = calculate_price(base_price, nights)

    room_name = config.ROOM_TYPES[room_type][lang]["name"]
    payment_name = config.PAYMENT_METHODS[payment_method].get(lang, payment_method)

    await callback.message.edit_text(
        t(
            "book_confirm", lang,
            room_type=room_name,
            check_in=format_date(check_in, lang),
            check_out=format_date(check_out, lang),
            nights=nights,
            guests=data["guests"],
            name=data["guest_name"],
            phone=data["guest_phone"],
            payment=payment_name,
            total=format_price(total),
        ),
        reply_markup=confirm_keyboard(lang),
        parse_mode="HTML",
    )
    await state.update_data(total=total, nights=nights)
    await callback.answer()


@router.callback_query(BookingFSM.confirm, F.data == "book:confirm")
async def confirm_booking(callback: CallbackQuery, state: FSMContext, lang: str = "ru") -> None:
    data = await state.get_data()
    await state.clear()
    await callback.answer()

    check_in = date.fromisoformat(data["check_in"])
    check_out = date.fromisoformat(data["check_out"])
    room_type = data["room_type"]

    try:
        room = await booking_service.get_available_room(room_type, check_in, check_out)
        if not room:
            await callback.message.edit_text(t("no_available_rooms", lang), parse_mode="HTML")
            return

        await booking_service.get_or_create_user(
            telegram_id=callback.from_user.id,
            username=callback.from_user.username,
            full_name=callback.from_user.full_name or "",
            lang=lang,
        )

        booking = await booking_service.create_booking(
            user_telegram_id=callback.from_user.id,
            room_id=room["id"],
            room_type=room_type,
            check_in=check_in,
            check_out=check_out,
            nights=data["nights"],
            total_price=data["total"],
            guest_name=data["guest_name"],
            guest_phone=data["guest_phone"],
            guests_count=data["guests"],
            payment_method=data["payment_method"],
        )
        await booking_service.update_room_status(room["id"], "occupied")
    except Exception as e:
        logger.error(f"Booking creation failed: {e}", exc_info=True)
        await callback.message.edit_text(t("error_generic", lang), parse_mode="HTML")
        return

    await booking_service.update_loyalty_after_booking(callback.from_user.id, data["nights"])

    try:
        await sheets_service.append_booking(booking, room.get("room_number", "?"))
    except Exception as e:
        logger.warning(f"Sheets error (non-critical): {e}")

    try:
        await calendar_service.create_booking_event(booking, room.get("room_number", "?"))
    except Exception as e:
        logger.warning(f"Calendar error (non-critical): {e}")

    room_name = config.ROOM_TYPES[room_type][lang]["name"]
    await callback.message.edit_text(
        t(
            "booking_success", lang,
            booking_id=get_booking_id(booking["id"]),
            room_type=room_name,
            room_number=room.get("room_number", "?"),
            check_in=format_date(check_in, lang),
            check_out=format_date(check_out, lang),
            nights=data["nights"],
            total=format_price(data["total"]),
        ),
        parse_mode="HTML",
        reply_markup=main_menu_keyboard(lang, config.MINI_APP_URL),
    )

    try:
        admin_text = (
            f"🔔 <b>Новая бронь!</b>\n"
            f"📋 ID: {get_booking_id(booking['id'])}\n"
            f"👤 {data['guest_name']} | {data['guest_phone']}\n"
            f"🏨 {room_name}, номер {room.get('room_number', '?')}\n"
            f"📅 {format_date(check_in, 'ru')} → {format_date(check_out, 'ru')}\n"
            f"🌙 {data['nights']} ночей\n"
            f"💰 ${data['total']}\n"
            f"💳 {data['payment_method']}"
        )
        for admin_id in config.ADMIN_IDS:
            try:
                await callback.bot.send_message(
                    admin_id, admin_text,
                    parse_mode="HTML",
                    reply_markup=booking_action_keyboard(booking["id"]),
                )
            except Exception:
                pass
    except Exception as e:
        logger.warning(f"Admin notify error: {e}")


@router.callback_query(F.data == "book:cancel")
async def cancel_booking(callback: CallbackQuery, state: FSMContext, lang: str = "ru") -> None:
    await state.clear()
    await callback.message.edit_text(
        t("booking_cancelled", lang),
        reply_markup=main_menu_keyboard(lang, config.MINI_APP_URL),
        parse_mode="HTML",
    )
    await callback.answer()


@router.callback_query(F.data == "ignore")
async def ignore_callback(callback: CallbackQuery) -> None:
    await callback.answer()


@router.callback_query(F.data == "my_bookings")
async def my_bookings(callback: CallbackQuery, lang: str = "ru") -> None:
    bookings = await booking_service.get_user_bookings(callback.from_user.id)

    if not bookings:
        await callback.message.edit_text(
            t("no_bookings", lang),
            reply_markup=main_menu_keyboard(lang, config.MINI_APP_URL),
            parse_mode="HTML",
        )
        await callback.answer()
        return

    status_keys = {
        "pending": "status_pending",
        "confirmed": "status_confirmed",
        "cancelled": "status_cancelled",
        "completed": "status_completed",
    }
    lines = [t("my_bookings_title", lang)]
    for b in bookings:
        check_in = date.fromisoformat(b["check_in"])
        check_out = date.fromisoformat(b["check_out"])
        status_key = status_keys.get(b["status"], "status_pending")
        room_info = b.get("rooms") or {}
        db_room_type = room_info.get("type", "standard")
        room_name = config.ROOM_TYPES.get(db_room_type, config.ROOM_TYPES["standard"])[lang]["name"]
        lines.append(
            f"\n{t('booking_item', lang, id=get_booking_id(b['id']), room_type=room_name, check_in=format_date(check_in, lang), check_out=format_date(check_out, lang), total=format_price(b['total_price']), status=t(status_key, lang))}"
        )

    await callback.message.edit_text(
        "\n".join(lines),
        reply_markup=main_menu_keyboard(lang, config.MINI_APP_URL),
        parse_mode="HTML",
    )
    await callback.answer()
