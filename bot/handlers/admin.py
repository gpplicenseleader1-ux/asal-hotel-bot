import logging
from datetime import date, timedelta

from aiogram import Router, F
from aiogram.filters import Command
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.types import Message, CallbackQuery

from keyboards.admin import admin_menu_keyboard, booking_action_keyboard, back_to_admin_keyboard
from services import booking_service, sheets_service
from utils.helpers import format_date, format_price, get_booking_id
import config

logger = logging.getLogger(__name__)
router = Router()


def is_admin(user_id: int) -> bool:
    return user_id in config.ADMIN_IDS


class BroadcastFSM(StatesGroup):
    enter_text = State()


@router.message(Command("admin"))
async def cmd_admin(message: Message) -> None:
    if not is_admin(message.from_user.id):
        await message.answer("⛔ Доступ запрещён.")
        return
    await message.answer(
        "⚙️ <b>Панель администратора</b>\n\nВыберите действие:",
        reply_markup=admin_menu_keyboard(),
        parse_mode="HTML",
    )


@router.callback_query(F.data == "adm:menu")
async def admin_menu(callback: CallbackQuery) -> None:
    if not is_admin(callback.from_user.id):
        await callback.answer("⛔ Доступ запрещён.", show_alert=True)
        return
    await callback.message.edit_text(
        "⚙️ <b>Панель администратора</b>\n\nВыберите действие:",
        reply_markup=admin_menu_keyboard(),
        parse_mode="HTML",
    )
    await callback.answer()


@router.callback_query(F.data == "adm:today")
async def admin_today(callback: CallbackQuery) -> None:
    if not is_admin(callback.from_user.id):
        await callback.answer("⛔ Доступ запрещён.", show_alert=True)
        return
    bookings = await booking_service.get_bookings_for_date(date.today())
    text = _format_bookings_list(bookings, f"📋 Брони на сегодня ({date.today().strftime('%d.%m.%Y')}):")
    await callback.message.edit_text(text, reply_markup=back_to_admin_keyboard(), parse_mode="HTML")
    await callback.answer()


@router.callback_query(F.data == "adm:week")
async def admin_week(callback: CallbackQuery) -> None:
    if not is_admin(callback.from_user.id):
        await callback.answer("⛔ Доступ запрещён.", show_alert=True)
        return
    today = date.today()
    end = today + timedelta(days=7)
    bookings = await booking_service.get_bookings_for_period(today, end)
    text = _format_bookings_list(bookings, f"📅 Брони на неделю ({today.strftime('%d.%m')} — {end.strftime('%d.%m.%Y')}):")
    await callback.message.edit_text(text, reply_markup=back_to_admin_keyboard(), parse_mode="HTML")
    await callback.answer()


@router.callback_query(F.data == "adm:stats")
async def admin_stats(callback: CallbackQuery) -> None:
    if not is_admin(callback.from_user.id):
        await callback.answer("⛔ Доступ запрещён.", show_alert=True)
        return
    today = date.today()
    stats = await booking_service.get_monthly_stats(today.year, today.month)
    text = (
        f"📊 <b>Статистика за {today.strftime('%B %Y')}</b>\n\n"
        f"📋 Всего броней: {stats.get('total_bookings', 0)}\n"
        f"💰 Доход: ${stats.get('total_revenue', 0):.0f}\n"
        f"🏨 Заполняемость: {stats.get('occupancy_rate', 0):.1f}%"
    )
    await callback.message.edit_text(text, reply_markup=back_to_admin_keyboard(), parse_mode="HTML")
    await callback.answer()


@router.callback_query(F.data == "adm:broadcast")
async def admin_broadcast_start(callback: CallbackQuery, state: FSMContext) -> None:
    if not is_admin(callback.from_user.id):
        await callback.answer("⛔ Доступ запрещён.", show_alert=True)
        return
    await state.set_state(BroadcastFSM.enter_text)
    await callback.message.edit_text(
        "📢 <b>Рассылка</b>\n\nВведите текст для отправки всем пользователям.\n\nДля отмены напишите /cancel",
        parse_mode="HTML",
    )
    await callback.answer()


@router.message(BroadcastFSM.enter_text)
async def admin_broadcast_send(message: Message, state: FSMContext) -> None:
    if not is_admin(message.from_user.id):
        return
    if message.text == "/cancel":
        await state.clear()
        await message.answer("❌ Рассылка отменена.", reply_markup=admin_menu_keyboard())
        return

    await state.clear()
    text = message.text
    user_ids = await booking_service.get_all_user_telegram_ids()
    sent, failed = 0, 0
    for uid in user_ids:
        try:
            await message.bot.send_message(uid, text, parse_mode="HTML")
            sent += 1
        except Exception:
            failed += 1
    await message.answer(
        f"📢 Рассылка завершена.\n✅ Доставлено: {sent}\n❌ Ошибок: {failed}",
        reply_markup=admin_menu_keyboard(),
    )


@router.callback_query(F.data.startswith("adm:confirm:"))
async def admin_confirm_booking(callback: CallbackQuery) -> None:
    if not is_admin(callback.from_user.id):
        await callback.answer("⛔ Доступ запрещён.", show_alert=True)
        return
    booking_id = callback.data.split(":", 2)[2]
    await booking_service.update_booking_status(booking_id, "confirmed")
    await sheets_service.update_booking_status_in_sheet(booking_id, "confirmed")
    await callback.message.edit_text(
        f"✅ Бронь <code>{get_booking_id(booking_id)}</code> подтверждена.",
        reply_markup=back_to_admin_keyboard(),
        parse_mode="HTML",
    )
    await callback.answer("✅ Подтверждено")


@router.callback_query(F.data.startswith("adm:cancel:"))
async def admin_cancel_booking(callback: CallbackQuery) -> None:
    if not is_admin(callback.from_user.id):
        await callback.answer("⛔ Доступ запрещён.", show_alert=True)
        return
    booking_id = callback.data.split(":", 2)[2]
    await booking_service.update_booking_status(booking_id, "cancelled")
    await sheets_service.update_booking_status_in_sheet(booking_id, "cancelled")
    await callback.message.edit_text(
        f"❌ Бронь <code>{get_booking_id(booking_id)}</code> отменена.",
        reply_markup=back_to_admin_keyboard(),
        parse_mode="HTML",
    )
    await callback.answer("❌ Отменено")


def _format_bookings_list(bookings: list, title: str) -> str:
    if not bookings:
        return f"{title}\n\nНет бронирований за этот период."
    lines = [title]
    for b in bookings:
        room_info = b.get("rooms", {}) or {}
        room_num = room_info.get("room_number", "?")
        lines.append(
            f"\n📋 <code>{get_booking_id(b['id'])}</code> | №{room_num} {b['room_type']}\n"
            f"👤 {b['guest_name']} | {b['guest_phone']}\n"
            f"📅 {b['check_in_date']} → {b['check_out_date']}\n"
            f"💰 ${b['total_price']} | {b['payment_method']} | {b['status']}"
        )
    return "\n".join(lines)
