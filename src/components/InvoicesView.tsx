import React, { useEffect, useState } from 'react';
import { Plus, Search, Trash2, FileText, Download, CheckCircle, Edit, Loader2, X, AlertCircle } from 'lucide-react';
import { api } from '../lib/api';
import { Invoice, Client, Project, InvoiceItem, SERVICE_TYPES } from '../types';

export default function InvoicesView() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  const [showModal, setShowModal] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // Form state
  const [client_id, setClientId] = useState('');
  const [project_id, setProjectId] = useState('');
  const [issue_date, setIssueDate] = useState('');
  const [due_date, setDueDate] = useState('');
  const [gst_percent, setGstPercent] = useState(18);
  const [discount, setDiscount] = useState(0);
  const [amount_paid, setAmountPaid] = useState(0);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<InvoiceItem[]>([]);

  useEffect(() => { loadData(); }, [statusFilter]);
  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(null), 3000); return () => clearTimeout(t); } }, [toast]);

  async function loadData() {
    try {
      setLoading(true);
      const [invData, clientData, projData] = await Promise.all([
        api.getInvoices(statusFilter !== 'all' ? { status: statusFilter } : {}),
        api.getClients(),
        api.getProjects()
      ]);
      setInvoices(invData);
      setClients(clientData);
      setProjects(projData);
    } catch {
      setToast({ msg: 'Failed to load invoices', type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditingInvoice(null);
    setClientId('');
    setProjectId('');
    setIssueDate(new Date().toISOString().split('T')[0]);
    setDueDate('');
    setGstPercent(18);
    setDiscount(0);
    setAmountPaid(0);
    setNotes('');
    setItems([{ description: '', service_type: 'Other', quantity: 1, rate: 0, amount: 0 }]);
    setShowModal(true);
  }

  async function openEdit(inv: Invoice) {
    try {
      setToast({ msg: 'Loading invoice details...', type: 'success' });
      const fullInvoice = await api.getInvoice(inv.id); // fetch items
      setToast(null);
      setEditingInvoice(fullInvoice);
      setClientId(fullInvoice.client_id || '');
      setProjectId(fullInvoice.project_id || '');
      setIssueDate(fullInvoice.issue_date || '');
      setDueDate(fullInvoice.due_date || '');
      setGstPercent(fullInvoice.gst_percent);
      setDiscount(fullInvoice.discount);
      setAmountPaid(fullInvoice.amount_paid);
      setNotes(fullInvoice.notes || '');
      setItems(fullInvoice.items || []);
      setShowModal(true);
    } catch {
      setToast({ msg: 'Failed to fetch full invoice details', type: 'error' });
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!client_id) return setToast({ msg: 'Please select a client', type: 'error' });
    if (items.length === 0) return setToast({ msg: 'Add at least one line item', type: 'error' });
    
    // Ensure all items have descriptions and valid numbers
    if (items.some(i => !i.description.trim() || Number(i.quantity) <= 0 || Number(i.rate) < 0)) {
      return setToast({ msg: 'Please fill out all line item details correctly', type: 'error' });
    }

    setSaving(true);
    const payload = {
      client_id, project_id, issue_date, due_date, gst_percent, discount, amount_paid, notes, items
    };

    try {
      if (editingInvoice) {
        await api.updateInvoice(editingInvoice.id, payload);
        setToast({ msg: 'Invoice updated', type: 'success' });
      } else {
        await api.createInvoice(payload);
        setToast({ msg: 'Invoice created', type: 'success' });
      }
      setShowModal(false);
      loadData();
    } catch (err: any) {
      setToast({ msg: err.response?.data?.error || 'Save failed', type: 'error' });
    } finally {
      setSaving(false);
    }
  }

  async function markPaid(id: string) {
    try {
      await api.markInvoicePaid(id);
      setToast({ msg: 'Marked as paid', type: 'success' });
      loadData();
    } catch { setToast({ msg: 'Failed to update status', type: 'error' }); }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this invoice?')) return;
    try {
      await api.deleteInvoice(id);
      setToast({ msg: 'Invoice deleted', type: 'success' });
      loadData();
    } catch { setToast({ msg: 'Delete failed', type: 'error' }); }
  }

  function handleDownload(inv: Invoice) {
    api.downloadPdf(api.getInvoicePdfUrl(inv.id), `Invoice_${inv.invoice_number}.pdf`);
  }

  const filtered = Array.isArray(invoices) ? invoices.filter(i =>
    (i.invoice_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (i.client_name || '').toLowerCase().includes(searchTerm.toLowerCase())
  ) : [];

  const statusBadge = (status: string) => {
    if (status === 'Paid') return 'bg-emerald-100 text-emerald-700';
    if (status === 'Partial') return 'bg-amber-100 text-amber-700';
    return 'bg-red-100 text-red-700';
  };

  return (
    <div className="space-y-6">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white ${toast.type === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`}>
          {toast.msg}
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Invoices</h1>
          <p className="text-slate-500 text-sm mt-1">Manage billing and payments</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
          <Plus size={16} /> Create Invoice
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="Search invoices..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none">
          <option value="all">All Statuses</option>
          <option value="Paid">Paid</option>
          <option value="Partial">Partial</option>
          <option value="Unpaid">Unpaid</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 size={28} className="animate-spin text-blue-600" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <FileText size={40} className="mx-auto mb-3 text-slate-300" />
            <p>No invoices found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-500 text-xs uppercase tracking-wider border-b border-slate-100 bg-slate-50/50">
                  <th className="px-6 py-3 text-left font-medium">Invoice #</th>
                  <th className="px-6 py-3 text-left font-medium">Client</th>
                  <th className="px-6 py-3 text-left font-medium">Date</th>
                  <th className="px-6 py-3 text-right font-medium">Total</th>
                  <th className="px-6 py-3 text-center font-medium">Status</th>
                  <th className="px-6 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((inv) => (
                  <tr key={inv.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="px-6 py-3.5 font-semibold text-slate-800">{inv.invoice_number}</td>
                    <td className="px-6 py-3.5 text-slate-600">{inv.client_name}</td>
                    <td className="px-6 py-3.5 text-slate-600">{inv.issue_date}</td>
                    <td className="px-6 py-3.5 text-right font-medium">
                      <div>₹{Number(inv.total).toLocaleString('en-IN')}</div>
                      {inv.balance_due && inv.balance_due > 0 && (
                        <div className="text-xs text-red-500">Due: ₹{Number(inv.balance_due).toLocaleString('en-IN')}</div>
                      )}
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusBadge(inv.status)}`}>{inv.status}</span>
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {inv.status !== 'Paid' && (
                          <button onClick={() => markPaid(inv.id)} title="Mark as Paid" className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"><CheckCircle size={15} /></button>
                        )}
                        <button onClick={() => handleDownload(inv)} title="Download PDF" className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"><Download size={15} /></button>
                        <button onClick={() => openEdit(inv)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"><Edit size={15} /></button>
                        <button onClick={() => handleDelete(inv.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
              <h2 className="text-lg font-semibold text-slate-900">{editingInvoice ? `Edit ${editingInvoice.invoice_number}` : 'Create Invoice'}</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
            </div>
            
            <div className="overflow-y-auto p-6 flex-1 bg-slate-50/50">
              <form id="invoice-form" onSubmit={handleSave} className="space-y-8">
                {/* Details Section */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                  <h3 className="font-semibold text-slate-800 border-b border-slate-100 pb-2">Invoice Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Client *</label>
                      <select value={client_id} onChange={e => setClientId(e.target.value)} required className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">
                        <option value="">Select Client...</option>
                        {Array.isArray(clients) && clients.map(c => <option key={c.id} value={c.id}>{c.name} {c.company_name ? `(${c.company_name})` : ''}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Project</label>
                      <select value={project_id} onChange={e => setProjectId(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">
                        <option value="">No Project</option>
                        {Array.isArray(projects) && projects.filter(p => !client_id || p.client_id === client_id).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Issue Date</label>
                      <input type="date" value={issue_date} onChange={e => setIssueDate(e.target.value)} required className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">Due Date</label>
                      <input type="date" value={due_date} onChange={e => setDueDate(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                    </div>
                  </div>
                </div>

                {/* Line Items Section */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-4">
                    <h3 className="font-semibold text-slate-800">Line Items *</h3>
                    <button type="button" onClick={() => setItems([...items, { description: '', service_type: 'Other', quantity: 1, rate: 0, amount: 0 }])} className="text-sm text-blue-600 font-medium hover:text-blue-700">+ Add Item</button>
                  </div>
                  
                  <div className="space-y-3">
                    {items.map((item, index) => (
                      <div key={index} className="flex flex-col md:flex-row gap-3 items-start md:items-center bg-slate-50 p-3 rounded-lg border border-slate-100">
                        <div className="flex-1 w-full">
                          <input type="text" placeholder="Description" required value={item.description} onChange={e => {
                            const newItems = [...items];
                            newItems[index].description = e.target.value;
                            setItems(newItems);
                          }} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                        </div>
                        <div className="w-full md:w-40">
                          <select value={item.service_type} onChange={e => {
                            const newItems = [...items];
                            newItems[index].service_type = e.target.value;
                            setItems(newItems);
                          }} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">
                            {SERVICE_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </div>
                        <div className="w-full md:w-24">
                          <input type="number" min="0.1" step="0.1" placeholder="Qty" required value={item.quantity} onChange={e => {
                            const newItems = [...items];
                            newItems[index].quantity = Number(e.target.value);
                            setItems(newItems);
                          }} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                        </div>
                        <div className="w-full md:w-32">
                          <input type="number" min="0" step="0.01" placeholder="Rate (₹)" required value={item.rate} onChange={e => {
                            const newItems = [...items];
                            newItems[index].rate = Number(e.target.value);
                            setItems(newItems);
                          }} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                        </div>
                        <div className="w-full md:w-32 font-medium text-slate-700 text-right md:pr-4 pt-2 md:pt-0">
                          ₹{Number(item.quantity * item.rate).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>
                        {items.length > 1 && (
                          <button type="button" onClick={() => setItems(items.filter((_, i) => i !== index))} className="p-2 text-red-400 hover:bg-red-50 rounded-lg ml-auto md:ml-0">
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  
                  {/* Totals Calculation */}
                  <div className="mt-6 flex flex-col items-end border-t border-slate-100 pt-4 space-y-3 text-sm">
                    <div className="flex items-center w-full max-w-xs justify-between">
                      <span className="text-slate-500">Subtotal:</span>
                      <span className="font-medium text-slate-800">
                        ₹{items.reduce((sum, item) => sum + (item.quantity * item.rate), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="flex items-center w-full max-w-xs justify-between">
                      <span className="text-slate-500">GST (%):</span>
                      <input type="number" min="0" max="100" value={gst_percent} onChange={e => setGstPercent(Number(e.target.value))} className="w-20 px-2 py-1 border border-slate-300 rounded-md text-right text-sm" />
                    </div>
                    <div className="flex items-center w-full max-w-xs justify-between">
                      <span className="text-slate-500">Discount (₹):</span>
                      <input type="number" min="0" value={discount} onChange={e => setDiscount(Number(e.target.value))} className="w-24 px-2 py-1 border border-slate-300 rounded-md text-right text-sm" />
                    </div>
                    {editingInvoice && (
                      <div className="flex items-center w-full max-w-xs justify-between">
                        <span className="text-slate-500">Amount Paid (₹):</span>
                        <input type="number" min="0" value={amount_paid} onChange={e => setAmountPaid(Number(e.target.value))} className="w-24 px-2 py-1 border border-slate-300 rounded-md text-right text-sm" />
                      </div>
                    )}
                    
                    {(() => {
                      const sub = items.reduce((sum, item) => sum + (item.quantity * item.rate), 0);
                      const gst = sub * (gst_percent / 100);
                      const total = sub + gst - discount;
                      return (
                        <div className="flex items-center w-full max-w-xs justify-between pt-2 border-t border-slate-200 mt-2">
                          <span className="font-bold text-slate-800">Total:</span>
                          <span className="font-bold text-lg text-blue-600">₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Notes / Terms</label>
                  <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm resize-none" placeholder="Any additional notes or payment terms..." />
                </div>
              </form>
            </div>

            <div className="p-4 border-t border-slate-100 flex justify-end gap-3 shrink-0 bg-slate-50 rounded-b-2xl">
              <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
              <button type="submit" form="invoice-form" disabled={saving} className="px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {saving ? 'Saving...' : editingInvoice ? 'Update Invoice' : 'Create Invoice'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
