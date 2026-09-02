import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { query } from './db-client.js';
import { getStaff, setCors } from './auth-utils.js';

export default async function handler(req, res) {
  setCors(res, 'GET, POST, PUT, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const auth = await getStaff(req, ['admin']);
    if (auth.error) return res.status(auth.status).json({ error: auth.error });

    if (req.method === 'GET') {
      const rows = await query('SELECT id, email, full_name, role, active, created_at FROM staff ORDER BY created_at ASC');
      return res.status(200).json(rows);
    }

    if (req.method === 'POST') {
      const { email, password, full_name, role = 'receptionist' } = req.body || {};
      if (!email?.includes('@')) return res.status(400).json({ error: 'Enter a valid email address' });
      if (!password || password.length < 6) return res.status(400).json({ error: 'Password must contain at least 6 characters' });
      if (!full_name?.trim() || full_name.trim().length < 2) return res.status(400).json({ error: 'Enter the team member\'s full name' });
      if (!['admin', 'receptionist'].includes(role)) return res.status(400).json({ error: 'Choose a valid role' });

      const normalizedEmail = email.trim().toLowerCase();
      const existing = await query('SELECT id FROM staff WHERE email = ? LIMIT 1', [normalizedEmail]);
      if (existing.length) return res.status(409).json({ error: 'An account with this email already exists' });

      const id = randomUUID();
      const passwordHash = await bcrypt.hash(password, 10);
      await query(
        'INSERT INTO staff (id, email, password_hash, full_name, role, active) VALUES (?, ?, ?, ?, ?, ?)',
        [id, normalizedEmail, passwordHash, full_name.trim(), role, true]
      );
      const [data] = await query('SELECT id, email, full_name, role, active, created_at FROM staff WHERE id = ?', [id]);
      return res.status(201).json(data);
    }

    if (req.method === 'PUT') {
      const { id, role, active } = req.body || {};
      if (!id || !['admin', 'receptionist'].includes(role) || typeof active !== 'boolean') return res.status(400).json({ error: 'Valid staff role and status are required' });
      if (id === auth.user.id && !active) return res.status(400).json({ error: 'You cannot deactivate your own account' });
      await query('UPDATE staff SET role = ?, active = ? WHERE id = ?', [role, active, id]);
      const [data] = await query('SELECT id, email, full_name, role, active, created_at FROM staff WHERE id = ?', [id]);
      if (!data) return res.status(404).json({ error: 'Staff member not found' });
      return res.status(200).json(data);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('API error:', err);
    return res.status(500).json({ error: err.message });
  }
}
