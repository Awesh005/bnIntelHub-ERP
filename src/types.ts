// ============================================================
// BN IntelHub ERP — TypeScript Types
// Matches Supabase Postgres schema (snake_case)
// ============================================================

export interface Client {
  id: string;
  name: string;
  company_name: string;
  email: string;
  phone: string;
  address: string;
  gstin: string;
  created_at: string;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  created_at: string;
}

export interface Project {
  id: string;
  name: string;
  client_id: string;
  description: string;
  assigned_to: string;
  start_date: string;
  deadline: string;
  price: number;
  status: string;
  notes: string;
  created_at: string;
  // Joined fields
  client_name?: string;
  client_company?: string;
  assigned_to_name?: string;
}

export interface InvoiceItem {
  id?: string;
  invoice_id?: string;
  description: string;
  service_type: string;
  quantity: number;
  rate: number;
  amount: number;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  client_id: string;
  project_id: string | null;
  issue_date: string;
  due_date: string;
  subtotal: number;
  gst_percent: number;
  discount: number;
  total: number;
  amount_paid: number;
  status: string;
  notes: string;
  created_at: string;
  // Joined fields
  items?: InvoiceItem[];
  client_name?: string;
  client_company?: string;
  client_email?: string;
  client_phone?: string;
  client_address?: string;
  client_gstin?: string;
  project_name?: string;
  balance_due?: number;
}

export interface QuotationItem {
  id?: string;
  quotation_id?: string;
  description: string;
  service_type: string;
  quantity: number;
  rate: number;
  amount: number;
}

export interface Quotation {
  id: string;
  quotation_number: string;
  client_id: string;
  valid_till: string;
  subtotal: number;
  gst_percent: number;
  discount: number;
  total: number;
  status: string;
  terms: string;
  created_at: string;
  // Joined fields
  items?: QuotationItem[];
  client_name?: string;
  client_company?: string;
  client_email?: string;
  client_phone?: string;
  client_address?: string;
  client_gstin?: string;
}

export interface Settings {
  id: number;
  // Section 1: Company Info
  company_name: string;
  legal_name?: string;
  brand_name?: string;
  address: string;
  city?: string;
  state?: string;
  country?: string;
  pincode?: string;
  gstin: string;
  pan?: string;
  cin?: string;
  msme_no?: string;
  startup_no?: string;
  iec_code?: string;
  business_type?: string;
  phone: string;
  alt_phone?: string;
  email: string;
  support_email?: string;
  accounts_email?: string;
  website?: string;

  // Section 2: Bank Details
  bank_account_name: string;
  bank_account_number: string;
  bank_name: string;
  ifsc: string;
  branch?: string;
  upi_id?: string;
  swift_code?: string;
  iban?: string;
  qr_url?: string;

  // Section 3: Branding
  logo_url: string;
  signature_url?: string;
  stamp_url?: string;
  theme_color_primary?: string;
  theme_color_secondary?: string;
  font_family?: string;
  invoice_layout?: string;

  // Section 4: Invoice Settings
  invoice_prefix?: string;
  invoice_start_no?: string;
  invoice_padding?: number;
  currency?: string;
  default_gst_rate?: number;
  payment_terms?: string;
  invoice_footer?: string;
  invoice_notes?: string;
  declaration_text?: string;
  reverse_charge?: boolean;
  place_of_supply?: string;
  round_off?: boolean;
  show_amount_in_words?: boolean;
  enable_qr?: boolean;
  enable_signature?: boolean;
  enable_stamp?: boolean;
  enable_logo?: boolean;

  // Section 5: GST Settings
  gst_type?: string;
  gst_reg_type?: string;
  default_sac?: string;
  default_hsn?: string;

  // Section 6: Quotation Settings
  quotation_prefix?: string;
  quotation_expiry_days?: number;
  quotation_terms?: string;
  quotation_notes?: string;
  quote_show_logo?: boolean;
  quote_show_signature?: boolean;
  quote_show_stamp?: boolean;

  // Section 7: Email Settings
  sender_email?: string;
  reply_email?: string;
  bcc_email?: string;
  email_signature?: string;

  // Section 8 & 9: Payments & Social
  accepted_payments?: any; // JSONB
  social_links?: any; // JSONB

  // Section 10: Extra Uploads
  favicon_url?: string;
  letterhead_url?: string;
  watermark_url?: string;
}

export interface DashboardStats {
  totalInvoiced: number;
  totalReceived: number;
  totalOutstanding: number;
  activeProjects: number;
  pendingQuotations: number;
  recentInvoices: (Invoice & { client_name: string })[];
  upcomingProjects: (Project & { client_name: string })[];
}

export const SERVICE_TYPES = [
  'PHP Development',
  'React Development',
  'ERP Development',
  'CRM Development',
  'Custom Software Development',
  'Other',
] as const;

export const PROJECT_STATUSES = [
  'Not Started',
  'In Progress',
  'On Hold',
  'Completed',
  'Cancelled',
] as const;

export const QUOTATION_STATUSES = [
  'Draft',
  'Sent',
  'Accepted',
  'Rejected',
  'Expired',
] as const;
