import { Router } from 'express';
import { supabase } from '../supabaseAdmin.js';
import { generateInvoicePdf } from '../utils/pdfGenerator.js';

const router = Router();

// Helper: generate next invoice number
async function getNextInvoiceNumber(): Promise<string> {
  const { data } = await supabase
    .from('invoices')
    .select('invoice_number')
    .order('invoice_number', { ascending: false })
    .limit(1);

  if (!data || data.length === 0) return 'INV-0001';

  const lastNum = parseInt(data[0].invoice_number.replace('INV-', ''), 10);
  return `INV-${String(lastNum + 1).padStart(4, '0')}`;
}

// Helper: recalculate totals from line items
function calculateTotals(items: any[], gst_percent: number, discount: number) {
  const subtotal = items.reduce(
    (sum: number, item: any) => sum + Number(item.quantity) * Number(item.rate),
    0
  );
  const gstAmount = subtotal * (Number(gst_percent) / 100);
  const total = subtotal + gstAmount - Number(discount);
  return { subtotal, total };
}

// Helper: derive status from amounts
function deriveStatus(total: number, amount_paid: number): string {
  if (amount_paid >= total) return 'Paid';
  if (amount_paid > 0) return 'Partial';
  return 'Unpaid';
}

// GET /api/invoices — list with filters
router.get('/', async (req, res) => {
  const { client_id, status, search, date_from, date_to } = req.query;

  let query = supabase
    .from('invoices')
    .select('*, clients(name, company_name, email, gstin, address)')
    .order('created_at', { ascending: false });

  if (client_id) query = query.eq('client_id', client_id);
  if (status && status !== 'all') query = query.eq('status', status);
  if (date_from) query = query.gte('issue_date', date_from);
  if (date_to) query = query.lte('issue_date', date_to);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  let invoices = (data || []).map((inv: any) => ({
    ...inv,
    client_name: inv.clients?.name || '',
    client_company: inv.clients?.company_name || '',
    balance_due: Number(inv.total) - Number(inv.amount_paid),
  }));

  // Search filter (client-side since Supabase text search is limited)
  if (search) {
    const s = (search as string).toLowerCase();
    invoices = invoices.filter(
      (inv: any) =>
        inv.invoice_number.toLowerCase().includes(s) ||
        inv.client_name.toLowerCase().includes(s) ||
        inv.client_company?.toLowerCase().includes(s)
    );
  }

  res.json(invoices);
});

// GET /api/invoices/:id — full invoice with line items and client
router.get('/:id', async (req, res) => {
  // Check if this is a PDF request
  if (req.params.id.endsWith('.pdf')) {
    return res.status(400).json({ error: 'Use /api/invoices/:id/pdf for PDF generation' });
  }

  const { data: invoice, error } = await supabase
    .from('invoices')
    .select('*, clients(name, company_name, email, phone, address, gstin), projects(name)')
    .eq('id', req.params.id)
    .single();

  if (error) return res.status(404).json({ error: 'Invoice not found' });

  // Fetch line items
  const { data: items } = await supabase
    .from('invoice_items')
    .select('*')
    .eq('invoice_id', req.params.id)
    .order('id');

  res.json({
    ...invoice,
    items: items || [],
    client_name: (invoice as any).clients?.name || '',
    client_company: (invoice as any).clients?.company_name || '',
    client_email: (invoice as any).clients?.email || '',
    client_phone: (invoice as any).clients?.phone || '',
    client_address: (invoice as any).clients?.address || '',
    client_gstin: (invoice as any).clients?.gstin || '',
    project_name: (invoice as any).projects?.name || '',
    balance_due: Number(invoice.total) - Number(invoice.amount_paid),
  });
});

