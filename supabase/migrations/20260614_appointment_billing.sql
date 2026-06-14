-- Add billing/payment columns to appointments
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS consultation_fee    NUMERIC,
  ADD COLUMN IF NOT EXISTS consultation_fee_status TEXT DEFAULT 'due'
    CHECK (consultation_fee_status IN ('paid', 'due')),
  ADD COLUMN IF NOT EXISTS registration_fee    NUMERIC,
  ADD COLUMN IF NOT EXISTS registration_fee_status TEXT
    CHECK (registration_fee_status IN ('paid', 'due')),
  ADD COLUMN IF NOT EXISTS payment_mode        TEXT
    CHECK (payment_mode IN ('cash', 'online'));
