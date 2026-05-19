-- ============================================================
-- Asal Boutique Hotel — Initial Database Schema
-- Migration: 001_initial_schema  (idempotent — safe to re-run)
-- ============================================================

-- ============================================================
-- Extensions
-- ============================================================
create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";

-- ============================================================
-- ENUM types  (drop → recreate for idempotency)
-- NOTE: CASCADE on DROP TYPE will also drop any table column
--       that uses the type, so tables are fully recreated below.
-- ============================================================

drop type if exists room_type_enum      cascade;
create type room_type_enum      as enum ('standard', 'junior_suite', 'suite');

drop type if exists room_status_enum    cascade;
create type room_status_enum    as enum ('available', 'occupied', 'maintenance');

drop type if exists booking_status_enum cascade;
create type booking_status_enum as enum ('pending', 'confirmed', 'cancelled', 'completed');

drop type if exists payment_method_enum cascade;
create type payment_method_enum as enum ('cash', 'transfer', 'card');

drop type if exists payment_status_enum cascade;
create type payment_status_enum as enum ('pending', 'paid', 'refunded');

drop type if exists booking_source_enum cascade;
create type booking_source_enum as enum ('telegram', 'website', 'phone');

drop type if exists language_enum       cascade;
create type language_enum       as enum ('ru', 'uz', 'en');

drop type if exists loyalty_enum        cascade;
create type loyalty_enum        as enum ('base', 'silver', 'gold');

-- ============================================================
-- TABLE: rooms
-- ============================================================
drop table if exists rooms cascade;
create table rooms (
    id              uuid             primary key default gen_random_uuid(),
    room_number     varchar(10)      not null unique,
    type            room_type_enum   not null,
    floor           smallint         not null check (floor between 1 and 10),
    status          room_status_enum not null default 'available',
    price_per_night numeric(10, 2)   not null check (price_per_night > 0),
    max_guests      smallint         not null default 2 check (max_guests between 1 and 10),
    description_ru  text,
    description_uz  text,
    description_en  text,
    amenities       jsonb            not null default '[]'::jsonb,
    created_at      timestamptz      not null default now()
);

create index idx_rooms_type    on rooms (type);
create index idx_rooms_status  on rooms (status);
create index idx_rooms_floor   on rooms (floor);

comment on table  rooms           is 'Hotel rooms directory';
comment on column rooms.amenities is 'JSON array: [{"icon":"wifi","name_ru":"Wi-Fi"}]';
comment on column rooms.status    is 'available | occupied | maintenance';

-- ============================================================
-- TABLE: users
-- ============================================================
drop table if exists users cascade;
create table users (
    id               uuid          primary key default gen_random_uuid(),
    telegram_id      bigint        not null unique,
    username         text,
    full_name        text          not null default '',
    phone            text,
    language         language_enum not null default 'ru',
    loyalty_status   loyalty_enum  not null default 'base',
    nights_count     integer       not null default 0 check (nights_count >= 0),
    discount_percent smallint      not null default 0 check (discount_percent between 0 and 100),
    created_at       timestamptz   not null default now()
);

create index idx_users_telegram_id on users (telegram_id);
create index idx_users_loyalty     on users (loyalty_status);

comment on table  users             is 'Bot users / hotel guests';
comment on column users.telegram_id is 'Unique Telegram user ID';

-- ============================================================
-- TABLE: bookings
-- ============================================================
drop table if exists bookings cascade;
create table bookings (
    id               uuid                 primary key default gen_random_uuid(),
    room_id          uuid                 not null references rooms (id) on delete restrict,
    user_telegram_id bigint               not null,
    guest_name       text                 not null,
    guest_phone      text                 not null,
    check_in         date                 not null,
    check_out        date                 not null,
    nights           smallint             not null check (nights > 0),
    total_price      numeric(10, 2)       not null check (total_price >= 0),
    status           booking_status_enum  not null default 'pending',
    payment_method   payment_method_enum  not null default 'cash',
    payment_status   payment_status_enum  not null default 'pending',
    source           booking_source_enum  not null default 'telegram',
    created_at       timestamptz          not null default now(),

    constraint bookings_dates_valid   check (check_out > check_in),
    constraint bookings_nights_match  check (nights = (check_out - check_in)::smallint)
);

