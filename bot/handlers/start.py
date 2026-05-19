from aiogram import Router, F
from aiogram.filters import CommandStart, Command
from aiogram.types import Message, CallbackQuery
from aiogram.fsm.context import FSMContext

from keyboards.main_menu import lang_keyboard, main_menu_keyboard, back_to_menu_keyboard
from middlewares.i18n import set_user_lang, get_translator, t
from services.booking_service import get_or_create_user, update_user_language
import config

router = Router()


@router.message(CommandStart())
async def cmd_start(message: Message, state: FSMContext, lang: str = "ru") -> None:
    await state.clear()
    await message.answer(
        t("welcome", "ru"),
        reply_markup=lang_keyboard(),
        parse_mode="HTML",
    )


@router.callback_query(F.data.startswith("lang:"))
async def select_language(callback: CallbackQuery, state: FSMContext) -> None:
    lang = callback.data.split(":")[1]
    if lang not in ("ru", "uz", "en"):
        lang = "ru"

    user = callback.from_user
    set_user_lang(user.id, lang)

    try:
        await get_or_create_user(
            telegram_id=user.id,
            username=user.username,
            full_name=user.full_name or "",
            lang=lang,
        )
        await update_user_language(user.id, lang)
    except Exception:
        pass

    await callback.message.edit_text(
        t("lang_set", lang),
        parse_mode="HTML",
    )
    await show_main_menu(callback.message, lang)
    await callback.answer()


async def show_main_menu(message: Message, lang: str) -> None:
    await message.answer(
        t("main_menu", lang),
        reply_markup=main_menu_keyboard(lang, config.MINI_APP_URL),
        parse_mode="HTML",
    )


@router.callback_query(F.data == "menu")
async def back_to_menu(callback: CallbackQuery, state: FSMContext, lang: str = "ru") -> None:
    await state.clear()
    await callback.message.edit_text(
        t("main_menu", lang),
        reply_markup=main_menu_keyboard(lang, config.MINI_APP_URL),
        parse_mode="HTML",
    )
    await callback.answer()


@router.callback_query(F.data == "about")
async def show_about(callback: CallbackQuery, lang: str = "ru") -> None:
    await callback.message.edit_text(
        t("about_text", lang),
        reply_markup=back_to_menu_keyboard(lang),
        parse_mode="HTML",
    )
    await callback.answer()


@router.callback_query(F.data == "contacts")
async def show_contacts(callback: CallbackQuery, lang: str = "ru") -> None:
    await callback.message.edit_text(
        t("contacts_text", lang),
        reply_markup=back_to_menu_keyboard(lang),
        parse_mode="HTML",
    )
    await callback.answer()


@router.callback_query(F.data == "promotions")
async def show_promotions(callback: CallbackQuery, lang: str = "ru") -> None:
    await callback.message.edit_text(
        t("promotions_text", lang),
        reply_markup=back_to_menu_keyboard(lang),
        parse_mode="HTML",
    )
    await callback.answer()
