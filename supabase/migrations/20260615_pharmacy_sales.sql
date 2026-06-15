-- Pharmacy sales (walk-in POS) + line items
CREATE TABLE IF NOT EXISTS pharmacy_sales (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  UUID NOT NULL,
  sale_code        TEXT,
  patient_id       UUID REFERENCES patients(id) ON DELETE SET NULL,
  customer_name    TEXT,
  customer_phone   TEXT,
  subtotal         NUMERIC DEFAULT 0,
  discount_total   NUMERIC DEFAULT 0,
  tax_total        NUMERIC DEFAULT 0,
  total            NUMERIC DEFAULT 0,
  payment_mode     TEXT,
  payment_status   TEXT DEFAULT 'paid' CHECK (payment_status IN ('paid', 'due')),
  status           TEXT DEFAULT 'completed' CHECK (status IN ('draft', 'completed')),
  amount_paid      NUMERIC DEFAULT 0,
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS pharmacy_sale_items (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id          UUID NOT NULL REFERENCES pharmacy_sales(id) ON DELETE CASCADE,
  organization_id  UUID,
  item_id          UUID,
  item_code        TEXT,
  name             TEXT,
  quantity         NUMERIC DEFAULT 0,
  unit_price       NUMERIC DEFAULT 0,
  discount_percent NUMERIC DEFAULT 0,
  tax_percent      NUMERIC DEFAULT 0,
  line_total       NUMERIC DEFAULT 0,
  created_at       TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pharmacy_sales_org ON pharmacy_sales (organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pharmacy_sale_items_sale ON pharmacy_sale_items (sale_id);

ALTER TABLE pharmacy_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE pharmacy_sale_items ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pharmacy_sales' AND policyname = 'pharmacy_sales_all') THEN
    CREATE POLICY pharmacy_sales_all ON pharmacy_sales FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'pharmacy_sale_items' AND policyname = 'pharmacy_sale_items_all') THEN
    CREATE POLICY pharmacy_sale_items_all ON pharmacy_sale_items FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