create index idx_bookings_room_id          on bookings (room_id);
create index idx_bookings_user_telegram_id on bookings (user_telegram_id);
create index idx_bookings_check_in         on bookings (check_in);
create index idx_bookings_check_out        on bookings (check_out);
create index idx_bookings_status           on bookings (status);
create index idx_bookings_dates_range      on bookings (check_in, check_out);

comment on table  bookings                  is 'Room booking records';
comment on column bookings.user_telegram_id is 'Telegram ID (denormalized for fast lookup without join)';
comment on column bookings.nights           is 'Must equal check_out - check_in';

-- ============================================================
-- FUNCTION: is_room_available
-- ============================================================
create or replace function is_room_available(
    p_room_id  uuid,
    p_check_in  date,
    p_check_out date
)
returns boolean
language sql stable as $$
    select not exists (
        select 1
        from   bookings
        where  room_id  = p_room_id
          and  status  != 'cancelled'
          and  check_in  < p_check_out
          and  check_out > p_check_in
    );
$$;

-- ============================================================
-- FUNCTION: get_available_rooms
-- ============================================================
create or replace function get_available_rooms(
    p_type      room_type_enum,
    p_check_in  date,
    p_check_out date
)
returns setof rooms
language sql stable as $$
    select r.*
    from   rooms r
    where  r.type   = p_type
      and  r.status = 'available'
      and  is_room_available(r.id, p_check_in, p_check_out)
    order  by r.room_number;
$$;

-- ============================================================
-- FUNCTION: first_available_room
-- ============================================================
create or replace function first_available_room(
    p_type      room_type_enum,
    p_check_in  date,
    p_check_out date
)
returns rooms
language sql stable as $$
    select * from get_available_rooms(p_type, p_check_in, p_check_out) limit 1;
$$;

-- ============================================================
-- FUNCTION: rooms_availability_summary
-- ============================================================
create or replace function rooms_availability_summary(
    p_check_in  date,
    p_check_out date
)
returns table(
    room_type   room_type_enum,
    total_rooms bigint,
    free_rooms  bigint,
    price       numeric
)
language sql stable as $$
    select
        r.type,
        count(*)                                             as total_rooms,
        count(*) filter (
            where is_room_available(r.id, p_check_in, p_check_out)
              and r.status = 'available'
        )                                                    as free_rooms,
        min(r.price_per_night)                               as price
    from rooms r
    group by r.type
    order by min(r.price_per_night);
$$;

-- ============================================================
-- FUNCTION: monthly_stats
-- ============================================================
create or replace function monthly_stats(p_year int, p_month int)
returns table(
    total_bookings bigint,
    total_revenue  numeric,
    avg_nights     numeric,
    occupancy_pct  numeric
)
language sql stable as $$
    with month_data as (
        select *
        from   bookings
        where  extract(year  from check_in) = p_year
          and  extract(month from check_in) = p_month
          and  status != 'cancelled'
    ),
    room_count as (
        select count(*) as cnt from rooms where status != 'maintenance'
    ),
    days_in_month as (
        select extract(
            day from (
                date_trunc('month', make_date(p_year, p_month, 1))
                + interval '1 month - 1 day'
            )
        )::int as cnt
    )
    select
        (select count(*)                      from month_data) as total_bookings,
        (select coalesce(sum(total_price), 0) from month_data) as total_revenue,
        (select round(avg(nights), 1)         from month_data) as avg_nights,
        round(
            (select coalesce(sum(nights), 0) from month_data)::numeric
            / nullif(
                (select cnt from room_count) * (select cnt from days_in_month),
                0
            ) * 100, 1
        )                                                       as occupancy_pct;
$$;

-- ============================================================
-- FUNCTION + TRIGGER: auto-sync room status on booking change
-- ============================================================
create or replace function sync_room_status()
returns trigger language plpgsql as $$
begin
    if (TG_OP = 'INSERT' or TG_OP = 'UPDATE') then
        if NEW.status = 'confirmed'
           and NEW.check_in <= current_date
           and NEW.check_out > current_date then
            update rooms set status = 'occupied' where id = NEW.room_id;
        end if;
        if NEW.status in ('cancelled', 'completed') then
            update rooms set status = 'available'
            where id = NEW.room_id
              and not exists (
                  select 1 from bookings
                  where  room_id  = NEW.room_id
                    and  status   = 'confirmed'
                    and  check_in  <= current_date
                    and  check_out >  current_date
                    and  id != NEW.id
              );
        end if;
    end if;
    return NEW;
