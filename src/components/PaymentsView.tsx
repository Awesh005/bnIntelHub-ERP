/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { 
  Plus, 
  Search, 
  CreditCard, 
  Calendar, 
  TrendingUp, 
  Receipt,
  FileCheck,
  PlusCircle,
  FileText
} from 'lucide-react';
import { api } from '../lib/api';
import { Payment, Invoice } from '../types';

interface PaymentsViewProps {
  onRefreshStats: () => void;
}

export default function PaymentsView({ onRefreshStats }: PaymentsViewProps) {
  const [payments, setPayments] = useState<(Payment & { invoiceNumber: string; clientName: string })[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currency, setCurrency] = useState('USD');

  // Modal State
  const [showModal, setShowModal] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    invoiceId: '',
    amount: 0,
    date: '',
    paymentMethod: 'bank_transfer' as 'bank_transfer' | 'stripe' | 'cash' | 'paypal',
    referenceId: '',
    notes: ''
  });

  async function loadData() {
    try {
      setLoading(true);
      const [paymentsData, invoicesData, settings] = await Promise.all([
        api.getPayments() as Promise<(Payment & { invoiceNumber: string; clientName: string })[]>,
        api.getInvoices(),
        api.getSettings()
      ]);
      setPayments(paymentsData);
      setInvoices(invoicesData);
      setCurrency(settings.currency || 'USD');
    } catch (err) {
      console.error('Failed to load transaction payments records', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // Filter outstanding/unpaid invoices to display in payment selection
  const unpaidInvoices = invoices.filter(i => i.status === 'sent' || i.status === 'overdue');

  const handleOpenAddModal = () => {
    const defaultInvoice = unpaidInvoices[0];
    setFormData({
      invoiceId: defaultInvoice ? defaultInvoice.id : '',
      amount: defaultInvoice ? defaultInvoice.total : 0,
      date: new Date().toISOString().substring(0, 10),
      paymentMethod: 'bank_transfer',
      referenceId: 'TXN-' + Math.floor(100000 + Math.random() * 900000),
      notes: 'Received payment in full. Confirmed bank settlement.'
    });
    setShowModal(true);
  };

  // Adjust amount automatically when invoice selection changes
  const handleInvoiceChange = (invId: string) => {
    const selectedInv = invoices.find(i => i.id === invId);
    setFormData({
      ...formData,
      invoiceId: invId,
      amount: selectedInv ? selectedInv.total : 0
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.invoiceId || formData.amount <= 0 || !formData.date) {
      alert('Linked Invoice, non-zero Amount, and Date are required.');
      return;
    }
    try {
      await api.createPayment(formData);
      setShowModal(false);
      loadData();
      onRefreshStats();
    } catch (err) {
      console.error('Failed to register payment receipt', err);
    }
  };

  const filteredPayments = payments.filter(p => {
    return p.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) || 
           p.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
           p.referenceId.toLowerCase().includes(searchTerm.toLowerCase()) ||
           p.paymentMethod.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Receipt Payments Ledger</h1>
          <p className="text-slate-500 text-sm mt-1">Audit billing cash inflows, register transaction receipts, and settle outstanding balances.</p>
        </div>
        <button 
          id="btn-add-payment"
          onClick={handleOpenAddModal}
          disabled={unpaidInvoices.length === 0}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-45 disabled:cursor-not-allowed text-white font-medium text-sm px-4 py-2.5 rounded-lg flex items-center space-x-2 self-start shadow-md shadow-blue-600/10 hover:shadow-lg transition-all"
        >
          <Plus size={16} />
          <span>Record Receipt Payment</span>
        </button>
      </div>

      {/* Stats summary banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-emerald-50/50 border border-emerald-100 p-5 rounded-xl flex items-center space-x-4">
          <div className="p-3 rounded-lg bg-emerald-500 text-white"><TrendingUp size={18} /></div>
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Settled Cash</p>
            <p className="text-lg font-extrabold text-slate-800 mt-0.5">
              {currency} {payments.reduce((acc, p) => acc + p.amount, 0).toLocaleString()}
            </p>
          </div>
        </div>
        <div className="bg-blue-50/50 border border-blue-100 p-5 rounded-xl flex items-center space-x-4">
          <div className="p-3 rounded-lg bg-blue-500 text-white"><Receipt size={18} /></div>
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Payments Collected</p>
            <p className="text-lg font-extrabold text-slate-800 mt-0.5">{payments.length} Settlements</p>
          </div>
        </div>
        <div className="bg-amber-50/50 border border-amber-100 p-5 rounded-xl flex items-center space-x-4">
          <div className="p-3 rounded-lg bg-amber-500 text-white"><FileCheck size={18} /></div>
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Pending Invoices</p>
            <p className="text-lg font-extrabold text-slate-800 mt-0.5">{unpaidInvoices.length} Awaiting</p>
          </div>
        </div>
      </div>

      {/* Filter and search directory */}
      <div className="flex flex-col md:flex-row md:items-center gap-4 bg-white border border-slate-100 p-4 rounded-xl shadow-sm">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            id="search-payments-input"
            type="text" 
            placeholder="Search payments by reference ID, invoice code, client partner, method..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 pl-10 pr-4 py-2 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* Transaction Ledger list */}
      {loading ? (
        <div className="space-y-4 animate-pulse">
          {[1, 2].map((i) => (
            <div key={i} className="h-16 bg-slate-200 rounded-xl"></div>
          ))}
        </div>
      ) : filteredPayments.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-xl p-12 text-center shadow-sm">
          <CreditCard className="mx-auto text-slate-300 mb-4" size={48} />
          <h3 className="font-bold text-slate-700 text-lg">No Payments Recorded</h3>
          <p className="text-slate-400 text-sm mt-1">Settle outstanding invoices to register transactions.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-xs font-bold uppercase tracking-wider text-slate-400">
                  <th className="p-4 pl-6">Transaction Ref ID</th>
                  <th className="p-4">Linked Invoice</th>
                  <th className="p-4">Client / Partner</th>
                  <th className="p-4">Settle Date</th>
                  <th className="p-4">Channel Mode</th>
                  <th className="p-4 text-right pr-6">Settlement Amount</th>
                </tr>
              </thead>
              <tbody className="text-slate-700 text-sm divide-y divide-slate-100">
                {filteredPayments.map((pay) => (
                  <tr key={pay.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 pl-6 font-mono font-bold text-slate-900">{pay.referenceId}</td>
                    <td className="p-4 font-semibold text-blue-600 hover:underline cursor-pointer">{pay.invoiceNumber}</td>
                    <td className="p-4 font-semibold text-slate-800">{pay.clientName}</td>
                    <td className="p-4 text-slate-500 font-medium">
                      <div className="flex items-center space-x-1">
                        <Calendar size={13} className="text-slate-400" />
                        <span>{pay.date}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest bg-slate-100 text-slate-600 border border-slate-200">
                        {pay.paymentMethod.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-4 text-right pr-6 font-mono font-bold text-emerald-600">
                      + {currency} {pay.amount.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Record payment modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-100 w-full max-w-lg overflow-hidden animate-in fade-in-50 duration-200">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-base tracking-wide">
                Record Invoice Cash Settlement
              </h3>
              <button 
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white focus:outline-none"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Select Awaiting Invoice</label>
                <select 
                  id="payment-form-invoice"
                  required
                  value={formData.invoiceId}
                  onChange={(e) => handleInvoiceChange(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white"
                >
                  <option value="" disabled>-- Choose Unpaid Invoice --</option>
                  {unpaidInvoices.map(i => (
                    <option key={i.id} value={i.id}>{i.invoiceNumber} ({currency} {i.total.toLocaleString()})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Payment Amount ({currency})</label>
                  <input 
                    id="payment-form-amount"
                    type="number"
                    required
                    min="1"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Settlement Date</label>
                  <input 
                    id="payment-form-date"
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Payment Method / Channel</label>
                  <select 
                    id="payment-form-method"
                    value={formData.paymentMethod}
                    onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white"
                  >
                    <option value="bank_transfer">Direct Wire Bank Transfer</option>
                    <option value="stripe">Stripe Gateway / CC</option>
                    <option value="paypal">PayPal Merchant Hub</option>
                    <option value="cash">Direct Cash / Vault</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Transaction Reference ID</label>
                  <input 
                    id="payment-form-ref"
                    type="text"
                    required
                    value={formData.referenceId}
                    onChange={(e) => setFormData({ ...formData, referenceId: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white font-mono"
                    placeholder="TXN-902341908"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Receipt Notes / Reference Comments</label>
                <textarea 
                  id="payment-form-notes"
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white"
                  placeholder="Enter comments about check numbers, sender banking details..."
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100 mt-6">
                <button 
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm px-4 py-2.5 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button 
                  id="payment-form-submit"
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-5 py-2.5 rounded-lg font-medium shadow-md shadow-blue-600/10 transition-colors"
                >
                  Register Settlement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
