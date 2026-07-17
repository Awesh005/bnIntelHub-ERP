import { Router } from 'express';
import PDFDocument from 'pdfkit';
import { supabase } from '../supabaseAdmin';

const router = Router();

// Helper: generate next quotation number
async function getNextQuotationNumber(): Promise<string> {
  const { data } = await supabase
    .from('quotations')
    .select('quotation_number')
    .order('quotation_number', { ascending: false })
    .limit(1);

  if (!data || data.length === 0) return 'QUO-0001';

  const lastNum = parseInt(data[0].quotation_number.replace('QUO-', ''), 10);
  return `QUO-${String(lastNum + 1).padStart(4, '0')}`;
}

// Helper: recalculate totals
function calculateTotals(items: any[], gst_percent: number, discount: number) {
  const subtotal = items.reduce(
    (sum: number, item: any) => sum + Number(item.quantity) * Number(item.rate),
    0
  );
  const gstAmount = subtotal * (Number(gst_percent) / 100);
  const total = subtotal + gstAmount - Number(discount);
  return { subtotal, total };
}

// GET /api/quotations — list with filters
router.get('/', async (req, res) => {
  const { client_id, status, search } = req.query;

  let query = supabase
    .from('quotations')
    .select('*, clients(name, company_name)')
    .order('created_at', { ascending: false });

  if (client_id) query = query.eq('client_id', client_id);
  if (status && status !== 'all') query = query.eq('status', status);

  const { data, error } = await query;
  if (error) return res.status(500).json({ error: error.message });

  let quotations = (data || []).map((q: any) => ({
    ...q,
    client_name: q.clients?.name || '',
    client_company: q.clients?.company_name || '',
  }));

  if (search) {
    const s = (search as string).toLowerCase();
    quotations = quotations.filter(
      (q: any) =>
        q.quotation_number.toLowerCase().includes(s) ||
        q.client_name.toLowerCase().includes(s)
    );
  }

  res.json(quotations);
});

// GET /api/quotations/:id — full quotation with items
router.get('/:id', async (req, res) => {
  const { data: quotation, error } = await supabase
    .from('quotations')
    .select('*, clients(name, company_name, email, phone, address, gstin)')
    .eq('id', req.params.id)
    .single();

  if (error) return res.status(404).json({ error: 'Quotation not found' });

  const { data: items } = await supabase
    .from('quotation_items')
    .select('*')
    .eq('quotation_id', req.params.id)
    .order('id');

  res.json({
    ...quotation,
    items: items || [],
    client_name: (quotation as any).clients?.name || '',
    client_company: (quotation as any).clients?.company_name || '',
    client_email: (quotation as any).clients?.email || '',
    client_phone: (quotation as any).clients?.phone || '',
    client_address: (quotation as any).clients?.address || '',
    client_gstin: (quotation as any).clients?.gstin || '',
  });
});

// POST /api/quotations — create
router.post('/', async (req, res) => {
  const { client_id, valid_till, gst_percent = 18, discount = 0, status = 'Draft', terms, items } = req.body;

  if (!client_id) return res.status(400).json({ error: 'Client is required' });
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'At least one line item is required' });
  }

  const quotation_number = await getNextQuotationNumber();
  const { subtotal, total } = calculateTotals(items, gst_percent, discount);

  const { data: quotation, error: quotationError } = await supabase
    .from('quotations')
    .insert({
      quotation_number,
      client_id,
      valid_till: valid_till || null,
      subtotal,
      gst_percent: Number(gst_percent),
      discount: Number(discount),
      total,
      status,
      terms,
    })
    .select()
    .single();

  if (quotationError) return res.status(500).json({ error: quotationError.message });

  const itemsToInsert = items.map((item: any) => ({
    quotation_id: quotation.id,
    description: item.description,
    service_type: item.service_type || '',
    quantity: Number(item.quantity),
    rate: Number(item.rate),
    amount: Number(item.quantity) * Number(item.rate),
  }));

  await supabase.from('quotation_items').insert(itemsToInsert);

  res.status(201).json({ ...quotation, items: itemsToInsert });
});

