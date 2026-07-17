import axios from 'axios';
import { supabase } from './supabaseClient';
import type {
  Client,
  TeamMember,
  Project,
  Invoice,
  Quotation,
  Settings,
  DashboardStats,
} from '../types';

const API_BASE = '/api';

// Axios instance with auth interceptor
const http = axios.create({ baseURL: API_BASE });

// Attach Supabase session token to every request
http.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }
  return config;
});

// Handle 401 responses (redirect to login)
http.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      supabase.auth.signOut();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const api = {
  // Dashboard
  async getDashboardStats(): Promise<DashboardStats> {
    const res = await http.get('/dashboard/stats');
    return res.data;
  },

  // Clients
  async getClients(): Promise<Client[]> {
    const res = await http.get('/clients');
    return res.data;
  },
  async getClient(id: string): Promise<Client> {
    const res = await http.get(`/clients/${id}`);
    return res.data;
  },
  async createClient(data: Partial<Client>): Promise<Client> {
    const res = await http.post('/clients', data);
    return res.data;
  },
  async updateClient(id: string, data: Partial<Client>): Promise<Client> {
    const res = await http.put(`/clients/${id}`, data);
    return res.data;
  },
  async deleteClient(id: string): Promise<{ success: boolean }> {
    const res = await http.delete(`/clients/${id}`);
    return res.data;
  },

  // Team
  async getTeam(): Promise<TeamMember[]> {
    const res = await http.get('/team');
    return res.data;
  },
  async getTeamMember(id: string): Promise<TeamMember> {
    const res = await http.get(`/team/${id}`);
    return res.data;
  },
  async createTeamMember(data: Partial<TeamMember>): Promise<TeamMember> {
    const res = await http.post('/team', data);
    return res.data;
  },
  async updateTeamMember(id: string, data: Partial<TeamMember>): Promise<TeamMember> {
    const res = await http.put(`/team/${id}`, data);
    return res.data;
  },
  async deleteTeamMember(id: string): Promise<{ success: boolean }> {
    const res = await http.delete(`/team/${id}`);
    return res.data;
  },

  // Projects
  async getProjects(filters?: { status?: string; client_id?: string }): Promise<Project[]> {
    const params = new URLSearchParams();
    if (filters?.status) params.set('status', filters.status);
    if (filters?.client_id) params.set('client_id', filters.client_id);
    const res = await http.get(`/projects?${params}`);
    return res.data;
  },
  async getProject(id: string): Promise<Project> {
    const res = await http.get(`/projects/${id}`);
    return res.data;
  },
  async createProject(data: Partial<Project>): Promise<Project> {
    const res = await http.post('/projects', data);
    return res.data;
  },
  async updateProject(id: string, data: Partial<Project>): Promise<Project> {
    const res = await http.put(`/projects/${id}`, data);
    return res.data;
  },
  async deleteProject(id: string): Promise<{ success: boolean }> {
    const res = await http.delete(`/projects/${id}`);
    return res.data;
  },

  // Invoices
  async getInvoices(filters?: { client_id?: string; status?: string; search?: string }): Promise<Invoice[]> {
    const params = new URLSearchParams();
    if (filters?.client_id) params.set('client_id', filters.client_id);
    if (filters?.status) params.set('status', filters.status);
    if (filters?.search) params.set('search', filters.search);
    const res = await http.get(`/invoices?${params}`);
    return res.data;
  },
  async getInvoice(id: string): Promise<Invoice> {
    const res = await http.get(`/invoices/${id}`);
    return res.data;
  },
  async createInvoice(data: any): Promise<Invoice> {
    const res = await http.post('/invoices', data);
    return res.data;
  },
  async updateInvoice(id: string, data: any): Promise<Invoice> {
    const res = await http.put(`/invoices/${id}`, data);
    return res.data;
  },
  async markInvoicePaid(id: string): Promise<Invoice> {
    const res = await http.patch(`/invoices/${id}/mark-paid`);
    return res.data;
  },
  async deleteInvoice(id: string): Promise<{ success: boolean }> {
    const res = await http.delete(`/invoices/${id}`);
    return res.data;
  },
  getInvoicePdfUrl(id: string): string {
    return `${API_BASE}/invoices/${id}/pdf`;
  },

  // Quotations
  async getQuotations(filters?: { client_id?: string; status?: string; search?: string }): Promise<Quotation[]> {
    const params = new URLSearchParams();
    if (filters?.client_id) params.set('client_id', filters.client_id);
    if (filters?.status) params.set('status', filters.status);
    if (filters?.search) params.set('search', filters.search);
    const res = await http.get(`/quotations?${params}`);
    return res.data;
  },
  async getQuotation(id: string): Promise<Quotation> {
    const res = await http.get(`/quotations/${id}`);
    return res.data;
  },
  async createQuotation(data: any): Promise<Quotation> {
    const res = await http.post('/quotations', data);
    return res.data;
  },
  async updateQuotation(id: string, data: any): Promise<Quotation> {
    const res = await http.put(`/quotations/${id}`, data);
    return res.data;
  },
  async deleteQuotation(id: string): Promise<{ success: boolean }> {
    const res = await http.delete(`/quotations/${id}`);
    return res.data;
  },
  async convertQuotationToInvoice(id: string): Promise<{ invoice_id: string; invoice: Invoice }> {
    const res = await http.post(`/quotations/${id}/convert-to-invoice`);
    return res.data;
  },
  getQuotationPdfUrl(id: string): string {
    return `${API_BASE}/quotations/${id}/pdf`;
  },

  // Settings
  async getSettings(): Promise<Settings> {
    const res = await http.get('/settings');
    return res.data;
  },
  async updateSettings(data: Partial<Settings>): Promise<Settings> {
    const res = await http.put('/settings', data);
    return res.data;
  },

  // PDF download helper (needs auth token)
  async downloadPdf(url: string, filename: string): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession();
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${session?.access_token || ''}`,
      },
    });
    const blob = await response.blob();
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
  },
};
