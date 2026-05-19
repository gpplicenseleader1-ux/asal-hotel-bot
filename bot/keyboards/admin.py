from aiogram.types import InlineKeyboardMarkup
from aiogram.utils.keyboard import InlineKeyboardBuilder


def admin_menu_keyboard() -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    builder.button(text="📋 Брони сегодня", callback_data="adm:today")
    builder.button(text="📅 Брони на неделю", callback_data="adm:week")
    builder.button(text="📊 Статистика", callback_data="adm:stats")
    builder.button(text="📢 Рассылка", callback_data="adm:broadcast")
    builder.adjust(2, 2)
    return builder.as_markup()


def booking_action_keyboard(booking_id: str) -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    builder.button(text="✅ Подтвердить", callback_data=f"adm:confirm:{booking_id}")
    builder.button(text="❌ Отменить", callback_data=f"adm:cancel:{booking_id}")
    builder.button(text="◀ Назад", callback_data="adm:menu")
    builder.adjust(2, 1)
    return builder.as_markup()


def back_to_admin_keyboard() -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    builder.button(text="◀ Назад в меню", callback_data="adm:menu")
    return builder.as_markup()
