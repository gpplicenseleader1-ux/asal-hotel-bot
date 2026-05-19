import logging

from aiogram import Router, F
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.filters import Command
from aiogram.types import Message, CallbackQuery

from keyboards.main_menu import back_to_menu_keyboard
from middlewares.i18n import t
from services.ai_service import ask_ai

logger = logging.getLogger(__name__)
router = Router()

MAX_HISTORY = 10


class AIChatFSM(StatesGroup):
    chatting = State()


@router.callback_query(F.data == "ai:start")
async def ai_start(callback: CallbackQuery, state: FSMContext, lang: str = "ru") -> None:
    await state.clear()
    await state.set_state(AIChatFSM.chatting)
    await state.update_data(history=[], lang=lang)
    await callback.message.edit_text(
        t("ai_welcome", lang),
        parse_mode="HTML",
    )
    await callback.answer()


@router.message(AIChatFSM.chatting, F.text)
async def ai_chat(message: Message, state: FSMContext, lang: str = "ru") -> None:
    user_text = message.text.strip()
    if user_text.startswith("/"):
        return

    data = await state.get_data()
    history: list = data.get("history", [])

    thinking_msg = await message.answer(t("ai_thinking", lang))

    try:
        reply = await ask_ai(user_text, history, lang)

        history.append({"role": "user", "content": user_text})
        history.append({"role": "assistant", "content": reply})
        if len(history) > MAX_HISTORY * 2:
            history = history[-(MAX_HISTORY * 2):]
        await state.update_data(history=history)

        await thinking_msg.delete()
        await message.answer(reply, parse_mode="HTML")
    except Exception as e:
        logger.error(f"AI chat error: {e}")
        await thinking_msg.delete()
        await message.answer(t("ai_error", lang))