// PUT /api/quotations/:id — update
router.put('/:id', async (req, res) => {
  const { client_id, valid_till, gst_percent = 18, discount = 0, status, terms, items } = req.body;

  if (!client_id) return res.status(400).json({ error: 'Client is required' });
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'At least one line item is required' });
  }

  const { subtotal, total } = calculateTotals(items, gst_percent, discount);

  const { data: quotation, error } = await supabase
    .from('quotations')
    .update({
      client_id,
      valid_till,
      subtotal,
      gst_percent: Number(gst_percent),
      discount: Number(discount),
      total,
      status,
      terms,
    })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });

  // Replace items
  await supabase.from('quotation_items').delete().eq('quotation_id', req.params.id);

  const itemsToInsert = items.map((item: any) => ({
    quotation_id: req.params.id,
    description: item.description,
    service_type: item.service_type || '',
    quantity: Number(item.quantity),
    rate: Number(item.rate),
    amount: Number(item.quantity) * Number(item.rate),
  }));

  await supabase.from('quotation_items').insert(itemsToInsert);

  res.json({ ...quotation, items: itemsToInsert });
});

// DELETE /api/quotations/:id
router.delete('/:id', async (req, res) => {
  const { error } = await supabase.from('quotations').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// POST /api/quotations/:id/convert-to-invoice
router.post('/:id/convert-to-invoice', async (req, res) => {
  // Fetch quotation with items
  const { data: quotation, error: qError } = await supabase
    .from('quotations')
    .select('*')
    .eq('id', req.params.id)
    .single();

  if (qError || !quotation) return res.status(404).json({ error: 'Quotation not found' });

  const { data: qItems } = await supabase
    .from('quotation_items')
    .select('*')
    .eq('quotation_id', req.params.id);

  // Generate next invoice number
  const { data: lastInvoice } = await supabase
    .from('invoices')
    .select('invoice_number')
    .order('invoice_number', { ascending: false })
    .limit(1);

  let nextNum = 1;
  if (lastInvoice && lastInvoice.length > 0) {
    nextNum = parseInt(lastInvoice[0].invoice_number.replace('INV-', ''), 10) + 1;
  }
  const invoice_number = `INV-${String(nextNum).padStart(4, '0')}`;

  // Create invoice from quotation data
  const { data: invoice, error: invError } = await supabase
    .from('invoices')
    .insert({
      invoice_number,
      client_id: quotation.client_id,
      project_id: null,
      issue_date: new Date().toISOString().split('T')[0],
      due_date: quotation.valid_till,
      subtotal: quotation.subtotal,
      gst_percent: quotation.gst_percent,
      discount: quotation.discount,
      total: quotation.total,
      amount_paid: 0,
      status: 'Unpaid',
      notes: `Converted from Quotation ${quotation.quotation_number}`,
    })
    .select()
    .single();

  if (invError) return res.status(500).json({ error: invError.message });

  // Copy line items
  if (qItems && qItems.length > 0) {
    const invoiceItems = qItems.map((item: any) => ({
      invoice_id: invoice.id,
      description: item.description,
      service_type: item.service_type,
      quantity: item.quantity,
      rate: item.rate,
      amount: item.amount,
    }));
    await supabase.from('invoice_items').insert(invoiceItems);
  }

  // Update quotation status to Accepted
  await supabase.from('quotations').update({ status: 'Accepted' }).eq('id', req.params.id);

  res.status(201).json({ invoice_id: invoice.id, invoice });
});

// GET /api/quotations/:id/pdf — generate PDF
router.get('/:id/pdf', async (req, res) => {
  const { data: quotation, error } = await supabase
    .from('quotations')
    .select('*, clients(name, company_name, email, phone, address, gstin)')
    .eq('id', req.params.id)
    .single();

  if (error || !quotation) return res.status(404).json({ error: 'Quotation not found' });

  const { data: items } = await supabase
    .from('quotation_items')
    .select('*')
    .eq('quotation_id', req.params.id)
    .order('id');

  const { data: settings } = await supabase.from('settings').select('*').eq('id', 1).single();
  const company = settings || { company_name: 'BN IntelHub Pvt Ltd', address: '', email: '', phone: '', gstin: '' };
  const client = (quotation as any).clients || {};
  const lineItems = items || [];

  const doc = new PDFDocument({ margin: 50 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${quotation.quotation_number}.pdf"`);
  doc.pipe(res);

  // Header
  doc.rect(0, 0, 612, 12).fill('#0F172A');
  doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(24).text(company.company_name || 'Company', 50, 45);
  doc.font('Helvetica').fontSize(9).fillColor('#64748B')
    .text(company.address || '', 50, 75)
    .text(`Email: ${company.email || ''} | Phone: ${company.phone || ''}`, 50, 90);

  doc.fontSize(22).fillColor('#1E293B').text('QUOTATION', 340, 45, { align: 'right' });
  doc.fontSize(10).fillColor('#475569')
    .text(`Quotation No: ${quotation.quotation_number}`, 340, 75, { align: 'right' })
    .text(`Date: ${quotation.created_at?.split('T')[0] || ''}`, 340, 90, { align: 'right' })
    .text(`Valid Till: ${quotation.valid_till || ''}`, 340, 105, { align: 'right' });

  doc.moveTo(50, 130).lineTo(562, 130).stroke('#E2E8F0');

  // Client info
  doc.font('Helvetica-Bold').fontSize(12).fillColor('#0F172A').text('TO:', 50, 150);
  doc.font('Helvetica-Bold').fontSize(11).fillColor('#1E293B').text(client.name || '', 50, 170);
  if (client.company_name) doc.font('Helvetica').fontSize(10).fillColor('#475569').text(client.company_name, 50, 185);
  doc.font('Helvetica').fontSize(10).fillColor('#475569')
    .text(client.address || '', 50, client.company_name ? 200 : 185, { width: 250 });

  // Table
  const tableTop = 260;
  doc.rect(50, tableTop, 512, 25).fill('#F1F5F9');
  doc.fillColor('#0F172A').fontSize(10)
    .text('Description', 60, tableTop + 7, { width: 200 })
    .text('Type', 270, tableTop + 7, { width: 70 })
    .text('Qty', 340, tableTop + 7, { align: 'right', width: 30 })
    .text('Rate', 385, tableTop + 7, { align: 'right', width: 60 })
    .text('Amount', 470, tableTop + 7, { align: 'right', width: 80 });

  let currentY = tableTop + 25;
  lineItems.forEach((item: any) => {
    doc.fillColor('#334155').fontSize(10)
      .text(item.description || '', 60, currentY + 8, { width: 200 })
      .text(item.service_type || '', 270, currentY + 8, { width: 70 })
      .text(String(item.quantity), 340, currentY + 8, { align: 'right', width: 30 })
      .text(`₹${Number(item.rate).toLocaleString('en-IN')}`, 385, currentY + 8, { align: 'right', width: 60 })
      .text(`₹${Number(item.amount).toLocaleString('en-IN')}`, 470, currentY + 8, { align: 'right', width: 80 });
    doc.moveTo(50, currentY + 25).lineTo(562, currentY + 25).stroke('#F1F5F9');
    currentY += 25;
  });

  // Totals
  const totalsY = currentY + 20;
  const gstAmount = Number(quotation.subtotal) * (Number(quotation.gst_percent) / 100);
  doc.fontSize(10).fillColor('#475569')
    .text('Subtotal:', 340, totalsY)
    .text(`₹${Number(quotation.subtotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 470, totalsY, { align: 'right', width: 80 })
    .text(`GST (${quotation.gst_percent}%):`, 340, totalsY + 18)
    .text(`₹${gstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 470, totalsY + 18, { align: 'right', width: 80 })
    .text('Discount:', 340, totalsY + 36)
    .text(`₹${Number(quotation.discount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 470, totalsY + 36, { align: 'right', width: 80 });

  doc.rect(340, totalsY + 56, 222, 30).fill('#0F172A');
  doc.font('Helvetica-Bold').fontSize(12).fillColor('#FFFFFF')
    .text('TOTAL:', 350, totalsY + 65)
    .text(`₹${Number(quotation.total).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 470, totalsY + 65, { align: 'right', width: 80 });

  // Terms
  if (quotation.terms) {
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#0F172A').text('Terms & Conditions:', 50, totalsY + 100);
    doc.font('Helvetica').fontSize(9).fillColor('#64748B').text(quotation.terms, 50, totalsY + 115, { width: 260 });
  }

  doc.fontSize(8).fillColor('#94A3B8').text(
    `Generated by BN IntelHub ERP on ${new Date().toLocaleDateString('en-IN')}`,
    50, 720, { align: 'center', width: 512 }
  );

  doc.end();
});

export default router;
