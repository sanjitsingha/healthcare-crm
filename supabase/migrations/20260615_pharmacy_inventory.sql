-- Pharmacy inventory items
CREATE TABLE IF NOT EXISTS pharmacy_items (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       UUID NOT NULL,
  item_code             TEXT,

  -- Core stock
  name                  TEXT NOT NULL,
  generic_name          TEXT,
  manufacturer          TEXT,
  category              TEXT,
  unit                  TEXT,
  quantity              NUMERIC DEFAULT 0,
  reorder_level         NUMERIC DEFAULT 0,

  -- Batch & expiry
  batch_number          TEXT,
  expiry_date           DATE,
  manufacture_date      DATE,

  -- Pricing & tax
  purchase_price        NUMERIC,
  mrp                   NUMERIC,
  tax_percent           NUMERIC,
  hsn_code              TEXT,
  discount_percent      NUMERIC,

  -- Storage & supplier
  rack_location         TEXT,
  supplier              TEXT,
  barcode               TEXT,
  prescription_required BOOLEAN DEFAULT false,
  notes                 TEXT,

  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pharmacy_items_org ON pharmacy_items (organization_id);
CREATE INDEX IF NOT EXISTS idx_pharmacy_items_org_name ON pharmacy_items (organization_id, name);

ALTER TABLE pharmacy_items ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'pharmacy_items' AND policyname = 'pharmacy_items_all'
  ) THEN
    CREATE POLICY pharmacy_items_all ON pharmacy_items
      FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
