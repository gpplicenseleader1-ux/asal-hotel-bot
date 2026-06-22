import json
import os
from typing import Any, Awaitable, Callable, Dict

from aiogram import BaseMiddleware
from aiogram.types import TelegramObject, Update, User

_translations: Dict[str, Dict[str, str]] = {}


def _load_locales() -> None:
    locales_dir = os.path.join(os.path.dirname(__file__), "..", "locales")
    for lang in ("ru", "uz", "en"):
        path = os.path.join(locales_dir, f"{lang}.json")
        with open(path, encoding="utf-8") as f:
            _translations[lang] = json.load(f)


_load_locales()


def t(key: str, lang: str = "ru", **kwargs: Any) -> str:
    text = _translations.get(lang, _translations["ru"]).get(key, key)
    if kwargs:
        try:
            text = text.format(**kwargs)
        except (KeyError, IndexError):
            pass
    return text


def get_translator(lang: str) -> Callable[..., str]:
    def _t(key: str, **kwargs: Any) -> str:
        return t(key, lang, **kwargs)
    return _t


_user_langs: Dict[int, str] = {}


def set_user_lang(user_id: int, lang: str) -> None:
    _user_langs[user_id] = lang


def get_user_lang(user_id: int) -> str | None:
    return _user_langs.get(user_id)


class I18nMiddleware(BaseMiddleware):
    async def __call__(
        self,
        handler: Callable[[TelegramObject, Dict[str, Any]], Awaitable[Any]],
        event: TelegramObject,
        data: Dict[str, Any],
    ) -> Any:
        user: User | None = data.get("event_from_user")
        lang = "ru"
        if user:
            stored = get_user_lang(user.id)
            if stored:
                lang = stored
            elif user.language_code and user.language_code in ("ru", "uz", "en"):
                lang = user.language_code
        data["lang"] = lang
        data["t"] = get_translator(lang)
        return await handler(event, data)