end;
$$;

-- trigger is auto-dropped with the bookings table above; recreate it:
create trigger trg_booking_room_status
    after insert or update of status on bookings
    for each row execute function sync_room_status();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table rooms    enable row level security;
alter table users    enable row level security;
alter table bookings enable row level security;

-- rooms: public read of non-maintenance rooms
create policy "rooms: public read available"
    on rooms for select
    using (status != 'maintenance');

-- rooms: service role full write access
create policy "rooms: service write"
    on rooms for all
    using (auth.role() = 'service_role');

-- users: read own row
create policy "users: read own"
    on users for select
    using (
        telegram_id = coalesce(
            (current_setting('request.jwt.claims', true)::jsonb ->> 'telegram_id')::bigint,
            0
        )
    );

create policy "users: insert own"
    on users for insert
    with check (
        telegram_id = coalesce(
            (current_setting('request.jwt.claims', true)::jsonb ->> 'telegram_id')::bigint,
            0
        )
    );

create policy "users: update own"
    on users for update
    using (
        telegram_id = coalesce(
            (current_setting('request.jwt.claims', true)::jsonb ->> 'telegram_id')::bigint,
            0
        )
    );

create policy "users: service full access"
    on users for all
    using (auth.role() = 'service_role');

-- bookings: read own
create policy "bookings: read own"
    on bookings for select
    using (
        user_telegram_id = coalesce(
            (current_setting('request.jwt.claims', true)::jsonb ->> 'telegram_id')::bigint,
            0
        )
    );

create policy "bookings: insert own"
    on bookings for insert
    with check (
        user_telegram_id = coalesce(
            (current_setting('request.jwt.claims', true)::jsonb ->> 'telegram_id')::bigint,
            0
        )
    );

create policy "bookings: service full access"
    on bookings for all
    using (auth.role() = 'service_role');

-- ============================================================
-- SEED: 80 rooms
--   40 standard    101–140  floor 1  $60/night  max 2 guests
--   20 junior_suite 201–220 floor 2  $100/night max 3 guests
--   20 suite        301–320 floor 3  $160/night max 4 guests
-- ============================================================

insert into rooms
    (room_number, type, floor, status, price_per_night, max_guests,
     description_ru, description_uz, description_en, amenities)
select
    (100 + n)::text,
    'standard',
    1,
    'available',
    60.00,
    2,
    'Уютный стандартный номер с видом на сад. Кровать king-size, кондиционер, Smart TV, бесплатный Wi-Fi.',
    'Bog''ga ko''rinishli qulay standart xona. King-size to''shak, konditsioner, Smart TV, bepul Wi-Fi.',
    'Cozy standard room with garden view. King-size bed, air conditioning, Smart TV, free Wi-Fi.',
    '[
        {"icon":"wifi",      "name_ru":"Wi-Fi",           "name_uz":"Wi-Fi",           "name_en":"Wi-Fi"},
        {"icon":"ac",        "name_ru":"Кондиционер",     "name_uz":"Konditsioner",    "name_en":"Air conditioning"},
        {"icon":"tv",        "name_ru":"Smart TV",        "name_uz":"Smart TV",        "name_en":"Smart TV"},
        {"icon":"safe",      "name_ru":"Сейф",            "name_uz":"Seyf",            "name_en":"Safe"},
        {"icon":"shower",    "name_ru":"Душ",             "name_uz":"Dush",            "name_en":"Shower"},
        {"icon":"breakfast", "name_ru":"Завтрак включён", "name_uz":"Nonushta kiradi", "name_en":"Breakfast included"}
    ]'::jsonb
from generate_series(1, 40) as n;

insert into rooms
    (room_number, type, floor, status, price_per_night, max_guests,
     description_ru, description_uz, description_en, amenities)
