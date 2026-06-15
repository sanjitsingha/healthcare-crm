ALTER TABLE followups
  ADD COLUMN IF NOT EXISTS next_followup_date DATE;
