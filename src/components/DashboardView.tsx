import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { DashboardStats } from '../types';
import {
  IndianRupee,
  TrendingUp,
  TrendingDown,
  Briefcase,
  FileSignature,
  Calendar,
  ArrowRight,
  Loader2,
} from 'lucide-react';

const formatCurrency = (val: number) =>
  `₹${Number(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function DashboardView() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    try {
      setLoading(true);
      const data = await api.getDashboardStats();
      setStats(data);
    } catch (e) {
      console.error('Failed to load dashboard stats', e);
    } finally {
      setLoading(false);
    }
  }

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-blue-600" />
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Invoiced',
      value: formatCurrency(stats.totalInvoiced),
      icon: IndianRupee,
      color: 'bg-blue-600',
      iconBg: 'bg-blue-100 text-blue-600',
    },
    {
      title: 'Total Received',
      value: formatCurrency(stats.totalReceived),
      icon: TrendingUp,
      color: 'bg-emerald-600',
      iconBg: 'bg-emerald-100 text-emerald-600',
    },
    {
      title: 'Total Outstanding',
      value: formatCurrency(stats.totalOutstanding),
      icon: TrendingDown,
      color: 'bg-amber-600',
      iconBg: 'bg-amber-100 text-amber-600',
    },
    {
      title: 'Active Projects',
      value: String(stats.activeProjects),
      icon: Briefcase,
      color: 'bg-violet-600',
      iconBg: 'bg-violet-100 text-violet-600',
    },
    {
      title: 'Pending Quotations',
      value: String(stats.pendingQuotations),
      icon: FileSignature,
      color: 'bg-rose-600',
      iconBg: 'bg-rose-100 text-rose-600',
    },
  ];

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      Paid: 'bg-emerald-100 text-emerald-700',
      Partial: 'bg-amber-100 text-amber-700',
      Unpaid: 'bg-red-100 text-red-700',
    };
    return colors[status] || 'bg-slate-100 text-slate-700';
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">Overview of your business at a glance</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${card.iconBg}`}>
                  <Icon size={20} />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900">{card.value}</p>
              <p className="text-xs text-slate-500 mt-1 font-medium">{card.title}</p>
            </div>
          );
        })}
      </div>

      {/* Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Invoices */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900">Recent Invoices</h2>
            <button
              onClick={() => navigate('/invoices')}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
            >
              View all <ArrowRight size={12} />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-500 text-xs uppercase tracking-wider border-b border-slate-50">
                  <th className="px-6 py-3 text-left font-medium">Invoice</th>
                  <th className="px-6 py-3 text-left font-medium">Client</th>
                  <th className="px-6 py-3 text-right font-medium">Total</th>
                  <th className="px-6 py-3 text-center font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {!stats.recentInvoices || stats.recentInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-slate-400">
                      No invoices yet
                    </td>
                  </tr>
                ) : (
                  stats.recentInvoices.map((inv: any) => (
                    <tr key={inv.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-3 font-medium text-slate-800">{inv.invoice_number}</td>
                      <td className="px-6 py-3 text-slate-600">{inv.client_name}</td>
                      <td className="px-6 py-3 text-right font-medium text-slate-800">
                        {formatCurrency(inv.total)}
                      </td>
                      <td className="px-6 py-3 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusBadge(inv.status)}`}>
                          {inv.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Upcoming Deadlines */}
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-900">Upcoming Deadlines (7 days)</h2>
            <button
              onClick={() => navigate('/projects')}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
            >
              View all <ArrowRight size={12} />
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-500 text-xs uppercase tracking-wider border-b border-slate-50">
                  <th className="px-6 py-3 text-left font-medium">Project</th>
                  <th className="px-6 py-3 text-left font-medium">Client</th>
                  <th className="px-6 py-3 text-left font-medium">Deadline</th>
                  <th className="px-6 py-3 text-center font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {!stats.upcomingProjects || stats.upcomingProjects.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-slate-400">
                      No upcoming deadlines
                    </td>
                  </tr>
                ) : (
                  stats.upcomingProjects.map((proj: any) => (
                    <tr key={proj.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-3 font-medium text-slate-800">{proj.name}</td>
                      <td className="px-6 py-3 text-slate-600">{proj.client_name}</td>
                      <td className="px-6 py-3 text-slate-600 flex items-center gap-1.5">
                        <Calendar size={13} className="text-slate-400" />
                        {proj.deadline}
                      </td>
                      <td className="px-6 py-3 text-center">
                        <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                          {proj.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