select
    (200 + n)::text,
    'junior_suite',
    2,
    'available',
    100.00,
    3,
    'Просторный полулюкс с панорамным видом на исторический центр Бухары. Ванная с джакузи, мини-бар, гостиная зона.',
    'Buxoroning tarixiy markazi ko''rinishi bilan keng yarim lyuks. Jakuzili hammom, mini-bar, mehmonxona hududi.',
    'Spacious junior suite with panoramic view of Bukhara''s historic centre. Jacuzzi bathroom, mini-bar, lounge area.',
    '[
        {"icon":"wifi",      "name_ru":"Wi-Fi",            "name_uz":"Wi-Fi",           "name_en":"Wi-Fi"},
        {"icon":"ac",        "name_ru":"Кондиционер",      "name_uz":"Konditsioner",    "name_en":"Air conditioning"},
        {"icon":"tv",        "name_ru":"Smart TV 55\"",    "name_uz":"Smart TV 55\"",   "name_en":"Smart TV 55\""},
        {"icon":"jacuzzi",   "name_ru":"Джакузи",          "name_uz":"Jakuzi",          "name_en":"Jacuzzi"},
        {"icon":"minibar",   "name_ru":"Мини-бар",         "name_uz":"Mini-bar",        "name_en":"Mini-bar"},
        {"icon":"safe",      "name_ru":"Сейф",             "name_uz":"Seyf",            "name_en":"Safe"},
        {"icon":"bathrobe",  "name_ru":"Халаты и тапочки", "name_uz":"Xalat va kovush", "name_en":"Robes & slippers"},
        {"icon":"breakfast", "name_ru":"Завтрак включён",  "name_uz":"Nonushta kiradi", "name_en":"Breakfast included"}
    ]'::jsonb
from generate_series(1, 20) as n;

insert into rooms
    (room_number, type, floor, status, price_per_night, max_guests,
     description_ru, description_uz, description_en, amenities)
select
    (300 + n)::text,
    'suite',
    3,
    'available',
    160.00,
    4,
    'Роскошный люкс с отдельной гостиной, джакузи и персональным дворецким. Терраса с видом на минареты Бухары.',
    'Alohida yashash xonasi, jakuzi va shaxsiy xizmatchi bilan hashamatli lyuks. Buxoro minoralariga ko''rinishli teras.',
    'Luxurious suite with separate living room, jacuzzi and personal butler. Terrace overlooking Bukhara''s minarets.',
    '[
        {"icon":"wifi",      "name_ru":"Wi-Fi",                  "name_uz":"Wi-Fi",               "name_en":"Wi-Fi"},
        {"icon":"ac",        "name_ru":"Кондиционер",            "name_uz":"Konditsioner",        "name_en":"Air conditioning"},
        {"icon":"tv",        "name_ru":"Smart TV 65\"",          "name_uz":"Smart TV 65\"",       "name_en":"Smart TV 65\""},
        {"icon":"jacuzzi",   "name_ru":"Джакузи",                "name_uz":"Jakuzi",              "name_en":"Jacuzzi"},
        {"icon":"minibar",   "name_ru":"Мини-бар премиум",       "name_uz":"Premium mini-bar",    "name_en":"Premium mini-bar"},
        {"icon":"safe",      "name_ru":"Сейф",                   "name_uz":"Seyf",                "name_en":"Safe"},
        {"icon":"bathrobe",  "name_ru":"Халаты и тапочки",       "name_uz":"Xalat va kovush",     "name_en":"Robes & slippers"},
        {"icon":"butler",    "name_ru":"Персональный дворецкий", "name_uz":"Shaxsiy xizmatchi",   "name_en":"Personal butler"},
        {"icon":"terrace",   "name_ru":"Терраса",                "name_uz":"Teras",               "name_en":"Terrace"},
        {"icon":"breakfast", "name_ru":"Завтрак включён",        "name_uz":"Nonushta kiradi",     "name_en":"Breakfast included"},
        {"icon":"transfer",  "name_ru":"Трансфер из аэропорта",  "name_uz":"Aeroport transferi",  "name_en":"Airport transfer"}
    ]'::jsonb
from generate_series(1, 20) as n;

-- Verify: select type, count(*), min(room_number), max(room_number) from rooms group by type order by min(price_per_night);
-- Expected: standard 40 | junior_suite 20 | suite 20 => total 80
