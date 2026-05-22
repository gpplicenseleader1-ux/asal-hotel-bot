import logging
import json
from datetime import date

import anthropic

import config
from services.booking_service import get_available_room

logger = logging.getLogger(__name__)

HOTEL_SYSTEM_PROMPT = """Ты — вежливый и профессиональный ИИ-ассистент отеля Asal Boutique Hotel (Бухара, Узбекистан).

ИНФОРМАЦИЯ ОБ ОТЕЛЕ:
- Название: Asal Boutique Hotel
- Адрес: ул. Накшбанди 5, Бухара, Узбекистан
- Телефон: +998 77 333 22 00
- Email: info@asal-hotel.uz
- 25 номеров, 3 категории

ТИПЫ НОМЕРОВ И ЦЕНЫ:
- Стандарт (101–110, 10 номеров): $60/ночь — уютный номер с видом на сад, king-size кровать, Wi-Fi
- Полулюкс (201–210, 10 номеров): $100/ночь — вид на исторический центр Бухары, джакузи, мини-бар, гостиная зона
- Люкс (301–305, 5 номеров): $160/ночь — роскошный люкс с гостиной, джакузи и персональным дворецким

УДОБСТВА:
- Ресторан узбекской кухни (завтрак включён)
- Бассейн и СПА
- Бесплатный Wi-Fi
- Трансфер из/до аэропорта
- Организация экскурсий по Бухаре

ПРАВИЛА:
- Заезд: 14:00, выезд: 12:00
- Ранний заезд/поздний выезд — по запросу
- Домашние животные — не разрешены
- Курение — только в специально отведённых местах

СПОСОБЫ ОПЛАТЫ:
- Наличные при заезде
- Банковский перевод
- Карты: Visa, Mastercard, UzCard, Humo, Mir, Сбербанк
- Онлайн: Payme, Click

ПРОГРАММА ЛОЯЛЬНОСТИ Asal Friends:
- Базовый: 0–9 ночей (0%)
- Серебро: 10–29 ночей (5%)
- Золото: 30+ ночей (10%)

Отвечай на языке пользователя (русский, узбекский или английский).
Будь кратким, дружелюбным и информативным.
Для бронирования предлагай воспользоваться ботом (команда /start) или мобильным приложением."""

TOOLS = [
    {
        "name": "check_availability",
        "description": "Check if rooms of a specific type are available for given dates",
        "input_schema": {
            "type": "object",
            "properties": {
                "room_type": {
                    "type": "string",
                    "enum": ["standard", "junior_suite", "suite"],
                    "description": "Type of room",
                },
                "check_in": {
                    "type": "string",
                    "description": "Check-in date in YYYY-MM-DD format",
                },
                "check_out": {
                    "type": "string",
                    "description": "Check-out date in YYYY-MM-DD format",
                },
            },
            "required": ["room_type", "check_in", "check_out"],
        },
    }
]


async def _handle_tool_call(tool_name: str, tool_input: dict) -> str:
    if tool_name == "check_availability":
        try:
            check_in = date.fromisoformat(tool_input["check_in"])
            check_out = date.fromisoformat(tool_input["check_out"])
            room = await get_available_room(tool_input["room_type"], check_in, check_out)
            if room:
                return json.dumps({"available": True, "room_number": room.get("room_number")})
            return json.dumps({"available": False})
        except Exception as e:
            return json.dumps({"error": str(e)})
    return json.dumps({"error": "Unknown tool"})


async def ask_ai(
    user_message: str,
    conversation_history: list[dict],
    lang: str = "ru",
) -> str:
    client = anthropic.Anthropic(api_key=config.ANTHROPIC_API_KEY)

    messages = conversation_history + [{"role": "user", "content": user_message}]

    try:
        response = client.messages.create(
            model=config.ANTHROPIC_MODEL,
            max_tokens=1024,
            system=HOTEL_SYSTEM_PROMPT,
            tools=TOOLS,
            messages=messages,
        )

        if response.stop_reason == "tool_use":
            tool_results = []
            for block in response.content:
                if block.type == "tool_use":
                    result = await _handle_tool_call(block.name, block.input)
                    tool_results.append({
                        "type": "tool_result",
                        "tool_use_id": block.id,
                        "content": result,
                    })

            messages.append({"role": "assistant", "content": response.content})
            messages.append({"role": "user", "content": tool_results})

            followup = client.messages.create(
                model=config.ANTHROPIC_MODEL,
                max_tokens=1024,
                system=HOTEL_SYSTEM_PROMPT,
                messages=messages,
            )
            return _extract_text(followup)

        return _extract_text(response)

    except Exception as e:
        logger.error(f"AI error: {e}")
        return {"ru": "Извините, произошла ошибка.", "uz": "Kechirasiz, xatolik.", "en": "Sorry, an error occurred."}.get(lang, "Error")


def _extract_text(response) -> str:
    for block in response.content:
        if hasattr(block, "text"):
            return block.text
    return ""
