/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import PDFDocument from 'pdfkit';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

const PORT = 3000;
const DB_FILE = path.join(process.cwd(), 'db.json');

// Helper to write file atomically
function writeJsonAtomic(filePath: string, data: any) {
  const tempPath = filePath + '.tmp';
  fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tempPath, filePath);
}

// Relational DB structure and initialization
interface DbSchema {
  clients: any[];
  projects: any[];
  developers: any[];
  project_developers: any[];
  quotations: any[];
  invoices: any[];
  payments: any[];
  notifications: any[];
  settings: {
    companyName: string;
    companyAddress: string;
    companyEmail: string;
    companyPhone: string;
    currency: string;
    taxRate: number;
    supabaseUrl: string;
    supabaseAnonKey: string;
  };
}

const DEFAULT_DB: DbSchema = {
  clients: [
    {
      id: 'client-1',
      name: 'Acme Corporation',
      contactPerson: 'Johnathan Doe',
      email: 'j.doe@acme.com',
      phone: '+1 (555) 123-4567',
      address: '123 Industrial Parkway, Suite A, Tech City, CA',
      status: 'active',
      createdAt: '2026-06-01T10:00:00Z'
    },
    {
      id: 'client-2',
      name: 'Fintech Global Inc',
      contactPerson: 'Sarah Jenkins',
      email: 's.jenkins@fintechglobal.com',
      phone: '+1 (555) 987-6543',
      address: '742 Financial Boulevard, Floor 18, New York, NY',
      status: 'active',
      createdAt: '2026-06-10T11:00:00Z'
    },
    {
      id: 'client-3',
      name: 'HealthFlow Systems',
      contactPerson: 'Dr. Robert Chen',
      email: 'r.chen@healthflow.io',
      phone: '+1 (555) 456-7890',
      address: '500 Biotech Way, San Francisco, CA',
      status: 'active',
      createdAt: '2026-06-20T09:30:00Z'
    },
    {
      id: 'client-4',
      name: 'Apex Retail Group',
      contactPerson: 'Amanda Ross',
      email: 'a.ross@apexretail.com',
      phone: '+1 (555) 321-7654',
      address: '100 Shopping Center Plaza, Dallas, TX',
      status: 'inactive',
      createdAt: '2026-05-15T14:20:00Z'
    }
  ],
  projects: [
    {
      id: 'project-1',
      clientId: 'client-2',
      name: 'Enterprise Core Migration',
      description: 'Upgrading the transactional core database, implementing microservices, and migrating legacy tables to PostgreSQL.',
      startDate: '2026-06-15',
      endDate: '2026-09-15',
      budget: 85000,
      status: 'active',
      progress: 65,
      createdAt: '2026-06-12T10:00:00Z'
    },
    {
      id: 'project-2',
      clientId: 'client-3',
      name: 'Telehealth Patient Portal',
      description: 'A mobile-responsive clinical portal for patient check-ins, medical records retrieval, and video consultation scheduling.',
      startDate: '2026-07-01',
      endDate: '2026-10-01',
      budget: 45000,
      status: 'active',
      progress: 40,
      createdAt: '2026-06-25T11:00:00Z'
    },
    {
      id: 'project-3',
      clientId: 'client-4',
      name: 'E-Commerce Replatforming',
      description: 'Migrating legacy Shopify store to an enterprise headless Next.js web application with a high-performance custom checkout funnel.',
      startDate: '2026-05-20',
      endDate: '2026-07-10',
      budget: 60000,
      status: 'completed',
      progress: 100,
      createdAt: '2026-05-18T08:00:00Z'
    },
    {
      id: 'project-4',
      clientId: 'client-1',
      name: 'NextGen AI Analytics Dashboard',
      description: 'Building custom predictive models, connecting to internal APIs, and creating a beautiful interactive visual dashboard representing supply chain insights.',
      startDate: '2026-08-01',
      endDate: '2026-12-01',
      budget: 120000,
      status: 'planning',
      progress: 15,
      createdAt: '2026-07-01T09:00:00Z'
    }
  ],
  developers: [
    {
      id: 'dev-1',
      name: 'Aravind Nair',
      email: 'aravind@bnintelhub.com',
      role: 'Technical Lead',
      skills: ['React', 'Node.js', 'PostgreSQL', 'AWS', 'Docker'],
      hourlyRate: 75,
      status: 'busy',
      createdAt: '2026-05-01T08:00:00Z'
    },
    {
      id: 'dev-2',
      name: 'Sneha Iyer',
      email: 'sneha@bnintelhub.com',
      role: 'Senior Frontend Developer',
      skills: ['React', 'TypeScript', 'Tailwind CSS', 'UI/UX', 'Figma'],
      hourlyRate: 60,
      status: 'busy',
      createdAt: '2026-05-10T08:00:00Z'
    },
    {
      id: 'dev-3',
      name: 'Vikram Malhotra',
      email: 'vikram@bnintelhub.com',
      role: 'Backend Architect',
      skills: ['Node.js', 'Python', 'Go', 'Express', 'Redis', 'PostgreSQL'],
      hourlyRate: 70,
      status: 'available',
      createdAt: '2026-05-15T08:00:00Z'
    },
    {
      id: 'dev-4',
      name: 'Divya Sharma',
      email: 'divya@bnintelhub.com',
      role: 'QA Automation Engineer',
      skills: ['Cypress', 'Selenium', 'Jest', 'CI/CD', 'API Testing'],
      hourlyRate: 50,
      status: 'available',
      createdAt: '2026-06-01T08:00:00Z'
    }
  ],
  project_developers: [
    { id: 'pd-1', projectId: 'project-1', developerId: 'dev-1' },
    { id: 'pd-2', projectId: 'project-1', developerId: 'dev-3' },
    { id: 'pd-3', projectId: 'project-2', developerId: 'dev-2' },
    { id: 'pd-4', projectId: 'project-2', developerId: 'dev-4' },
    { id: 'pd-5', projectId: 'project-3', developerId: 'dev-2' },
    { id: 'pd-6', projectId: 'project-3', developerId: 'dev-1' }
  ],
  quotations: [
    {
      id: 'quote-1',
      clientId: 'client-3',
      quotationNumber: 'QT-2026-001',
      date: '2026-06-10',
      expiryDate: '2026-07-10',
      items: [
        { id: 'qi-1', description: 'Patient Portal Design & Prototyping', qty: 1, rate: 8000, amount: 8000 },
        { id: 'qi-2', description: 'Video Telehealth WebRTC Core Setup', qty: 1, rate: 17000, amount: 17000 },
        { id: 'qi-3', description: 'HIPAA Compliant API & Database Integration', qty: 1, rate: 20000, amount: 20000 }
      ],
      subtotal: 45000,
      taxRate: 18,
      taxAmount: 8100,
      discount: 0,
      total: 53100,
      status: 'accepted',
      notes: 'This estimate is fully inclusive of video server hosting configurations for the first 3 months.',
      createdAt: '2026-06-10T09:00:00Z'
    },
    {
      id: 'quote-2',
      clientId: 'client-1',
      quotationNumber: 'QT-2026-002',
      date: '2026-07-01',
      expiryDate: '2026-08-01',
      items: [
        { id: 'qi-4', description: 'AI Predictor Core Python Model Service', qty: 1, rate: 50000, amount: 50000 },
        { id: 'qi-5', description: 'Dynamic React Dashboard & Filter Engine', qty: 1, rate: 45000, amount: 45000 },
        { id: 'qi-6', description: 'Enterprise Security Audit & IAM Roles', qty: 1, rate: 25000, amount: 25000 }
      ],
      subtotal: 120000,
      taxRate: 18,
      taxAmount: 21600,
      discount: 5000,
      total: 136600,
      status: 'sent',
      notes: 'Standard 5% discount applied for Enterprise licensing setup.',
      createdAt: '2026-07-01T08:30:00Z'
    },
    {
      id: 'quote-3',
      clientId: 'client-2',
      quotationNumber: 'QT-2026-003',
      date: '2026-07-15',
      expiryDate: '2026-08-15',
      items: [
        { id: 'qi-7', description: 'DevOps & CI/CD Pipeline Modernization', qty: 1, rate: 35000, amount: 35000 }
      ],
      subtotal: 35000,
      taxRate: 18,
      taxAmount: 6300,
      discount: 0,
      total: 41300,
      status: 'draft',
      notes: 'Initial proposal draft for ongoing tech enhancements.',
      createdAt: '2026-07-15T10:00:00Z'
    }
  ],
  invoices: [
    {
      id: 'invoice-1',
      clientId: 'client-2',
      projectId: 'project-1',
      invoiceNumber: 'INV-2026-001',
      issueDate: '2026-06-15',
      dueDate: '2026-07-15',
      items: [
        { id: 'ii-1', description: 'Enterprise Core Migration - Milestone 1 Implementation', qty: 1, rate: 25000, amount: 25000 }
      ],
      subtotal: 25000,
      taxRate: 18,
      taxAmount: 4500,
      discount: 0,
      total: 29500,
      status: 'paid',
      notes: 'Milestone 1 completed, verified, and signed off.',
      createdAt: '2026-06-15T09:00:00Z'
    },
    {
      id: 'invoice-2',
      clientId: 'client-3',
      projectId: 'project-2',
      invoiceNumber: 'INV-2026-002',
      issueDate: '2026-07-05',
      dueDate: '2026-08-05',
      items: [
        { id: 'ii-2', description: 'Telehealth Patient Portal - Visual Prototyping & UX Wireframes', qty: 1, rate: 15000, amount: 15000 }
      ],
      subtotal: 15000,
      taxRate: 18,
      taxAmount: 2700,
      discount: 0,
      total: 17700,
      status: 'sent',
      notes: 'Awaiting client approval of design mockups.',
      createdAt: '2026-07-05T09:30:00Z'
    },
    {
      id: 'invoice-3',
      clientId: 'client-2',
      projectId: 'project-1',
      invoiceNumber: 'INV-2026-003',
      issueDate: '2026-07-10',
      dueDate: '2026-08-10',
      items: [
        { id: 'ii-3', description: 'Enterprise Core Migration - Milestone 2 Architecture & Setup', qty: 1, rate: 30000, amount: 30000 }
      ],
      subtotal: 30000,
      taxRate: 18,
      taxAmount: 5400,
      discount: 0,
      total: 35400,
      status: 'paid',
      notes: 'Second phase migration deliverables delivered.',
      createdAt: '2026-07-10T10:00:00Z'
    },
    {
      id: 'invoice-4',
      clientId: 'client-4',
      projectId: 'project-3',
      invoiceNumber: 'INV-2026-004',
      issueDate: '2026-05-20',
      dueDate: '2026-06-20',
      items: [
        { id: 'ii-4', description: 'E-Commerce Replatforming - Completion Settlement Balance', qty: 1, rate: 12500, amount: 12500 }
      ],
      subtotal: 12500,
      taxRate: 18,
      taxAmount: 2250,
      discount: 0,
      total: 14750,
      status: 'overdue',
      notes: 'Final project completion payment overdue.',
      createdAt: '2026-05-20T11:00:00Z'
    }
  ],
  payments: [
    {
      id: 'payment-1',
      invoiceId: 'invoice-1',
      amount: 29500,
      date: '2026-06-20',
      paymentMethod: 'bank_transfer',
      referenceId: 'TXN-908124098',
      notes: 'Automated bank wire settlement. Confirmed.',
      createdAt: '2026-06-20T15:00:00Z'
    },
    {
      id: 'payment-2',
      invoiceId: 'invoice-3',
      amount: 35400,
      date: '2026-07-12',
      paymentMethod: 'bank_transfer',
      referenceId: 'TXN-998231011',
      notes: 'Milestone 2 settlement payment.',
      createdAt: '2026-07-12T16:00:00Z'
    }
  ],
  notifications: [
    {
      id: 'notify-1',
      title: 'Invoice Overdue',
      message: 'Invoice INV-2026-004 for Apex Retail Group is overdue by 26 days.',
      type: 'warning',
      read: false,
      createdAt: '2026-07-16T12:00:00Z'
    },
    {
      id: 'notify-2',
      title: 'Quotation Accepted',
      message: 'Client HealthFlow Systems has accepted Quotation QT-2026-001.',
      type: 'success',
      read: false,
      createdAt: '2026-06-10T09:05:00Z'
    },
    {
      id: 'notify-3',
      title: 'Project Kickoff',
      message: 'New project "NextGen AI Analytics Dashboard" has been created for Acme Corporation.',
      type: 'info',
      read: true,
      createdAt: '2026-07-01T09:10:00Z'
    }
  ],
  settings: {
    companyName: 'BN IntelHub Pvt Ltd',
    companyAddress: '404 Tech Park, Tower B, Sector 62, Noida, India',
    companyEmail: 'finance@bnintelhub.com',
    companyPhone: '+91 (120) 456-7890',
    currency: 'USD',
    taxRate: 18,
    supabaseUrl: '',
    supabaseAnonKey: ''
  }
};

