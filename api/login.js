import bcrypt from 'bcryptjs';
import { query } from './db-client.js';
import { signToken, setCors } from './auth-utils.js';

export default async function handler(req, res) {
  setCors(res, 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

    const normalizedEmail = email.trim().toLowerCase();
    const rows = await query('SELECT * FROM staff WHERE email = ? LIMIT 1', [normalizedEmail]);
    const staff = rows[0];
    if (!staff) return res.status(401).json({ error: 'Invalid email or password' });

    const valid = await bcrypt.compare(password, staff.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid email or password' });

    const token = signToken(staff.id);
    return res.status(200).json({ token });
  } catch (err) {
    console.error('API error:', err);
    return res.status(500).json({ error: err.message });
  }
}
