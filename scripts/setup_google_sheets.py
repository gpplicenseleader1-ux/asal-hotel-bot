"""
Script to initialize Google Sheets with proper headers and formatting.
Run once before starting the bot.

Usage:
    cd bot
    python ../scripts/setup_google_sheets.py
"""
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "bot"))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

import gspread
from google.oauth2.service_account import Credentials
import config

SCOPES = [
    "https://spreadsheets.google.com/feeds",
    "https://www.googleapis.com/auth/drive",
]

BOOKINGS_HEADERS = [
    "ID брони", "Дата создания", "Гость", "Телефон",
    "Тип номера", "Номер комнаты", "Заезд", "Выезд",
    "Ночей", "Сумма ($)", "Оплата", "Статус", "Источник",
]

STATS_HEADERS = [
    "Месяц", "Год", "Всего броней", "Доход ($)",
    "Средних ночей", "Заполняемость %",
]

USERS_HEADERS = [
    "Telegram ID", "Имя", "Username", "Телефон",
    "Язык", "Статус лояльности", "Ночей всего", "Скидка %", "Дата регистрации",
]


def format_header_row(worksheet: gspread.Worksheet, headers: list[str]) -> None:
    worksheet.append_row(headers)
    worksheet.format("1:1", {
        "backgroundColor": {"red": 0.83, "green": 0.51, "blue": 0.11},
        "textFormat": {"bold": True, "foregroundColor": {"red": 1, "green": 1, "blue": 1}},
    })
    worksheet.freeze(rows=1)


def setup_bookings_sheet(spreadsheet: gspread.Spreadsheet) -> None:
    try:
        ws = spreadsheet.worksheet("Брони")
        print("Sheet 'Брони' already exists, skipping.")
    except gspread.WorksheetNotFound:
        ws = spreadsheet.add_worksheet(title="Брони", rows=1000, cols=15)
        format_header_row(ws, BOOKINGS_HEADERS)
        ws.set_column_width(1, 120)
        print("✅ Created sheet 'Брони'")


def setup_stats_sheet(spreadsheet: gspread.Spreadsheet) -> None:
    try:
        ws = spreadsheet.worksheet("Статистика")
        print("Sheet 'Статистика' already exists, skipping.")
    except gspread.WorksheetNotFound:
        ws = spreadsheet.add_worksheet(title="Статистика", rows=100, cols=10)
        format_header_row(ws, STATS_HEADERS)
        print("✅ Created sheet 'Статистика'")


def setup_users_sheet(spreadsheet: gspread.Spreadsheet) -> None:
    try:
        ws = spreadsheet.worksheet("Пользователи")
        print("Sheet 'Пользователи' already exists, skipping.")
    except gspread.WorksheetNotFound:
        ws = spreadsheet.add_worksheet(title="Пользователи", rows=1000, cols=10)
        format_header_row(ws, USERS_HEADERS)
        print("✅ Created sheet 'Пользователи'")


def main() -> None:
    if not config.GOOGLE_SHEETS_ID:
        print("❌ GOOGLE_SHEETS_ID not set in .env")
        sys.exit(1)
    if not os.path.exists(config.GOOGLE_CREDENTIALS_PATH):
        print(f"❌ credentials.json not found at: {config.GOOGLE_CREDENTIALS_PATH}")
        sys.exit(1)

    print(f"Connecting to Google Sheets: {config.GOOGLE_SHEETS_ID}")
    creds = Credentials.from_service_account_file(config.GOOGLE_CREDENTIALS_PATH, scopes=SCOPES)
    gc = gspread.authorize(creds)
    spreadsheet = gc.open_by_key(config.GOOGLE_SHEETS_ID)
    print(f"✅ Opened spreadsheet: {spreadsheet.title}")

    setup_bookings_sheet(spreadsheet)
    setup_stats_sheet(spreadsheet)
    setup_users_sheet(spreadsheet)

    print("\n🎉 Google Sheets setup complete!")
    print(f"URL: https://docs.google.com/spreadsheets/d/{config.GOOGLE_SHEETS_ID}")


if __name__ == "__main__":
    main()