// Database state operations
function getDb(): DbSchema {
  if (!fs.existsSync(DB_FILE)) {
    writeJsonAtomic(DB_FILE, DEFAULT_DB);
    return DEFAULT_DB;
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading DB, resetting to defaults', e);
    writeJsonAtomic(DB_FILE, DEFAULT_DB);
    return DEFAULT_DB;
  }
}

function saveDb(data: DbSchema) {
  writeJsonAtomic(DB_FILE, data);
}

// REST API Endpoints

// 1. Dashboard stats
app.get('/api/dashboard-stats', (req, res) => {
  const db = getDb();
  
  // Calculate revenue from payments
  const totalRevenue = db.payments.reduce((acc, p) => acc + p.amount, 0);
  
  // Calculate outstanding invoices amount
  const pendingInvoicesAmount = db.invoices
    .filter(i => i.status === 'sent' || i.status === 'overdue')
    .reduce((acc, i) => acc + i.total, 0);

  const activeProjectsCount = db.projects.filter(p => p.status === 'active').length;
  const activeClientsCount = db.clients.filter(c => c.status === 'active').length;

  // Project status distribution
  const statusCounts = db.projects.reduce((acc: any, p) => {
    acc[p.status] = (acc[p.status] || 0) + 1;
    return acc;
  }, {});
  const projectStatusDistribution = Object.keys(statusCounts).map(status => ({
    name: status.toUpperCase().replace('_', ' '),
    value: statusCounts[status]
  }));

  // Monthly revenue chart computation
  const monthlyRevenueMap: { [key: string]: number } = {};
  db.payments.forEach(p => {
    const month = p.date.substring(0, 7); // YYYY-MM
    monthlyRevenueMap[month] = (monthlyRevenueMap[month] || 0) + p.amount;
  });
  
  // Ensure we show at least recent 6 months
  const months = ['2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07'];
  const monthlyRevenue = months.map(m => ({
    month: m,
    amount: monthlyRevenueMap[m] || 0
  }));

  // Recent activities list
  const recentActivities = [
    ...db.payments.map(p => ({
      id: `act-p-${p.id}`,
      description: `Payment of $${p.amount.toLocaleString()} received for Invoice`,
      time: p.date + 'T15:00:00Z',
      type: 'payment'
    })),
    ...db.projects.map(p => ({
      id: `act-pr-${p.id}`,
      description: `Project "${p.name}" initialized with progress at ${p.progress}%`,
      time: p.createdAt || new Date().toISOString(),
      type: 'project'
    })),
    ...db.invoices.map(i => ({
      id: `act-i-${i.id}`,
      description: `Invoice ${i.invoiceNumber} (${i.status.toUpperCase()}) created for client`,
      time: i.createdAt || new Date().toISOString(),
      type: 'invoice'
    }))
  ]
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    .slice(0, 5);

  res.json({
    totalRevenue,
    pendingInvoicesAmount,
    activeProjectsCount,
    activeClientsCount,
    projectStatusDistribution,
    monthlyRevenue,
    recentActivities
  });
});

