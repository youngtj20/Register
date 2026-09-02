import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { query } from './db-client.js';
import { signToken, setCors } from './auth-utils.js';

export default async function handler(req, res) {
  setCors(res, 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { email, password, full_name } = req.body || {};
    if (!email?.includes('@')) return res.status(400).json({ error: 'Enter a valid email address' });
    if (!password || password.length < 6) return res.status(400).json({ error: 'Password must contain at least 6 characters' });
    if (!full_name?.trim() || full_name.trim().length < 2) return res.status(400).json({ error: 'Enter your full name' });

    const normalizedEmail = email.trim().toLowerCase();
    const existing = await query('SELECT id FROM staff WHERE email = ? LIMIT 1', [normalizedEmail]);
    if (existing.length) return res.status(409).json({ error: 'An account with this email already exists' });

    const [{ count }] = await query('SELECT COUNT(*) AS count FROM staff');
    const isFirstAccount = count === 0;
    const id = randomUUID();
    const passwordHash = await bcrypt.hash(password, 10);
    await query(
      'INSERT INTO staff (id, email, password_hash, full_name, role, active) VALUES (?, ?, ?, ?, ?, ?)',
      [id, normalizedEmail, passwordHash, full_name.trim(), isFirstAccount ? 'admin' : 'receptionist', isFirstAccount]
    );

    const token = signToken(id);
    return res.status(201).json({ token, pending: !isFirstAccount });
  } catch (err) {
    console.error('API error:', err);
    return res.status(500).json({ error: err.message });
  }
}
