import React, { useEffect, useState } from 'react';
import { Plus, Search, Trash2, FileSignature, Download, Edit, Loader2, X, RefreshCw } from 'lucide-react';
import { api } from '../lib/api';
import { Quotation, Client, QuotationItem, SERVICE_TYPES, QUOTATION_STATUSES } from '../types';

export default function QuotationsView() {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  const [showModal, setShowModal] = useState(false);
  const [editingQuotation, setEditingQuotation] = useState<Quotation | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  // Form state
  const [client_id, setClientId] = useState('');
  const [valid_till, setValidTill] = useState('');
  const [gst_percent, setGstPercent] = useState(18);
  const [discount, setDiscount] = useState(0);
  const [status, setStatus] = useState('Draft');
  const [terms, setTerms] = useState('');
  const [items, setItems] = useState<QuotationItem[]>([]);

  useEffect(() => { loadData(); }, [statusFilter]);
  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(null), 3000); return () => clearTimeout(t); } }, [toast]);

  async function loadData() {
    try {
      setLoading(true);
      const [quoData, clientData] = await Promise.all([
        api.getQuotations(statusFilter !== 'all' ? { status: statusFilter } : {}),
        api.getClients()
      ]);
      setQuotations(quoData);
      setClients(clientData);
    } catch {
      setToast({ msg: 'Failed to load quotations', type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditingQuotation(null);
    setClientId('');
    
    const d = new Date();
    d.setDate(d.getDate() + 15);
    setValidTill(d.toISOString().split('T')[0]);
    
    setGstPercent(18);
    setDiscount(0);
    setStatus('Draft');
    setTerms('1. This quotation is valid for 15 days.\n2. 50% advance payment required.');
    setItems([{ description: '', service_type: 'Other', quantity: 1, rate: 0, amount: 0 }]);
    setShowModal(true);
  }

  async function openEdit(q: Quotation) {
    try {
      setToast({ msg: 'Loading quotation details...', type: 'success' });
      const full = await api.getQuotation(q.id);
      setToast(null);
      setEditingQuotation(full);
      setClientId(full.client_id || '');
      setValidTill(full.valid_till || '');
      setGstPercent(full.gst_percent);
      setDiscount(full.discount);
      setStatus(full.status);
      setTerms(full.terms || '');
      setItems(full.items || []);
      setShowModal(true);
    } catch {
      setToast({ msg: 'Failed to fetch details', type: 'error' });
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!client_id) return setToast({ msg: 'Please select a client', type: 'error' });
    if (items.length === 0) return setToast({ msg: 'Add at least one line item', type: 'error' });
    if (items.some(i => !i.description.trim() || Number(i.quantity) <= 0 || Number(i.rate) < 0)) {
      return setToast({ msg: 'Please fill out all line item details correctly', type: 'error' });
    }

    setSaving(true);
    const payload = { client_id, valid_till, gst_percent, discount, status, terms, items };

    try {
      if (editingQuotation) {
        await api.updateQuotation(editingQuotation.id, payload);
        setToast({ msg: 'Quotation updated', type: 'success' });
      } else {
        await api.createQuotation(payload);
        setToast({ msg: 'Quotation created', type: 'success' });
      }
      setShowModal(false);
      loadData();
    } catch (err: any) {
      setToast({ msg: err.response?.data?.error || 'Save failed', type: 'error' });
    } finally {
      setSaving(false);
    }
  }

  async function convertToInvoice(id: string) {
    if (!confirm('Convert this quotation into an invoice?')) return;
    try {
      await api.convertQuotationToInvoice(id);
      setToast({ msg: 'Converted to Invoice successfully!', type: 'success' });
      loadData();
    } catch {
      setToast({ msg: 'Conversion failed', type: 'error' });
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this quotation?')) return;
    try {
      await api.deleteQuotation(id);
      setToast({ msg: 'Quotation deleted', type: 'success' });
      loadData();
    } catch { setToast({ msg: 'Delete failed', type: 'error' }); }
  }

  function handleDownload(q: Quotation) {
    api.downloadPdf(api.getQuotationPdfUrl(q.id), `Quotation_${q.quotation_number}.pdf`);
  }

  const filtered = Array.isArray(quotations) ? quotations.filter(q =>
    (q.quotation_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (q.client_name || '').toLowerCase().includes(searchTerm.toLowerCase())
  ) : [];

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      'Draft': 'bg-slate-100 text-slate-700',
      'Sent': 'bg-blue-100 text-blue-700',
      'Accepted': 'bg-emerald-100 text-emerald-700',
      'Rejected': 'bg-red-100 text-red-700',
      'Expired': 'bg-amber-100 text-amber-700',
    };
    return colors[status] || 'bg-slate-100 text-slate-700';
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
          <h1 className="text-2xl font-bold text-slate-900">Quotations</h1>
          <p className="text-slate-500 text-sm mt-1">Create and manage client estimates</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
          <Plus size={16} /> Create Quotation
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder="Search quotations..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 outline-none">
          <option value="all">All Statuses</option>
          {QUOTATION_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 size={28} className="animate-spin text-blue-600" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <FileSignature size={40} className="mx-auto mb-3 text-slate-300" />
            <p>No quotations found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-500 text-xs uppercase tracking-wider border-b border-slate-100 bg-slate-50/50">
                  <th className="px-6 py-3 text-left font-medium">Quotation #</th>
                  <th className="px-6 py-3 text-left font-medium">Client</th>
                  <th className="px-6 py-3 text-left font-medium">Valid Till</th>
                  <th className="px-6 py-3 text-right font-medium">Total</th>
                  <th className="px-6 py-3 text-center font-medium">Status</th>
                  <th className="px-6 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((q) => (
                  <tr key={q.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                    <td className="px-6 py-3.5 font-semibold text-slate-800">{q.quotation_number}</td>
                    <td className="px-6 py-3.5 text-slate-600">{q.client_name}</td>
                    <td className="px-6 py-3.5 text-slate-600">{q.valid_till}</td>
                    <td className="px-6 py-3.5 text-right font-medium text-slate-800">
                      ₹{Number(q.total).toLocaleString('en-IN')}
                    </td>
                    <td className="px-6 py-3.5 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusBadge(q.status)}`}>{q.status}</span>
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {q.status !== 'Accepted' && (
                          <button onClick={() => convertToInvoice(q.id)} title="Convert to Invoice" className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors"><RefreshCw size={15} /></button>
                        )}
                        <button onClick={() => handleDownload(q)} title="Download PDF" className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"><Download size={15} /></button>
                        <button onClick={() => openEdit(q)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"><Edit size={15} /></button>
                        <button onClick={() => handleDelete(q.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"><Trash2 size={15} /></button>
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
              <h2 className="text-lg font-semibold text-slate-900">{editingQuotation ? `Edit ${editingQuotation.quotation_number}` : 'Create Quotation'}</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
            </div>
            
            <div className="overflow-y-auto p-6 flex-1 bg-slate-50/50">
              <form id="quotation-form" onSubmit={handleSave} className="space-y-8">
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Client *</label>
                    <select value={client_id} onChange={e => setClientId(e.target.value)} required className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">
                      <option value="">Select Client...</option>
                      {Array.isArray(clients) && clients.map(c => <option key={c.id} value={c.id}>{c.name} {c.company_name ? `(${c.company_name})` : ''}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Valid Till</label>
                    <input type="date" value={valid_till} onChange={e => setValidTill(e.target.value)} required className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                    <select value={status} onChange={e => setStatus(e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">
                      {QUOTATION_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>

                {/* Line Items (Reused structure from InvoicesView) */}
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-4">
                    <h3 className="font-semibold text-slate-800">Line Items *</h3>
                    <button type="button" onClick={() => setItems([...items, { description: '', service_type: 'Other', quantity: 1, rate: 0, amount: 0 }])} className="text-sm text-blue-600 font-medium">+ Add Item</button>
                  </div>
                  <div className="space-y-3">
                    {items.map((item, index) => (
                      <div key={index} className="flex flex-col md:flex-row gap-3 items-start md:items-center bg-slate-50 p-3 rounded-lg border border-slate-100">
                        <div className="flex-1 w-full"><input type="text" placeholder="Description" required value={item.description} onChange={e => { const n = [...items]; n[index].description = e.target.value; setItems(n); }} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" /></div>
                        <div className="w-full md:w-40"><select value={item.service_type} onChange={e => { const n = [...items]; n[index].service_type = e.target.value; setItems(n); }} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">{SERVICE_TYPES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                        <div className="w-full md:w-24"><input type="number" min="0.1" step="0.1" placeholder="Qty" required value={item.quantity} onChange={e => { const n = [...items]; n[index].quantity = Number(e.target.value); setItems(n); }} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" /></div>
                        <div className="w-full md:w-32"><input type="number" min="0" step="0.01" placeholder="Rate (₹)" required value={item.rate} onChange={e => { const n = [...items]; n[index].rate = Number(e.target.value); setItems(n); }} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" /></div>
                        {items.length > 1 && <button type="button" onClick={() => setItems(items.filter((_, i) => i !== index))} className="p-2 text-red-400 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>}
                      </div>
                    ))}
                  </div>
                  
                  <div className="mt-6 flex flex-col items-end border-t border-slate-100 pt-4 space-y-3 text-sm">
                    <div className="flex items-center w-full max-w-xs justify-between"><span className="text-slate-500">Subtotal:</span><span className="font-medium text-slate-800">₹{items.reduce((sum, item) => sum + (item.quantity * item.rate), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>
                    <div className="flex items-center w-full max-w-xs justify-between"><span className="text-slate-500">GST (%):</span><input type="number" min="0" max="100" value={gst_percent} onChange={e => setGstPercent(Number(e.target.value))} className="w-20 px-2 py-1 border border-slate-300 rounded-md text-right" /></div>
                    <div className="flex items-center w-full max-w-xs justify-between"><span className="text-slate-500">Discount (₹):</span><input type="number" min="0" value={discount} onChange={e => setDiscount(Number(e.target.value))} className="w-24 px-2 py-1 border border-slate-300 rounded-md text-right" /></div>
                    
                    {(() => {
                      const sub = items.reduce((sum, item) => sum + (item.quantity * item.rate), 0);
                      const total = sub + (sub * (gst_percent / 100)) - discount;
                      return <div className="flex items-center w-full max-w-xs justify-between pt-2 border-t border-slate-200 mt-2"><span className="font-bold">Total:</span><span className="font-bold text-lg text-blue-600">₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span></div>;
                    })()}
                  </div>
                </div>

                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Terms & Conditions</label>
                  <textarea value={terms} onChange={e => setTerms(e.target.value)} rows={4} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm resize-none" />
                </div>
              </form>
            </div>

            <div className="p-4 border-t border-slate-100 flex justify-end gap-3 shrink-0 bg-slate-50 rounded-b-2xl">
              <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50">Cancel</button>
              <button type="submit" form="quotation-form" disabled={saving} className="px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {saving ? 'Saving...' : editingQuotation ? 'Update Quotation' : 'Create Quotation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
