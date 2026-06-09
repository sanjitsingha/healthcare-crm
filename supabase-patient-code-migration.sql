-- Patient auto-ID: ensure the column exists so generated codes can be stored.
-- Run once in Supabase → SQL Editor.

alter table patients add column if not exists patient_code text;

-- Optional: see recent patients and whether codes are being generated.
-- select id, first_name, patient_code, created_at
-- from patients order by created_at desc limit 10;
