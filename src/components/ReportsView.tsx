/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { 
  BarChart, 
  Bar, 
  AreaChart,
  Area,
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { api } from '../lib/api';
import { Project, Invoice, Developer, Payment } from '../types';
import { BarChart3, TrendingUp, Cpu, PieChart as PieIcon, Layers } from 'lucide-react';

export default function ReportsView() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [developers, setDevelopers] = useState<Developer[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState('USD');

  async function loadData() {
    try {
      setLoading(true);
      const [proj, inv, dev, pay, settings] = await Promise.all([
        api.getProjects(),
        api.getInvoices(),
        api.getDevelopers(),
        api.getPayments(),
        api.getSettings()
      ]);
      setProjects(proj);
      setInvoices(inv);
      setDevelopers(dev);
      setPayments(pay);
      setCurrency(settings.currency || 'USD');
    } catch (err) {
      console.error('Failed to load reports metrics', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-slate-200 rounded w-1/4"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-80 bg-slate-200 rounded-xl"></div>
          <div className="h-80 bg-slate-200 rounded-xl"></div>
        </div>
      </div>
    );
  }

  // --- REPORT 1: Financial Area Cash Flow ---
  const monthlyInflowsMap: { [key: string]: number } = {};
  payments.forEach(p => {
    const month = p.date.substring(0, 7); // YYYY-MM
    monthlyInflowsMap[month] = (monthlyInflowsMap[month] || 0) + p.amount;
  });
  
  const monthsList = ['2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07'];
  const cashFlowData = monthsList.map(m => ({
    name: m,
    'Revenue Inflow': monthlyInflowsMap[m] || 0
  }));

  // --- REPORT 2: Project Delivery Status ---
  const projectStatusCounts = projects.reduce((acc: any, p) => {
    acc[p.status] = (acc[p.status] || 0) + 1;
    return acc;
  }, {});

  const projectPieData = Object.keys(projectStatusCounts).map(status => ({
    name: status.toUpperCase().replace('_', ' '),
    value: projectStatusCounts[status]
  }));

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444'];

  // --- REPORT 3: Engineering Team Allocations ---
  const developerStatusCounts = developers.reduce((acc: any, d) => {
    acc[d.status] = (acc[d.status] || 0) + 1;
    return acc;
  }, {});

  const devBarData = Object.keys(developerStatusCounts).map(status => ({
    name: status.toUpperCase(),
    'Specialist Count': developerStatusCounts[status]
  }));

  // --- REPORT 4: Accounts Receivable Settle Gap ---
  const billedAndPaidData = monthsList.map(m => {
    // Total invoiced this month (using issueDate)
    const invoicedSum = invoices
      .filter(i => i.issueDate.substring(0, 7) === m)
      .reduce((acc, i) => acc + i.total, 0);

    // Total paid this month
    const paidSum = payments
      .filter(p => p.date.substring(0, 7) === m)
      .reduce((acc, p) => acc + p.amount, 0);

    return {
      month: m,
      'Total Billed': invoicedSum,
      'Total Settled': paidSum
    };
  });

  return (
    <div className="space-y-8">
      {/* View Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Business Intelligence BI Reports</h1>
        <p className="text-slate-500 text-sm mt-1">Audit high-fidelity business analytics of financial trends, project deliveries, and developer workforce utilization.</p>
      </div>

      {/* Grid Reports Block */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Chart 1: Revenue Area Flow */}
        <div className="bg-white border border-slate-100 p-6 rounded-xl shadow-sm space-y-4">
          <div className="flex items-center space-x-2.5 border-b border-slate-50 pb-3">
            <TrendingUp className="text-blue-500" size={18} />
            <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Cash Flow Inflows ({currency})</h3>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cashFlowData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorInflow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.01}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} />
                <YAxis stroke="#94A3B8" fontSize={11} />
                <Tooltip formatter={(v) => [`${currency} ${Number(v).toLocaleString()}`, 'Revenue Inflow']} />
                <Area type="monotone" dataKey="Revenue Inflow" stroke="#3B82F6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorInflow)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 4: Billed vs Settled Ledger Gap */}
        <div className="bg-white border border-slate-100 p-6 rounded-xl shadow-sm space-y-4">
          <div className="flex items-center space-x-2.5 border-b border-slate-50 pb-3">
            <Layers className="text-blue-500" size={18} />
            <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Billed vs Settled Revenue ({currency})</h3>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={billedAndPaidData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="month" stroke="#94A3B8" fontSize={11} />
                <YAxis stroke="#94A3B8" fontSize={11} />
                <Tooltip formatter={(v) => `${currency} ${Number(v).toLocaleString()}`} />
                <Legend iconSize={10} />
                <Bar dataKey="Total Billed" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Total Settled" fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Project Delivery Stage distribution */}
        <div className="bg-white border border-slate-100 p-6 rounded-xl shadow-sm space-y-4">
          <div className="flex items-center space-x-2.5 border-b border-slate-50 pb-3">
            <PieIcon className="text-blue-500" size={18} />
            <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Project Delivery Milestones Breakdown</h3>
          </div>
          <div className="h-72 flex flex-col sm:flex-row items-center justify-between">
            <div className="flex-1 w-full h-full min-h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={projectPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {projectPieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            {/* Legend checklist */}
            <div className="space-y-2 px-6">
              {projectPieData.map((item, index) => (
                <div key={index} className="flex items-center space-x-2 text-xs font-semibold text-slate-600">
                  <span className="w-3 h-3 rounded" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <span className="capitalize">{item.name.toLowerCase()}:</span>
                  <span className="font-mono text-slate-800 font-bold">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Chart 3: Developer Workforce Utilization */}
        <div className="bg-white border border-slate-100 p-6 rounded-xl shadow-sm space-y-4">
          <div className="flex items-center space-x-2.5 border-b border-slate-50 pb-3">
            <Cpu className="text-blue-500" size={18} />
            <h3 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Specialist Resource Allocation</h3>
          </div>
          <div className="h-72">
            {devBarData.length === 0 ? (
              <div className="text-center text-xs text-slate-400 py-16">No developers configured to draw workforce reports.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={devBarData} barSize={40}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                  <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} />
                  <YAxis stroke="#94A3B8" fontSize={11} />
                  <Tooltip />
                  <Bar dataKey="Specialist Count" fill="#10B981" radius={[4, 4, 0, 0]}>
                    {devBarData.map((entry, idx) => (
                      <Cell key={`cell-${idx}`} fill={entry.name === 'AVAILABLE' ? '#10B981' : '#F59E0B'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
