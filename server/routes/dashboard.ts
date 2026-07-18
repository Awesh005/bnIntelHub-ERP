import { Router } from 'express';
import { supabase } from '../supabaseAdmin.js';

const router = Router();

// GET /api/dashboard/stats
router.get('/stats', async (_req, res) => {
  try {
    // Total invoiced (all time)
    const { data: invoices } = await supabase.from('invoices').select('total, amount_paid, status');
    const allInvoices = invoices || [];

    const totalInvoiced = allInvoices.reduce((sum: number, inv: any) => sum + Number(inv.total), 0);
    const totalReceived = allInvoices.reduce((sum: number, inv: any) => sum + Number(inv.amount_paid), 0);
    const totalOutstanding = totalInvoiced - totalReceived;

    // Active projects count
    const { count: activeProjects } = await supabase
      .from('projects')
      .select('id', { count: 'exact', head: true })
      .in('status', ['In Progress', 'Not Started']);

    // Pending quotations count
    const { count: pendingQuotations } = await supabase
      .from('quotations')
      .select('id', { count: 'exact', head: true })
      .in('status', ['Draft', 'Sent']);

    // Recent 5 invoices
    const { data: recentInvoices } = await supabase
      .from('invoices')
      .select('id, invoice_number, client_id, issue_date, total, amount_paid, status, clients(name)')
      .order('created_at', { ascending: false })
      .limit(5);

    const recentInvoicesList = (recentInvoices || []).map((inv: any) => ({
      ...inv,
      client_name: inv.clients?.name || '',
      balance_due: Number(inv.total) - Number(inv.amount_paid),
    }));

    // Projects with deadlines in next 7 days
    const today = new Date();
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    const { data: upcomingDeadlines } = await supabase
      .from('projects')
      .select('id, name, deadline, status, client_id, clients(name)')
      .gte('deadline', today.toISOString().split('T')[0])
      .lte('deadline', nextWeek.toISOString().split('T')[0])
      .neq('status', 'Completed')
      .neq('status', 'Cancelled')
      .order('deadline');

    const upcomingProjects = (upcomingDeadlines || []).map((p: any) => ({
      ...p,
      client_name: p.clients?.name || '',
    }));

    res.json({
      totalInvoiced,
      totalReceived,
      totalOutstanding,
      activeProjects: activeProjects || 0,
      pendingQuotations: pendingQuotations || 0,
      recentInvoices: recentInvoicesList,
      upcomingProjects,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to load dashboard stats' });
  }
});

export default router;