// POST /api/invoices — create with server-side number generation & totals
router.post('/', async (req, res) => {
  const { client_id, project_id, issue_date, due_date, gst_percent = 18, discount = 0, notes, items } = req.body;

  if (!client_id) return res.status(400).json({ error: 'Client is required' });
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'At least one line item is required' });
  }

  // Validate items
  for (const item of items) {
    if (Number(item.quantity) <= 0) return res.status(400).json({ error: 'Quantity must be positive' });
    if (Number(item.rate) < 0) return res.status(400).json({ error: 'Rate must be non-negative' });
  }

  const invoice_number = await getNextInvoiceNumber();
  const { subtotal, total } = calculateTotals(items, gst_percent, discount);

  // Insert invoice
  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices')
    .insert({
      invoice_number,
      client_id,
      project_id: project_id || null,
      issue_date: issue_date || new Date().toISOString().split('T')[0],
      due_date: due_date || null,
      subtotal,
      gst_percent: Number(gst_percent),
      discount: Number(discount),
      total,
      amount_paid: 0,
      status: 'Unpaid',
      notes,
    })
    .select()
    .single();

  if (invoiceError) return res.status(500).json({ error: invoiceError.message });

  // Insert line items
  const itemsToInsert = items.map((item: any) => ({
    invoice_id: invoice.id,
    description: item.description,
    service_type: item.service_type || '',
    quantity: Number(item.quantity),
    rate: Number(item.rate),
    amount: Number(item.quantity) * Number(item.rate),
  }));

  const { error: itemsError } = await supabase.from('invoice_items').insert(itemsToInsert);
  if (itemsError) return res.status(500).json({ error: itemsError.message });

  res.status(201).json({ ...invoice, items: itemsToInsert });
});

// PUT /api/invoices/:id — update with server-side recalculation
router.put('/:id', async (req, res) => {
  const { client_id, project_id, issue_date, due_date, gst_percent = 18, discount = 0, amount_paid, notes, items } = req.body;

  if (!client_id) return res.status(400).json({ error: 'Client is required' });
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'At least one line item is required' });
  }

  const { subtotal, total } = calculateTotals(items, gst_percent, discount);
  const paid = Number(amount_paid || 0);
  const status = deriveStatus(total, paid);

  // Update invoice
  const { data: invoice, error: invoiceError } = await supabase
    .from('invoices')
    .update({
      client_id,
      project_id: project_id || null,
      issue_date,
      due_date,
      subtotal,
      gst_percent: Number(gst_percent),
      discount: Number(discount),
      total,
      amount_paid: paid,
      status,
      notes,
    })
    .eq('id', req.params.id)
    .select()
    .single();

  if (invoiceError) return res.status(500).json({ error: invoiceError.message });

  // Replace line items: delete old, insert new
  await supabase.from('invoice_items').delete().eq('invoice_id', req.params.id);

  const itemsToInsert = items.map((item: any) => ({
    invoice_id: req.params.id,
    description: item.description,
    service_type: item.service_type || '',
    quantity: Number(item.quantity),
    rate: Number(item.rate),
    amount: Number(item.quantity) * Number(item.rate),
  }));

  await supabase.from('invoice_items').insert(itemsToInsert);

  res.json({ ...invoice, items: itemsToInsert });
});

// PATCH /api/invoices/:id/mark-paid — quick mark as paid
router.patch('/:id/mark-paid', async (req, res) => {
  // Get current invoice total
  const { data: invoice } = await supabase
    .from('invoices')
    .select('total')
    .eq('id', req.params.id)
    .single();

  if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

  const { data, error } = await supabase
    .from('invoices')
    .update({
      amount_paid: invoice.total,
      status: 'Paid',
    })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// DELETE /api/invoices/:id
router.delete('/:id', async (req, res) => {
  // invoice_items cascade on delete
  const { error } = await supabase.from('invoices').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// GET /api/invoices/:id/pdf — generate and stream PDF
router.get('/:id/pdf', async (req, res) => {
  const { data: invoice, error } = await supabase
    .from('invoices')
    .select('*, clients(name, company_name, email, phone, address, gstin)')
    .eq('id', req.params.id)
    .single();

  if (error || !invoice) return res.status(404).json({ error: 'Invoice not found' });

  const { data: items } = await supabase
    .from('invoice_items')
    .select('*')
    .eq('invoice_id', req.params.id)
    .order('id');

  // Fetch settings
  const { data: settings } = await supabase.from('settings').select('*').eq('id', 1).single();
  const company = settings || { company_name: 'BN IntelHub Pvt Ltd', address: '', email: '', phone: '', gstin: '', bank_account_name: '', bank_account_number: '', ifsc: '', bank_name: '' };

  const client = (invoice as any).clients || {};
  const lineItems = items || [];

  // Generate the redesigned PDF
  generateInvoicePdf(res, invoice, company, client, lineItems);
});

export default router;
