import os
from dotenv import load_dotenv

load_dotenv()

BOT_TOKEN: str = os.getenv("BOT_TOKEN", "")
WEBHOOK_URL: str = os.getenv("WEBHOOK_URL", "")
WEBHOOK_PATH: str = "/webhook"
WEB_SERVER_HOST: str = "0.0.0.0"
WEB_SERVER_PORT: int = int(os.getenv("PORT", "8080"))

ADMIN_IDS: list[int] = [
    int(x.strip())
    for x in os.getenv("ADMIN_IDS", "").split(",")
    if x.strip().isdigit()
]

SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
SUPABASE_ANON_KEY: str = os.getenv("SUPABASE_ANON_KEY", "")
SUPABASE_SERVICE_KEY: str = os.getenv("SUPABASE_SERVICE_KEY", "")

GOOGLE_SHEETS_ID: str = os.getenv("GOOGLE_SHEETS_ID", "")
GOOGLE_CALENDAR_ID: str = os.getenv("GOOGLE_CALENDAR_ID", "primary")
GOOGLE_CREDENTIALS_PATH: str = os.getenv("GOOGLE_CREDENTIALS_PATH", "credentials.json")

ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")
ANTHROPIC_MODEL: str = "claude-sonnet-4-6"

MINI_APP_URL: str = os.getenv("MINI_APP_URL", "")

HOTEL_NAME = "Asal Boutique Hotel"
HOTEL_CITY = "Бухара, Узбекистан"
HOTEL_PHONE = "+998 90 123 45 67"
HOTEL_ADDRESS = "ул. Накшбанди 5, Бухара"
HOTEL_INSTAGRAM = "@asal_boutique_hotel"

ROOM_TYPES = {
    "standard": {
        "ru": {"name": "Стандарт", "desc": "Уютный номер с видом на сад, king-size кровать, Wi-Fi"},
        "uz": {"name": "Standart", "desc": "Bog'ga ko'rinish, king-size to'shak, Wi-Fi"},
        "en": {"name": "Standard", "desc": "Garden view, king-size bed, Wi-Fi"},
        "price": 60,
        "emoji": "🏨",
    },
    "junior_suite": {
        "ru": {"name": "Полулюкс", "desc": "Вид на исторический центр Бухары, джакузи, мини-бар, гостиная зона"},
        "uz": {"name": "Yarim lyuks", "desc": "Buxoro tarixiy markazi ko'rinishi, jakuzi, mini-bar"},
        "en": {"name": "Junior Suite", "desc": "Historic Bukhara view, jacuzzi, mini-bar, lounge area"},
        "price": 100,
        "emoji": "🌟",
    },
    "suite": {
        "ru": {"name": "Люкс", "desc": "Роскошный люкс с гостиной, джакузи и персональным дворецким"},
        "uz": {"name": "Lyuks", "desc": "Yashash xonasi, jakuzi va shaxsiy xizmatchi bilan hashamatli lyuks"},
        "en": {"name": "Suite", "desc": "Luxurious suite with living room, jacuzzi and personal butler"},
        "price": 160,
        "emoji": "👑",
    },
}

PAYMENT_METHODS = {
    "cash": {"ru": "Наличные при заезде", "uz": "Kelganda naqd", "en": "Cash on arrival"},
    "transfer": {"ru": "Банковский перевод", "uz": "Bank o'tkazmasi", "en": "Bank transfer"},
    "card": {"ru": "Карта (Visa/MC)", "uz": "Karta (Visa/MC)", "en": "Card (Visa/MC)"},
}

LOYALTY_TIERS = {
    "base": {"ru": "Базовый", "uz": "Asosiy", "en": "Base", "min_nights": 0, "discount": 0},
    "silver": {"ru": "Серебро", "uz": "Kumush", "en": "Silver", "min_nights": 10, "discount": 5},
    "gold": {"ru": "Золото", "uz": "Oltin", "en": "Gold", "min_nights": 30, "discount": 10},
}
