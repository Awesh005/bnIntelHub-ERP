import { Router } from 'express';
import { supabase } from '../supabaseAdmin';

const router = Router();

// GET /api/projects — list all with joined client name and team member
router.get('/', async (req, res) => {
  const { status, client_id } = req.query;

  let query = supabase
    .from('projects')
    .select('*, clients(name, company_name), team(name)')
    .order('created_at', { ascending: false });

  if (status && status !== 'all') {
    query = query.eq('status', status);
  }
  if (client_id) {
    query = query.eq('client_id', client_id);
  }

  const { data, error } = await query;

  if (error) return res.status(500).json({ error: error.message });

  // Flatten joined data for easier frontend consumption
  const projects = (data || []).map((p: any) => ({
    ...p,
    client_name: p.clients?.name || '',
    client_company: p.clients?.company_name || '',
    assigned_to_name: p.team?.name || '',
  }));

  res.json(projects);
});

// GET /api/projects/:id — single project with details
router.get('/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('projects')
    .select('*, clients(name, company_name, email, phone), team(name, role, email)')
    .eq('id', req.params.id)
    .single();

  if (error) return res.status(404).json({ error: 'Project not found' });

  const project = {
    ...data,
    client_name: (data as any).clients?.name || '',
    client_company: (data as any).clients?.company_name || '',
    assigned_to_name: (data as any).team?.name || '',
    assigned_to_role: (data as any).team?.role || '',
  };

  res.json(project);
});

// POST /api/projects — create
router.post('/', async (req, res) => {
  const { name, client_id, description, assigned_to, start_date, deadline, price, status, notes } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Project name is required' });
  }
  if (price !== undefined && Number(price) < 0) {
    return res.status(400).json({ error: 'Price must be a positive number' });
  }

  const { data, error } = await supabase
    .from('projects')
    .insert({
      name: name.trim(),
      client_id: client_id || null,
      description,
      assigned_to: assigned_to || null,
      start_date: start_date || null,
      deadline: deadline || null,
      price: Number(price || 0),
      status: status || 'Not Started',
      notes,
    })
    .select('*, clients(name, company_name), team(name)')
    .single();

  if (error) return res.status(500).json({ error: error.message });

  const project = {
    ...data,
    client_name: (data as any).clients?.name || '',
    assigned_to_name: (data as any).team?.name || '',
  };

  res.status(201).json(project);
});

// PUT /api/projects/:id — update
router.put('/:id', async (req, res) => {
  const { name, client_id, description, assigned_to, start_date, deadline, price, status, notes } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Project name is required' });
  }
  if (price !== undefined && Number(price) < 0) {
    return res.status(400).json({ error: 'Price must be a positive number' });
  }

  const { data, error } = await supabase
    .from('projects')
    .update({
      name: name.trim(),
      client_id: client_id || null,
      description,
      assigned_to: assigned_to || null,
      start_date: start_date || null,
      deadline: deadline || null,
      price: Number(price || 0),
      status: status || 'Not Started',
      notes,
    })
    .eq('id', req.params.id)
    .select('*, clients(name, company_name), team(name)')
    .single();

  if (error) return res.status(500).json({ error: error.message });

  const project = {
    ...data,
    client_name: (data as any).clients?.name || '',
    assigned_to_name: (data as any).team?.name || '',
  };

  res.json(project);
});

// DELETE /api/projects/:id
router.delete('/:id', async (req, res) => {
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', req.params.id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

export default router;
