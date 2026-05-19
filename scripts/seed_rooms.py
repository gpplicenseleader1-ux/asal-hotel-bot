"""
Alternative seed script to populate rooms via Supabase Python client.
The SQL migration already seeds rooms, but use this for re-seeding
or updating room data without running a new migration.

Usage:
    cd bot
    python ../scripts/seed_rooms.py
"""
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "bot"))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

from services.supabase_client import get_service_client

ROOMS: list[dict] = []

# Standard rooms: floor 1 (101-120) and floor 2 (201-220)
for floor in range(1, 3):
    for n in range(1, 21):
        room_num = f"{floor}0{n:02d}" if n < 100 else f"{floor}{n}"
        ROOMS.append({
            "room_number": str(floor * 100 + n),
            "type": "standard",
            "floor": floor,
            "price_per_night": 50.0,
            "max_guests": 2,
            "description_ru": "Уютный номер с видом на сад, king-size кровать, Wi-Fi",
            "description_uz": "Bog'ga ko'rinish, king-size to'shak, Wi-Fi",
            "description_en": "Cozy room with garden view, king-size bed, Wi-Fi",
            "amenities": ["Wi-Fi", "Кондиционер", "Телевизор", "Холодильник", "Сейф"],
            "is_active": True,
        })

# Deluxe rooms: floor 3 (301-315) and floor 4 (401-415)
for floor_idx, base in enumerate([300, 400]):
    for n in range(1, 16):
        ROOMS.append({
            "room_number": str(base + n),
            "type": "deluxe",
            "floor": floor_idx + 3,
            "price_per_night": 80.0,
            "max_guests": 3,
            "description_ru": "Вид на исторический центр, джакузи, мини-бар",
            "description_uz": "Tarixiy markaz ko'rinishi, jakuzi, mini-bar",
            "description_en": "Old city view, jacuzzi, mini-bar",
            "amenities": ["Wi-Fi", "Кондиционер", "Джакузи", "Мини-бар", "Телевизор 55\"", "Халаты"],
            "is_active": True,
        })

# Suite rooms: floor 5 (501-510)
for n in range(1, 11):
    ROOMS.append({
        "room_number": str(500 + n),
        "type": "suite",
        "floor": 5,
        "price_per_night": 120.0,
        "max_guests": 4,
        "description_ru": "Роскошный люкс с гостиной, джакузи, персональный сервис",
        "description_uz": "Yashash xonasi, jakuzi, shaxsiy xizmat",
        "description_en": "Luxurious suite with living room, jacuzzi, butler service",
        "amenities": ["Wi-Fi", "Кондиционер", "Джакузи", "Мини-бар", "Гостиная", "Кухня", "Терраса", "Дворецкий"],
        "is_active": True,
    })


def main() -> None:
    db = get_service_client()

    print(f"Total rooms to seed: {len(ROOMS)}")
    confirm = input("This will clear existing rooms. Continue? [y/N] ")
    if confirm.lower() != "y":
        print("Aborted.")
        return

    db.table("rooms").delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
    print("Cleared existing rooms.")

    result = db.table("rooms").insert(ROOMS).execute()
    print(f"✅ Seeded {len(result.data)} rooms.")

    stats = {"standard": 0, "deluxe": 0, "suite": 0}
    for r in ROOMS:
        stats[r["type"]] += 1

    print(f"\nRoom breakdown:")
    print(f"  🏨 Standard: {stats['standard']}")
    print(f"  🌟 Deluxe:   {stats['deluxe']}")
    print(f"  👑 Suite:    {stats['suite']}")
    print(f"  Total:       {sum(stats.values())}")


if __name__ == "__main__":
    main()
