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
    for x in os.getenv("ADMIN_IDS", "5035098497").split(",")
    if x.strip().isdigit()
]

SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
SUPABASE_ANON_KEY: str = os.getenv("SUPABASE_ANON_KEY", "")
SUPABASE_SERVICE_KEY: str = os.getenv("SUPABASE_SERVICE_KEY", "")

GOOGLE_SHEETS_ID: str = os.getenv("GOOGLE_SHEETS_ID", "1xe8_vR-iLg4T9RbemYLwZaHBJMWbf_AvyVWGnU0fHDg")
GOOGLE_CALENDAR_ID: str = os.getenv("GOOGLE_CALENDAR_ID", "primary")
GOOGLE_CREDENTIALS_PATH: str = os.getenv("GOOGLE_CREDENTIALS_PATH", "credentials.json")

ANTHROPIC_API_KEY: str = os.getenv("ANTHROPIC_API_KEY", "")
ANTHROPIC_MODEL: str = "claude-sonnet-4-6"

MINI_APP_URL: str = os.getenv("MINI_APP_URL", "")

HOTEL_NAME = "Asal Boutique Hotel"
HOTEL_CITY = "Бухара, Узбекистан"
HOTEL_PHONE = "+998 91 116 71 57"
HOTEL_ADDRESS = "ул. Накшбанди 5, Бухара"
HOTEL_INSTAGRAM = "@asal_boutique_hotel"

ROOM_TYPES = {
    "standard": {
        "ru": {"name": "Стандарт", "desc": "Номер + завтрак + стандартные аменити + Wi-Fi + круглосуточный сервис. До 2 гостей."},
        "uz": {"name": "Standart", "desc": "Xona + nonushta + standart ameniteler + Wi-Fi + 24/7 xizmat. 2 ta mehmon."},
        "en": {"name": "Standard", "desc": "Room + breakfast + standard amenities + Wi-Fi + 24/7 service. Up to 2 guests."},
        "price": 400000,
        "emoji": "🏨",
    },
    "junior_suite": {
        "ru": {"name": "Полулюкс", "desc": "Номер + завтрак + полулюкс аменити + Wi-Fi + круглосуточный сервис. До 3 гостей. При 2+ ночах: VIP трансфер + вход на смотровую площадку напротив минарета."},
        "uz": {"name": "Yarim lyuks", "desc": "Xona + nonushta + yarim lyuks ameniteler + Wi-Fi + 24/7 xizmat. 3 ta mehmon. 2+ kechada: VIP transfer + minora yonidagi kuzatuv maydoni."},
        "en": {"name": "Junior Suite", "desc": "Room + breakfast + junior suite amenities + Wi-Fi + 24/7 service. Up to 3 guests. 2+ nights: VIP transfer + minaret viewpoint access."},
        "price": 600000,
        "emoji": "🌟",
    },
    "suite": {
        "ru": {"name": "Люкс", "desc": "Номер + завтрак + люкс аменити + Wi-Fi + круглосуточный сервис. До 4 гостей. При 2+ ночах: VIP трансфер + вход на смотровую площадку напротив минарета."},
        "uz": {"name": "Lyuks", "desc": "Xona + nonushta + lyuks ameniteler + Wi-Fi + 24/7 xizmat. 4 ta mehmon. 2+ kechada: VIP transfer + minora yonidagi kuzatuv maydoni."},
        "en": {"name": "Suite", "desc": "Room + breakfast + suite amenities + Wi-Fi + 24/7 service. Up to 4 guests. 2+ nights: VIP transfer + minaret viewpoint access."},
        "price": 800000,
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
