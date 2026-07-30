import asyncio
import logging
import time
from collections import deque

_DEDUP_WINDOW_SECONDS = 300  # 5 minutes
_seen: dict[str, float] = {}
_pending: deque[str] = deque()


class AdminAlertHandler(logging.Handler):
    """Root logging handler: queues ERROR-level records (with a signature-based
    5-minute dedup) so a background task can forward them to the bot owner.
    Never raises — a broken alert path must not break logging itself."""

    def emit(self, record: logging.LogRecord) -> None:
        if record.levelno < logging.ERROR:
            return
        try:
            message = record.getMessage()
            signature = f"{record.name}:{record.funcName}:{message[:120]}"
            now = time.monotonic()
            last = _seen.get(signature)
            if last is not None and now - last < _DEDUP_WINDOW_SECONDS:
                return
            _seen[signature] = now

            exc_line = ""
            if record.exc_info and record.exc_info[1] is not None:
                exc_line = f"\n{type(record.exc_info[1]).__name__}: {record.exc_info[1]}"

            text = f"⚠️ <b>Ошибка в боте</b>\n{record.name}.{record.funcName}\n{message}{exc_line}"
            _pending.append(text[:1000])

            # keep the dedup map from growing forever on a long-running process
            if len(_seen) > 500:
                cutoff = now - _DEDUP_WINDOW_SECONDS
                for key in [k for k, ts in _seen.items() if ts < cutoff]:
                    del _seen[key]
        except Exception:
            pass


async def drain_alerts(bot, admin_id: int, interval: float = 5.0) -> None:
    """Background task: forwards queued alerts to the owner. Wrapped so a
    Telegram/network hiccup here never kills the loop or the bot."""
    logger = logging.getLogger(__name__)
    while True:
        await asyncio.sleep(interval)
        while _pending:
            text = _pending.popleft()
            try:
                await bot.send_message(admin_id, text, parse_mode="HTML")
            except Exception:
                logger.debug("admin alert send failed", exc_info=True)