// 2. Clients
app.get('/api/clients', (req, res) => {
  res.json(getDb().clients);
});

app.post('/api/clients', (req, res) => {
  const db = getDb();
  const client = {
    ...req.body,
    id: 'client-' + Date.now(),
    createdAt: new Date().toISOString()
  };
  db.clients.push(client);
  saveDb(db);
  res.status(201).json(client);
});

app.put('/api/clients/:id', (req, res) => {
  const db = getDb();
  const idx = db.clients.findIndex(c => c.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Client not found' });
  
  db.clients[idx] = { ...db.clients[idx], ...req.body };
  saveDb(db);
  res.json(db.clients[idx]);
});

app.delete('/api/clients/:id', (req, res) => {
  const db = getDb();
  db.clients = db.clients.filter(c => c.id !== req.params.id);
  // Keep db normalized: delete associated projects, quotations, invoices
  db.projects = db.projects.filter(p => p.clientId !== req.params.id);
  db.quotations = db.quotations.filter(q => q.clientId !== req.params.id);
  db.invoices = db.invoices.filter(i => i.clientId !== req.params.id);
  saveDb(db);
  res.json({ success: true });
});

// 3. Projects
app.get('/api/projects', (req, res) => {
  const db = getDb();
  // Return projects with assigned developers and client name resolved
  const populatedProjects = db.projects.map(p => {
    const client = db.clients.find(c => c.id === p.clientId);
    const assignedDevIds = db.project_developers
      .filter(pd => pd.projectId === p.id)
      .map(pd => pd.developerId);
    const assignedDevelopers = db.developers.filter(d => assignedDevIds.includes(d.id));
    return {
      ...p,
      clientName: client ? client.name : 'Unknown Client',
      assignedDevelopers
    };
  });
  res.json(populatedProjects);
});

app.post('/api/projects', (req, res) => {
  const db = getDb();
  const projectId = 'project-' + Date.now();
  const project = {
    id: projectId,
    clientId: req.body.clientId,
    name: req.body.name,
    description: req.body.description,
    startDate: req.body.startDate,
    endDate: req.body.endDate,
    budget: Number(req.body.budget || 0),
    status: req.body.status || 'planning',
    progress: Number(req.body.progress || 0),
    createdAt: new Date().toISOString()
  };
  db.projects.push(project);

  // Link developers if provided
  if (req.body.developerIds && Array.isArray(req.body.developerIds)) {
    req.body.developerIds.forEach((devId: string) => {
      db.project_developers.push({
        id: 'pd-' + Date.now() + Math.random().toString(36).substr(2, 4),
        projectId,
        developerId: devId
      });
    });
  }

  // Create notifications
  db.notifications.unshift({
    id: 'notify-' + Date.now(),
    title: 'Project Initialized',
    message: `New project "${project.name}" created.`,
    type: 'info',
    read: false,
    createdAt: new Date().toISOString()
  });

  saveDb(db);
  res.status(201).json(project);
});

app.put('/api/projects/:id', (req, res) => {
  const db = getDb();
  const idx = db.projects.findIndex(p => p.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Project not found' });

  db.projects[idx] = {
    ...db.projects[idx],
    clientId: req.body.clientId,
    name: req.body.name,
    description: req.body.description,
    startDate: req.body.startDate,
    endDate: req.body.endDate,
    budget: Number(req.body.budget),
    status: req.body.status,
    progress: Number(req.body.progress)
  };

  // Update developers mappings
  if (req.body.developerIds && Array.isArray(req.body.developerIds)) {
    // Delete existing
    db.project_developers = db.project_developers.filter(pd => pd.projectId !== req.params.id);
    // Insert new
    req.body.developerIds.forEach((devId: string) => {
      db.project_developers.push({
        id: 'pd-' + Date.now() + Math.random().toString(36).substr(2, 4),
        projectId: req.params.id,
        developerId: devId
      });
    });
  }

  saveDb(db);
  res.json(db.projects[idx]);
});

app.delete('/api/projects/:id', (req, res) => {
  const db = getDb();
  db.projects = db.projects.filter(p => p.id !== req.params.id);
  db.project_developers = db.project_developers.filter(pd => pd.projectId !== req.params.id);
  // Nullify project ref in invoices
  db.invoices = db.invoices.map(i => i.projectId === req.params.id ? { ...i, projectId: null } : i);
  saveDb(db);
  res.json({ success: true });
});

// 4. Developers
app.get('/api/developers', (req, res) => {
  res.json(getDb().developers);
});

app.post('/api/developers', (req, res) => {
  const db = getDb();
  const developer = {
    ...req.body,
    skills: Array.isArray(req.body.skills) ? req.body.skills : String(req.body.skills || '').split(',').map(s => s.trim()).filter(Boolean),
    id: 'dev-' + Date.now(),
    createdAt: new Date().toISOString()
  };
  db.developers.push(developer);
  saveDb(db);
  res.status(201).json(developer);
});

app.put('/api/developers/:id', (req, res) => {
  const db = getDb();
  const idx = db.developers.findIndex(d => d.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Developer not found' });

  db.developers[idx] = {
    ...db.developers[idx],
    ...req.body,
    skills: Array.isArray(req.body.skills) ? req.body.skills : String(req.body.skills || '').split(',').map(s => s.trim()).filter(Boolean)
  };
  saveDb(db);
  res.json(db.developers[idx]);
});

app.delete('/api/developers/:id', (req, res) => {
  const db = getDb();
  db.developers = db.developers.filter(d => d.id !== req.params.id);
  db.project_developers = db.project_developers.filter(pd => pd.developerId !== req.params.id);
  saveDb(db);
  res.json({ success: true });
});

// 5. Quotations
app.get('/api/quotations', (req, res) => {
  const db = getDb();
  const populated = db.quotations.map(q => {
    const client = db.clients.find(c => c.id === q.clientId);
    return { ...q, clientName: client ? client.name : 'Unknown Client' };
  });
  res.json(populated);
});

app.post('/api/quotations', (req, res) => {
  const db = getDb();
  const quote = {
    ...req.body,
    id: 'quote-' + Date.now(),
    quotationNumber: 'QT-' + new Date().getFullYear() + '-' + String(db.quotations.length + 1).padStart(3, '0'),
    createdAt: new Date().toISOString()
  };
  db.quotations.push(quote);
  saveDb(db);
  res.status(201).json(quote);
});

app.put('/api/quotations/:id', (req, res) => {
  const db = getDb();
  const idx = db.quotations.findIndex(q => q.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Quotation not found' });

  db.quotations[idx] = { ...db.quotations[idx], ...req.body };
  saveDb(db);
  res.json(db.quotations[idx]);
});

app.delete('/api/quotations/:id', (req, res) => {
  const db = getDb();
  db.quotations = db.quotations.filter(q => q.id !== req.params.id);
  saveDb(db);
  res.json({ success: true });
});

// Convert Quotation to Project / Invoice
app.post('/api/quotations/:id/convert', (req, res) => {
  const db = getDb();
  const quote = db.quotations.find(q => q.id === req.params.id);
  if (!quote) return res.status(404).json({ error: 'Quotation not found' });

  // Update Quotation Status
  quote.status = 'accepted';

  // Create Project
  const projectId = 'project-' + Date.now();
  const newProject = {
    id: projectId,
    clientId: quote.clientId,
    name: `Project for Quote ${quote.quotationNumber}`,
    description: quote.notes || `Successfully converted from Quotation ${quote.quotationNumber}`,
    startDate: new Date().toISOString().substring(0, 10),
    endDate: quote.expiryDate,
    budget: quote.subtotal,
    status: 'planning',
    progress: 0,
    createdAt: new Date().toISOString()
  };
  db.projects.push(newProject);

  // Create Invoice for client
  const invoiceId = 'invoice-' + Date.now();
  const newInvoice = {
    id: invoiceId,
    clientId: quote.clientId,
    projectId: projectId,
    invoiceNumber: 'INV-' + new Date().getFullYear() + '-' + String(db.invoices.length + 1).padStart(3, '0'),
    issueDate: new Date().toISOString().substring(0, 10),
    dueDate: quote.expiryDate,
    items: quote.items.map((it: any) => ({ ...it, id: 'ii-' + Date.now() + Math.random().toString(36).substr(2, 4) })),
    subtotal: quote.subtotal,
    taxRate: quote.taxRate,
    taxAmount: quote.taxAmount,
    discount: quote.discount,
    total: quote.total,
    status: 'draft',
    notes: `Converted from Quotation ${quote.quotationNumber}`,
    createdAt: new Date().toISOString()
  };
  db.invoices.push(newInvoice);

  // Notify
  db.notifications.unshift({
    id: 'notify-' + Date.now(),
    title: 'Quotation Converted',
    message: `Quotation ${quote.quotationNumber} accepted. Initialized new Project and Draft Invoice.`,
    type: 'success',
    read: false,
    createdAt: new Date().toISOString()
  });

  saveDb(db);
  res.json({ success: true, project: newProject, invoice: newInvoice });
});

// 6. Invoices
app.get('/api/invoices', (req, res) => {
  const db = getDb();
  const populated = db.invoices.map(i => {
    const client = db.clients.find(c => c.id === i.clientId);
    const project = db.projects.find(p => p.id === i.projectId);
    return {
      ...i,
      clientName: client ? client.name : 'Unknown Client',
      projectName: project ? project.name : 'N/A'
    };
  });
  res.json(populated);
});

app.post('/api/invoices', (req, res) => {
  const db = getDb();
  const invoice = {
    ...req.body,
    id: 'invoice-' + Date.now(),
    invoiceNumber: 'INV-' + new Date().getFullYear() + '-' + String(db.invoices.length + 1).padStart(3, '0'),
    createdAt: new Date().toISOString()
  };
  db.invoices.push(invoice);
  saveDb(db);
  res.status(201).json(invoice);
});

app.put('/api/invoices/:id', (req, res) => {
  const db = getDb();
  const idx = db.invoices.findIndex(i => i.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Invoice not found' });

  db.invoices[idx] = { ...db.invoices[idx], ...req.body };
  saveDb(db);
  res.json(db.invoices[idx]);
});

app.delete('/api/invoices/:id', (req, res) => {
  const db = getDb();
  db.invoices = db.invoices.filter(i => i.id !== req.params.id);
  db.payments = db.payments.filter(p => p.invoiceId !== req.params.id);
  saveDb(db);
  res.json({ success: true });
});

// 7. Payments
app.get('/api/payments', (req, res) => {
  const db = getDb();
  const populated = db.payments.map(p => {
    const invoice = db.invoices.find(i => i.id === p.invoiceId);
    const client = invoice ? db.clients.find(c => c.id === invoice.clientId) : null;
    return {
      ...p,
      invoiceNumber: invoice ? invoice.invoiceNumber : 'N/A',
      clientName: client ? client.name : 'N/A'
    };
  });
  res.json(populated);
});

app.post('/api/payments', (req, res) => {
  const db = getDb();
  const payment = {
    id: 'payment-' + Date.now(),
    invoiceId: req.body.invoiceId,
    amount: Number(req.body.amount),
    date: req.body.date,
    paymentMethod: req.body.paymentMethod,
    referenceId: req.body.referenceId || 'TXN-' + Date.now(),
    notes: req.body.notes || '',
    createdAt: new Date().toISOString()
  };
  db.payments.push(payment);

  // Update Invoice Status to Paid
  const invoice = db.invoices.find(i => i.id === payment.invoiceId);
  if (invoice) {
    invoice.status = 'paid';
  }

  // Create success notification
  db.notifications.unshift({
    id: 'notify-' + Date.now(),
    title: 'Payment Confirmed',
    message: `Payment of $${payment.amount.toLocaleString()} settled for Invoice ${invoice ? invoice.invoiceNumber : ''}.`,
    type: 'success',
    read: false,
    createdAt: new Date().toISOString()
  });

  saveDb(db);
  res.status(201).json(payment);
});

// 8. Notifications
app.get('/api/notifications', (req, res) => {
  res.json(getDb().notifications);
});

app.put('/api/notifications/:id/read', (req, res) => {
  const db = getDb();
  const notify = db.notifications.find(n => n.id === req.params.id);
  if (notify) {
    notify.read = true;
    saveDb(db);
  }
  res.json({ success: true });
});

app.post('/api/notifications/read-all', (req, res) => {
  const db = getDb();
  db.notifications.forEach(n => { n.read = true; });
  saveDb(db);
  res.json({ success: true });
});

// 9. Settings
app.get('/api/settings', (req, res) => {
  res.json(getDb().settings);
});

app.post('/api/settings', (req, res) => {
  const db = getDb();
  db.settings = { ...db.settings, ...req.body };
  saveDb(db);
  res.json(db.settings);
});

// PDF Generator Route - PDFKit integration for Invoices & Quotations
app.get('/api/pdf/:type/:id', (req, res) => {
  const { type, id } = req.params;
  const db = getDb();

  let title = '';
  let docNumber = '';
  let date = '';
  let dueDateStr = '';
  let clientName = '';
  let clientEmail = '';
  let clientAddress = '';
  let items: any[] = [];
  let subtotal = 0;
  let taxRate = 0;
  let taxAmount = 0;
  let discount = 0;
  let total = 0;
  let notes = '';

  if (type === 'invoice') {
    const invoice = db.invoices.find(i => i.id === id);
    if (!invoice) return res.status(404).send('Invoice not found');
    const client = db.clients.find(c => c.id === invoice.clientId);
    
    title = 'INVOICE';
    docNumber = invoice.invoiceNumber;
    date = invoice.issueDate;
    dueDateStr = invoice.dueDate;
    clientName = client ? client.name : 'Unknown Client';
    clientEmail = client ? client.email : '';
    clientAddress = client ? client.address : '';
    items = invoice.items || [];
    subtotal = invoice.subtotal;
    taxRate = invoice.taxRate;
    taxAmount = invoice.taxAmount;
    discount = invoice.discount;
    total = invoice.total;
    notes = invoice.notes;
  } else if (type === 'quotation') {
    const quote = db.quotations.find(q => q.id === id);
    if (!quote) return res.status(404).send('Quotation not found');
    const client = db.clients.find(c => c.id === quote.clientId);
    
    title = 'QUOTATION ESTIMATE';
    docNumber = quote.quotationNumber;
    date = quote.date;
    dueDateStr = quote.expiryDate; // expiry acts as due/validity date
    clientName = client ? client.name : 'Unknown Client';
    clientEmail = client ? client.email : '';
    clientAddress = client ? client.address : '';
    items = quote.items || [];
    subtotal = quote.subtotal;
    taxRate = quote.taxRate;
    taxAmount = quote.taxAmount;
    discount = quote.discount;
    total = quote.total;
    notes = quote.notes;
  } else {
    return res.status(400).send('Invalid doc type');
  }

  const { companyName, companyAddress, companyEmail, companyPhone, currency } = db.settings;

  const doc = new PDFDocument({ margin: 50 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${docNumber}.pdf"`);
  doc.pipe(res);

  // 1. Header (BN IntelHub Pvt Ltd Logo and Document Title)
  doc.rect(0, 0, 612, 12).fill('#0F172A'); // Slate band at top

  doc.fillColor('#0F172A').font('Helvetica-Bold').fontSize(24).text(companyName, 50, 45);
  doc.font('Helvetica').fontSize(9).fillColor('#64748B')
    .text(companyAddress, 50, 75)
    .text(`Email: ${companyEmail} | Phone: ${companyPhone}`, 50, 90);

  // Doc Metadata
  doc.fontSize(22).fillColor('#1E293B').text(title, 340, 45, { align: 'right' });
  doc.fontSize(10).fillColor('#475569')
    .text(`Document No: ${docNumber}`, 340, 75, { align: 'right' })
    .text(`Date: ${date}`, 340, 90, { align: 'right' })
    .text(`Valid/Due Date: ${dueDateStr}`, 340, 105, { align: 'right' });

  doc.moveTo(50, 130).lineTo(562, 130).stroke('#E2E8F0');

  // 2. Billing details
  doc.font('Helvetica-Bold').fontSize(12).fillColor('#0F172A').text('BILL TO:', 50, 150);
  doc.font('Helvetica-Bold').fontSize(11).fillColor('#1E293B')
    .text(clientName, 50, 170)
    .font('Helvetica').fontSize(10).fillColor('#475569')
    .text(clientAddress, 50, 190, { width: 250 })
    .text(`Email: ${clientEmail}`, 50, 225);

  // 3. Table Header
  const tableTop = 260;
  doc.rect(50, tableTop, 512, 25).fill('#F1F5F9');
  doc.fillColor('#0F172A').fontSize(10)
    .text('Description', 60, tableTop + 7, { width: 260 })
    .text('Qty', 330, tableTop + 7, { align: 'right', width: 40 })
    .text('Rate', 390, tableTop + 7, { align: 'right', width: 60 })
    .text('Amount', 470, tableTop + 7, { align: 'right', width: 80 });

  // 4. Table Items
  let itemIndex = 0;
  let currentY = tableTop + 25;
  items.forEach((item) => {
    doc.fillColor('#334155').fontSize(10)
      .text(item.description, 60, currentY + 8, { width: 260 })
      .text(String(item.qty), 330, currentY + 8, { align: 'right', width: 40 })
      .text(`${currency} ${item.rate.toLocaleString()}`, 390, currentY + 8, { align: 'right', width: 60 })
      .text(`${currency} ${item.amount.toLocaleString()}`, 470, currentY + 8, { align: 'right', width: 80 });

    doc.moveTo(50, currentY + 25).lineTo(562, currentY + 25).stroke('#F1F5F9');
    currentY += 25;
    itemIndex++;
  });

  // 5. Totals Area
  const totalsY = currentY + 20;
  doc.fontSize(10).fillColor('#475569')
    .text('Subtotal:', 340, totalsY)
    .text(`${currency} ${subtotal.toLocaleString()}`, 470, totalsY, { align: 'right', width: 80 })
    
    .text(`Tax (${taxRate}%):`, 340, totalsY + 15)
    .text(`${currency} ${taxAmount.toLocaleString()}`, 470, totalsY + 15, { align: 'right', width: 80 })
    
    .text('Discount:', 340, totalsY + 30)
    .text(`${currency} ${discount.toLocaleString()}`, 470, totalsY + 30, { align: 'right', width: 80 });

  doc.rect(340, totalsY + 50, 222, 30).fill('#0F172A');
  doc.font('Helvetica-Bold').fontSize(12).fillColor('#FFFFFF')
    .text('TOTAL:', 350, totalsY + 59)
    .text(`${currency} ${total.toLocaleString()}`, 470, totalsY + 59, { align: 'right', width: 80 });

  // 6. Notes & Footer
  if (notes) {
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#0F172A').text('Notes & Terms:', 50, totalsY + 100);
    doc.font('Helvetica').fontSize(9).fillColor('#64748B').text(notes, 50, totalsY + 115, { width: 260 });
  }

  doc.fontSize(8).fillColor('#94A3B8').text(`Generated automatically by BN IntelHub ERP System on ${new Date().toLocaleDateString()}`, 50, 720, { align: 'center', width: 512 });

  doc.end();
});

// Configure Vite Express Dev Middleware for full stack development mode
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
