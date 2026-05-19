from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton, ReplyKeyboardMarkup, KeyboardButton, WebAppInfo
from aiogram.utils.keyboard import InlineKeyboardBuilder

import config


def lang_keyboard() -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    builder.button(text="🇷🇺 Русский", callback_data="lang:ru")
    builder.button(text="🇺🇿 O'zbekcha", callback_data="lang:uz")
    builder.button(text="🇬🇧 English", callback_data="lang:en")
    builder.adjust(1)
    return builder.as_markup()


def main_menu_keyboard(lang: str, mini_app_url: str = "") -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    labels = {
        "ru": [
            ("🛎 Забронировать", "book:start"),
            ("📋 Мои брони", "my_bookings"),
            ("🎁 Акции", "promotions"),
            ("💎 Лояльность", "loyalty"),
            ("🤖 ИИ-ассистент", "ai:start"),
            ("ℹ️ О нас", "about"),
            ("📞 Контакты", "contacts"),
        ],
        "uz": [
            ("🛎 Band qilish", "book:start"),
            ("📋 Mening bronlarim", "my_bookings"),
            ("🎁 Aksiyalar", "promotions"),
            ("💎 Sodiqlik", "loyalty"),
            ("🤖 AI-assistent", "ai:start"),
            ("ℹ️ Biz haqimizda", "about"),
            ("📞 Aloqa", "contacts"),
        ],
        "en": [
            ("🛎 Book a Room", "book:start"),
            ("📋 My Bookings", "my_bookings"),
            ("🎁 Promotions", "promotions"),
            ("💎 Loyalty", "loyalty"),
            ("🤖 AI Assistant", "ai:start"),
            ("ℹ️ About Us", "about"),
            ("📞 Contacts", "contacts"),
        ],
    }
    buttons = labels.get(lang, labels["ru"])
    for text, cd in buttons:
        builder.button(text=text, callback_data=cd)

    if mini_app_url:
        app_text = {"ru": "🏨 Выбрать номер в приложении", "uz": "🏨 Ilovada xona tanlash", "en": "🏨 Choose Room in App"}
        builder.button(text=app_text.get(lang, app_text["ru"]), web_app=WebAppInfo(url=mini_app_url))

    builder.adjust(2, 2, 2, 1, 1)
    return builder.as_markup()


def back_to_menu_keyboard(lang: str) -> InlineKeyboardMarkup:
    text = {"ru": "◀ Главное меню", "uz": "◀ Bosh menyu", "en": "◀ Main Menu"}
    builder = InlineKeyboardBuilder()
    builder.button(text=text.get(lang, text["ru"]), callback_data="menu")
    return builder.as_markup()
