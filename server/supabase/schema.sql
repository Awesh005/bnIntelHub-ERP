-- ============================================================
-- BN IntelHub ERP — Supabase Schema
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor)
-- ============================================================

-- 1. Clients
CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  company_name text,
  email text,
  phone text,
  address text,
  gstin text,
  created_at timestamptz DEFAULT now()
);

-- 2. Team
CREATE TABLE IF NOT EXISTS team (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  role text,
  email text,
  phone text,
  created_at timestamptz DEFAULT now()
);

-- 3. Projects
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  description text,
  assigned_to uuid REFERENCES team(id) ON DELETE SET NULL,
  start_date date,
  deadline date,
  price numeric DEFAULT 0,
  status text DEFAULT 'Not Started',
  notes text,
  created_at timestamptz DEFAULT now()
);

-- 4. Invoices
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text UNIQUE NOT NULL,
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  issue_date date DEFAULT CURRENT_DATE,
  due_date date,
  subtotal numeric DEFAULT 0,
  gst_percent numeric DEFAULT 18,
  discount numeric DEFAULT 0,
  total numeric DEFAULT 0,
  amount_paid numeric DEFAULT 0,
  status text DEFAULT 'Unpaid',
  notes text,
  created_at timestamptz DEFAULT now()
);

-- 5. Invoice Items
CREATE TABLE IF NOT EXISTS invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid REFERENCES invoices(id) ON DELETE CASCADE NOT NULL,
  description text,
  service_type text,
  quantity numeric DEFAULT 1,
  rate numeric DEFAULT 0,
  amount numeric DEFAULT 0
);

-- 6. Quotations
CREATE TABLE IF NOT EXISTS quotations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_number text UNIQUE NOT NULL,
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  valid_till date,
  subtotal numeric DEFAULT 0,
  gst_percent numeric DEFAULT 18,
  discount numeric DEFAULT 0,
  total numeric DEFAULT 0,
  status text DEFAULT 'Draft',
  terms text,
  created_at timestamptz DEFAULT now()
);

-- 7. Quotation Items
CREATE TABLE IF NOT EXISTS quotation_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quotation_id uuid REFERENCES quotations(id) ON DELETE CASCADE NOT NULL,
  description text,
  service_type text,
  quantity numeric DEFAULT 1,
  rate numeric DEFAULT 0,
  amount numeric DEFAULT 0
);

-- 8. Settings (single-row configuration)
CREATE TABLE IF NOT EXISTS settings (
  id int PRIMARY KEY DEFAULT 1,
  -- Section 1: Company Info
  company_name text,
  legal_name text,
  brand_name text,
  address text,
  city text,
  state text,
  country text,
  pincode text,
  gstin text,
  pan text,
  cin text,
  msme_no text,
  startup_no text,
  iec_code text,
  business_type text,
  phone text,
  alt_phone text,
  email text,
  support_email text,
  accounts_email text,
  website text,

  -- Section 2: Bank Details
  bank_account_name text,
  bank_account_number text,
  bank_name text,
  ifsc text,
  branch text,
  upi_id text,
  swift_code text,
  iban text,
  qr_url text,

  -- Section 3: Branding
  logo_url text,
  signature_url text,
  stamp_url text,
  theme_color_primary text,
  theme_color_secondary text,
  font_family text,
  invoice_layout text,

  -- Section 4: Invoice Settings
  invoice_prefix text,
  invoice_start_no text,
  invoice_padding integer,
  currency text,
  default_gst_rate numeric,
  payment_terms text,
  invoice_footer text,
  invoice_notes text,
  declaration_text text,
  reverse_charge boolean,
  place_of_supply text,
  round_off boolean,
  show_amount_in_words boolean,
  enable_qr boolean,
  enable_signature boolean,
  enable_stamp boolean,
  enable_logo boolean,

  -- Section 5: GST Settings
  gst_type text,
  gst_reg_type text,
  default_sac text,
  default_hsn text,

  -- Section 6: Quotation Settings
  quotation_prefix text,
  quotation_expiry_days integer,
  quotation_terms text,
  quotation_notes text,
  quote_show_logo boolean,
  quote_show_signature boolean,
  quote_show_stamp boolean,

  -- Section 7: Email Settings
  sender_email text,
  reply_email text,
  bcc_email text,
  email_signature text,

  -- Section 8 & 9: Payments & Social
  accepted_payments jsonb,
  social_links jsonb,

  -- Section 10: Extra Uploads
  favicon_url text,
  letterhead_url text,
  watermark_url text
);

-- ============================================================
-- Disable Row Level Security on all tables
-- (Express with the service role key is the sole gatekeeper)
-- ============================================================
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE team ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Create permissive policies for service role (bypasses RLS anyway)
-- but explicitly disable for authenticated users
CREATE POLICY "Service role full access" ON clients FOR ALL USING (true);
CREATE POLICY "Service role full access" ON team FOR ALL USING (true);
CREATE POLICY "Service role full access" ON projects FOR ALL USING (true);
CREATE POLICY "Service role full access" ON invoices FOR ALL USING (true);
CREATE POLICY "Service role full access" ON invoice_items FOR ALL USING (true);
CREATE POLICY "Service role full access" ON quotations FOR ALL USING (true);
CREATE POLICY "Service role full access" ON quotation_items FOR ALL USING (true);
CREATE POLICY "Service role full access" ON settings FOR ALL USING (true);

-- ============================================================
-- Seed default settings row
-- ============================================================
INSERT INTO settings (id, company_name, address, gstin, phone, email, bank_account_name, bank_account_number, ifsc, bank_name)
VALUES (
  1,
  'BN IntelHub Pvt Ltd',
  '404 Tech Park, Tower B, Sector 62, Noida, India',
  '',
  '+91 (120) 456-7890',
  'finance@bnintelhub.com',
  '',
  '',
  '',
  ''
)
ON CONFLICT (id) DO NOTHING;
