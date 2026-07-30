-- ============================================================
-- Migration: 003_checked_in  (idempotent — safe to re-run)
-- Adds a check-in flag, set by the "Заселить" action from the
-- Google Sheets two-way sync (bot/services/sheets_sync.py).
-- ============================================================

alter table bookings add column if not exists checked_in boolean not null default false;

create index if not exists idx_bookings_checked_in on bookings (checked_in);

comment on column bookings.checked_in is 'Set via Sheets "Заселить" action or admin panel; independent of booking_status_enum';
