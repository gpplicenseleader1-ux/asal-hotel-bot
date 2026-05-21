-- ============================================================
-- Migration: 002_miniapp_rpc
-- Security-definer RPC functions for Telegram Mini App
-- Allows anon key to check availability and create bookings
-- ============================================================

-- Fix: make availability functions SECURITY DEFINER so anon
-- users can check bookings table for conflict detection
create or replace function is_room_available(
    p_room_id  uuid,
    p_check_in  date,
    p_check_out date
)
returns boolean
language sql stable security definer as $$
    select not exists (
        select 1
        from   bookings
        where  room_id  = p_room_id
          and  status  != 'cancelled'
          and  check_in  < p_check_out
          and  check_out > p_check_in
    );
$$;

create or replace function get_available_rooms(
    p_type      room_type_enum,
    p_check_in  date,
    p_check_out date
)
returns setof rooms
language sql stable security definer as $$
    select r.*
    from   rooms r
    where  r.type   = p_type
      and  r.status = 'available'
      and  is_room_available(r.id, p_check_in, p_check_out)
    order  by r.room_number;
$$;

create or replace function first_available_room(
    p_type      room_type_enum,
    p_check_in  date,
    p_check_out date
)
returns rooms
language sql stable security definer as $$
    select * from get_available_rooms(p_type, p_check_in, p_check_out) limit 1;
$$;

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
language sql stable security definer as $$
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

-- Create booking from mini app (bypasses RLS, validates server-side)
create or replace function create_booking_miniapp(
    p_telegram_id    bigint,
    p_room_type      room_type_enum,
    p_check_in       date,
    p_check_out      date,
    p_guest_name     text,
    p_guest_phone    text,
    p_guests_count   int,
    p_payment_method payment_method_enum
)
returns jsonb
language plpgsql security definer as $$
declare
    v_room    rooms;
    v_booking bookings;
    v_nights  int;
    v_total   numeric;
begin
    v_nights := (p_check_out - p_check_in);

    if p_check_in < current_date then
        raise exception 'check_in cannot be in the past';
    end if;
    if v_nights < 1 or v_nights > 30 then
        raise exception 'Stay must be 1–30 nights';
    end if;

    select * into v_room
    from get_available_rooms(p_room_type, p_check_in, p_check_out)
    limit 1;

    if not found or v_room.id is null then
        raise exception 'Нет доступных номеров выбранного типа на эти даты';
    end if;

    v_total := v_room.price_per_night * v_nights;

    insert into bookings (
        id, room_id, user_telegram_id, guest_name, guest_phone,
        check_in, check_out, nights, total_price, status,
        payment_method, payment_status, source
    ) values (
        gen_random_uuid(), v_room.id, p_telegram_id,
        p_guest_name, p_guest_phone,
        p_check_in, p_check_out, v_nights, v_total,
        'confirmed', p_payment_method, 'pending', 'website'
    ) returning * into v_booking;

    update rooms set status = 'occupied' where id = v_room.id;

    insert into users (telegram_id, full_name, language, loyalty_status, nights_count, discount_percent)
    values (p_telegram_id, p_guest_name, 'ru', 'base', 0, 0)
    on conflict (telegram_id) do nothing;

    return jsonb_build_object(
        'id',             v_booking.id,
        'room_number',    v_room.room_number,
        'room_type',      v_room.type,
        'check_in',       v_booking.check_in,
        'check_out',      v_booking.check_out,
        'nights',         v_booking.nights,
        'total_price',    v_booking.total_price,
        'status',         v_booking.status,
        'payment_method', v_booking.payment_method,
        'guest_name',     v_booking.guest_name,
        'guest_phone',    v_booking.guest_phone
    );
end;
$$;

-- Get user bookings from mini app
create or replace function get_user_bookings_miniapp(p_telegram_id bigint)
returns table(
    id             uuid,
    room_number    text,
    room_type      room_type_enum,
    check_in       date,
    check_out      date,
    nights         smallint,
    total_price    numeric,
    status         booking_status_enum,
    payment_method payment_method_enum,
    guest_name     text,
    created_at     timestamptz
)
language sql stable security definer as $$
    select
        b.id,
        r.room_number,
        r.type         as room_type,
        b.check_in,
        b.check_out,
        b.nights,
        b.total_price,
        b.status,
        b.payment_method,
        b.guest_name,
        b.created_at
    from bookings b
    join rooms r on r.id = b.room_id
    where b.user_telegram_id = p_telegram_id
    order by b.created_at desc
    limit 20;
$$;

-- Get or create user for loyalty page
create or replace function get_or_create_user_miniapp(
    p_telegram_id bigint,
    p_full_name   text,
    p_username    text default ''
)
returns jsonb
language plpgsql security definer as $$
declare
    v_user users;
begin
    select * into v_user from users where telegram_id = p_telegram_id;
    if found then
        return to_jsonb(v_user);
    end if;

    insert into users (telegram_id, full_name, username, language, loyalty_status, nights_count, discount_percent)
    values (p_telegram_id, p_full_name, p_username, 'ru', 'base', 0, 0)
    returning * into v_user;

    return to_jsonb(v_user);
end;
$$;
