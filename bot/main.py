import asyncio
import json
import logging
import sys

from aiogram import Bot, Dispatcher
from aiogram.fsm.storage.memory import MemoryStorage

import config
from handlers import start, booking, admin, ai_assistant, loyalty, miniapp
from middlewares.i18n import I18nMiddleware
from utils.error_alert import AdminAlertHandler, drain_alerts

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


def _validate_env() -> None:
    errors = []
    if not config.BOT_TOKEN:
        errors.append("BOT_TOKEN is missing")
    if not config.SUPABASE_URL:
        errors.append("SUPABASE_URL is missing")
    elif not (config.SUPABASE_URL.startswith("https://") and ".supabase.co" in config.SUPABASE_URL):
        errors.append(f"SUPABASE_URL looks malformed: {config.SUPABASE_URL!r}")
    if not config.SUPABASE_SERVICE_KEY:
        errors.append("SUPABASE_SERVICE_KEY is missing")
    if not config.SUPABASE_ANON_KEY:
        errors.append("SUPABASE_ANON_KEY is missing")
    if errors:
        for e in errors:
            logger.critical("FATAL env error: %s", e)
        sys.exit(1)

    # Google Sheets/Calendar are optional integrations — a bad key must never
    # block booking, so problems here are logged as WARNING, not FATAL.
    if config.GOOGLE_SA_JSON:
        try:
            info = json.loads(config.GOOGLE_SA_JSON)
            missing = [k for k in ("client_email", "private_key") if not info.get(k)]
            if missing:
                logger.warning(
                    "GOOGLE_SA_JSON is missing field(s) %s — Sheets/Calendar sync will fail", missing
                )
        except (json.JSONDecodeError, TypeError) as exc:
            logger.warning("GOOGLE_SA_JSON is not valid JSON (%s) — Sheets/Calendar sync will fail", exc)


async def main() -> None:
    _validate_env()
    logging.getLogger().addHandler(AdminAlertHandler())

    bot = Bot(token=config.BOT_TOKEN)
    storage = MemoryStorage()
    dp = Dispatcher(storage=storage)

    dp.message.middleware(I18nMiddleware())
    dp.callback_query.middleware(I18nMiddleware())

    dp.include_router(miniapp.router)
    dp.include_router(start.router)
    dp.include_router(booking.router)
    dp.include_router(admin.router)
    dp.include_router(loyalty.router)
    dp.include_router(ai_assistant.router)

    await bot.delete_webhook(drop_pending_updates=True)
    logger.info("Webhook deleted, pending updates dropped")

    bot_info = await bot.get_me()
    logger.info("Bot started: @%s (id=%d)", bot_info.username, bot_info.id)

    if config.ADMIN_IDS:
        asyncio.create_task(drain_alerts(bot, config.ADMIN_IDS[0]))

    if config.GOOGLE_SA_JSON and config.GOOGLE_SHEETS_ID:
        from services import sheets_sync
        asyncio.create_task(sheets_sync.sync_loop(bot))
        logger.info("Sheets two-way sync started (every %ss)", config.SHEETS_SYNC_INTERVAL_SECONDS)
    else:
        logger.info("Sheets two-way sync disabled (GOOGLE_SA_JSON/GOOGLE_SHEETS_ID not set)")

    logger.info("Starting polling...")
    await dp.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())
