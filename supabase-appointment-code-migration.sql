-- Appointment auto-ID: add the column so generated codes can be stored.
-- Run once in Supabase → SQL Editor.

alter table appointments add column if not exists appointment_code text;

-- Optional index for fast lookups by code (e.g. search bar).
create index if not exists appointments_appointment_code_idx on appointments (appointment_code);

-- Verify: check recent appointments.
-- select id, appointment_code, scheduled_at from appointments order by created_at desc limit 10;
