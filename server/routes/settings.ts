import { Router } from 'express';
import { supabase } from '../supabaseAdmin.js';

const router = Router();

// GET /api/settings
router.get('/', async (_req, res) => {
  const { data, error } = await supabase
    .from('settings')
    .select('*')
    .eq('id', 1)
    .single();

  if (error) {
    // If no settings row exists, return defaults
    return res.json({
      id: 1,
      company_name: 'BN IntelHub Pvt Ltd',
      address: '',
      gstin: '',
      phone: '',
      email: '',
      bank_account_name: '',
      bank_account_number: '',
      ifsc: '',
      bank_name: '',
      logo_url: '',
      invoice_prefix: 'INV-',
      currency: 'INR',
    });
  }
  res.json(data);
});

// PUT /api/settings — update (upsert)
router.put('/', async (req, res) => {
  // Prevent overriding id manually from the client
  const { id, created_at, ...updateData } = req.body;

  const { data, error } = await supabase
    .from('settings')
    .upsert({
      id: 1, // enforce singleton settings row
      ...updateData
    })
    .select()
    .single();

  if (error) {
    console.error('Settings update error:', error.message);
    return res.status(500).json({ error: error.message });
  }
  res.json(data);
});

export default router;
