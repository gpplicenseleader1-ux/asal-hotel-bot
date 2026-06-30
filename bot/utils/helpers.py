import calendar
from datetime import date, timedelta
from typing import Optional


def format_date(d: date, lang: str = "ru") -> str:
    months = {
        "ru": ["января", "февраля", "марта", "апреля", "мая", "июня",
               "июля", "августа", "сентября", "октября", "ноября", "декабря"],
        "uz": ["yanvar", "fevral", "mart", "aprel", "may", "iyun",
               "iyul", "avgust", "sentabr", "oktabr", "noyabr", "dekabr"],
        "en": ["January", "February", "March", "April", "May", "June",
               "July", "August", "September", "October", "November", "December"],
    }
    m = months.get(lang, months["ru"])
    return f"{d.day} {m[d.month - 1]} {d.year}"


def nights_count(check_in: date, check_out: date) -> int:
    return (check_out - check_in).days


def calculate_price(room_price: float, nights: int, discount_percent: int = 0) -> float:
    total = room_price * nights
    if discount_percent:
        total *= (1 - discount_percent / 100)
    return round(total, 2)


def format_price(amount: float) -> str:
    return f"{int(amount):,} сум".replace(",", " ")


def get_booking_id(booking_uuid: str) -> str:
    return booking_uuid[:8].upper()


def loyalty_tier_from_nights(nights: int) -> str:
    if nights >= 30:
        return "gold"
    if nights >= 10:
        return "silver"
    return "base"


def phone_normalize(phone: str) -> str:
    digits = "".join(c for c in phone if c.isdigit())
    if digits.startswith("998") and len(digits) == 12:
        return f"+{digits}"
    if len(digits) == 9:
        return f"+998{digits}"
    return phone


def calendar_weeks(year: int, month: int) -> list[list[int]]:
    return calendar.monthcalendar(year, month)


def prev_month(year: int, month: int) -> tuple[int, int]:
    if month == 1:
        return year - 1, 12
    return year, month - 1


def next_month(year: int, month: int) -> tuple[int, int]:
    if month == 12:
        return year + 1, 1
    return year, month + 1


MONTH_NAMES = {
    "ru": ["", "Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
           "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"],
    "uz": ["", "Yanvar", "Fevral", "Mart", "Aprel", "May", "Iyun",
           "Iyul", "Avgust", "Sentabr", "Oktabr", "Noyabr", "Dekabr"],
    "en": ["", "January", "February", "March", "April", "May", "June",
           "July", "August", "September", "October", "November", "December"],
}
