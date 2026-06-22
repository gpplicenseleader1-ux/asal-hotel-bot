from datetime import date
from aiogram.types import InlineKeyboardMarkup, ReplyKeyboardMarkup, KeyboardButton
from aiogram.utils.keyboard import InlineKeyboardBuilder

import config
from utils.helpers import calendar_weeks, prev_month, next_month, MONTH_NAMES


_NIGHT_WORD = {"ru": "ночь", "uz": "tun", "en": "night"}


def room_type_keyboard(lang: str) -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    night = _NIGHT_WORD.get(lang, _NIGHT_WORD["ru"])
    for rt, info in config.ROOM_TYPES.items():
        name = info[lang]["name"]
        price = info["price"]
        emoji = info["emoji"]
        builder.button(text=f"{emoji} {name} — ${price}/{night}", callback_data=f"rt:{rt}")
    builder.button(text={"ru": "❌ Отмена", "uz": "❌ Bekor", "en": "❌ Cancel"}.get(lang, "❌ Cancel"), callback_data="book:cancel")
    builder.adjust(1)
    return builder.as_markup()


def calendar_keyboard(year: int, month: int, lang: str, prefix: str, min_date: date | None = None) -> InlineKeyboardMarkup:
    if min_date is None:
        min_date = date.today()

    builder = InlineKeyboardBuilder()
    month_name = MONTH_NAMES.get(lang, MONTH_NAMES["ru"])[month]

    py, pm = prev_month(year, month)
    ny, nm = next_month(year, month)

    builder.button(text="◀", callback_data=f"{prefix}:nav:{py}:{pm}")
    builder.button(text=f"{month_name} {year}", callback_data="ignore")
    builder.button(text="▶", callback_data=f"{prefix}:nav:{ny}:{nm}")
    builder.adjust(3)

    day_headers = {
        "ru": ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"],
        "uz": ["Du", "Se", "Ch", "Pa", "Ju", "Sh", "Ya"],
        "en": ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"],
    }
    for h in day_headers.get(lang, day_headers["ru"]):
        builder.button(text=h, callback_data="ignore")
    builder.adjust(3, 7)

    row_sizes = [3, 7]
    weeks = calendar_weeks(year, month)
    for week in weeks:
        for day in week:
            if day == 0:
                builder.button(text=" ", callback_data="ignore")
            else:
                d = date(year, month, day)
                if d < min_date:
                    builder.button(text=f"·{day}·", callback_data="ignore")
                else:
                    builder.button(text=str(day), callback_data=f"{prefix}:d:{year}:{month}:{day}")
        row_sizes.append(7)

    cancel_text = {"ru": "❌ Отмена", "uz": "❌ Bekor", "en": "❌ Cancel"}.get(lang, "❌ Cancel")
    builder.button(text=cancel_text, callback_data="book:cancel")
    row_sizes.append(1)

    builder.adjust(*row_sizes)
    return builder.as_markup()


def guests_keyboard(lang: str) -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    for n in range(1, 5):
        builder.button(text=f"👤×{n}", callback_data=f"guests:{n}")
    cancel_text = {"ru": "❌ Отмена", "uz": "❌ Bekor", "en": "❌ Cancel"}.get(lang, "❌ Cancel")
    builder.button(text=cancel_text, callback_data="book:cancel")
    builder.adjust(4, 1)
    return builder.as_markup()


def phone_keyboard(lang: str) -> ReplyKeyboardMarkup:
    btn_text = {"ru": "📱 Поделиться номером", "uz": "📱 Raqamni ulashish", "en": "📱 Share Phone Number"}.get(lang, "📱 Share")
    return ReplyKeyboardMarkup(
        keyboard=[[KeyboardButton(text=btn_text, request_contact=True)]],
        resize_keyboard=True,
        one_time_keyboard=True,
    )


def payment_keyboard(lang: str) -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    for method, names in config.PAYMENT_METHODS.items():
        builder.button(text=names.get(lang, names["ru"]), callback_data=f"pay:{method}")
    cancel_text = {"ru": "❌ Отмена", "uz": "❌ Bekor", "en": "❌ Cancel"}.get(lang, "❌ Cancel")
    builder.button(text=cancel_text, callback_data="book:cancel")
    builder.adjust(1)
    return builder.as_markup()


def confirm_keyboard(lang: str) -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    confirm_text = {"ru": "✅ Подтвердить", "uz": "✅ Tasdiqlash", "en": "✅ Confirm"}.get(lang, "✅ Confirm")
    cancel_text = {"ru": "❌ Отмена", "uz": "❌ Bekor", "en": "❌ Cancel"}.get(lang, "❌ Cancel")
    builder.button(text=confirm_text, callback_data="book:confirm")
    builder.button(text=cancel_text, callback_data="book:cancel")
    builder.adjust(2)
    return builder.as_markup()
