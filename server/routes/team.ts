import { Router } from 'express';
import { supabase } from '../supabaseAdmin.js';

const router = Router();

// GET /api/team — list all
router.get('/', async (_req, res) => {
  const { data, error } = await supabase
    .from('team')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// GET /api/team/:id — single member
router.get('/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('team')
    .select('*')
    .eq('id', req.params.id)
    .single();

  if (error) return res.status(404).json({ error: 'Team member not found' });
  res.json(data);
});

// POST /api/team — create
router.post('/', async (req, res) => {
  const { name, role, email, phone } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Name is required' });
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  const { data, error } = await supabase
    .from('team')
    .insert({ name: name.trim(), role, email, phone })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// PUT /api/team/:id — update
router.put('/:id', async (req, res) => {
  const { name, role, email, phone } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Name is required' });
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  const { data, error } = await supabase
    .from('team')
    .update({ name: name.trim(), role, email, phone })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// DELETE /api/team/:id
router.delete('/:id', async (req, res) => {
  const { error } = await supabase
    .from('team')
    .delete()
    .eq('id', req.params.id);

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

export default router;
