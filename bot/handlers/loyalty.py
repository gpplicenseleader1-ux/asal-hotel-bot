import logging

from aiogram import Router, F
from aiogram.types import CallbackQuery

from keyboards.main_menu import back_to_menu_keyboard
from middlewares.i18n import t
from services.booking_service import get_or_create_user
import config

logger = logging.getLogger(__name__)
router = Router()

TIER_EMOJI = {"base": "⚪", "silver": "🥈", "gold": "🥇"}
TIER_NAMES = {
    "base": {"ru": "Базовый", "uz": "Asosiy", "en": "Base"},
    "silver": {"ru": "Серебро", "uz": "Kumush", "en": "Silver"},
    "gold": {"ru": "Золото", "uz": "Oltin", "en": "Gold"},
}


@router.callback_query(F.data == "loyalty")
async def show_loyalty(callback: CallbackQuery, lang: str = "ru") -> None:
    try:
        user = await get_or_create_user(
            telegram_id=callback.from_user.id,
            username=callback.from_user.username,
            full_name=callback.from_user.full_name or "",
            lang=lang,
        )
        tier = user.get("loyalty_status") or "base"
        nights = user.get("nights_count") or 0
        discount = user.get("discount_percent") or 0
        tier_name = f"{TIER_EMOJI.get(tier, '')} {TIER_NAMES.get(tier, {}).get(lang, tier)}"

        await callback.message.edit_text(
            t("loyalty_info", lang, tier=tier_name, nights=nights, discount=discount),
            reply_markup=back_to_menu_keyboard(lang),
            parse_mode="HTML",
        )
    except Exception as e:
        logger.error(f"Loyalty handler error: {e}")
        await callback.message.edit_text(
            t("error_generic", lang),
            reply_markup=back_to_menu_keyboard(lang),
        )
    await callback.answer()
