import { randomUUID } from 'node:crypto';
import { query } from './db-client.js';
import { getStaff, setCors } from './auth-utils.js';

const genCode = () => `SELF-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

export default async function handler(req, res) {
  setCors(res, 'GET, POST, PUT, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const auth = await getStaff(req, req.method === 'GET' ? ['admin', 'receptionist'] : ['admin']);
    if (auth.error) return res.status(auth.status).json({ error: auth.error });

    if (req.method === 'GET') {
      const data = await query('SELECT * FROM events ORDER BY starts_at ASC');
      return res.status(200).json(data);
    }

    if (req.method === 'POST') {
      const { name, venue, starts_at, ends_at, status = 'draft' } = req.body || {};
      if (!name?.trim() || !venue?.trim() || !starts_at || !ends_at) return res.status(400).json({ error: 'All event fields are required' });
      if (new Date(ends_at) <= new Date(starts_at)) return res.status(400).json({ error: 'End time must be after the start time' });
      const id = randomUUID();
      const code = genCode();
      await query(
        'INSERT INTO events (id, name, venue, starts_at, ends_at, status, self_checkin_code) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [id, name.trim(), venue.trim(), new Date(starts_at), new Date(ends_at), status, code]
      );
      const [data] = await query('SELECT * FROM events WHERE id = ?', [id]);
      return res.status(201).json(data);
    }

    if (req.method === 'PUT') {
      const { id, name, venue, starts_at, ends_at, status } = req.body || {};
      if (!id || !name || !venue || !starts_at || !ends_at) return res.status(400).json({ error: 'All event fields are required' });
      if (new Date(ends_at) <= new Date(starts_at)) return res.status(400).json({ error: 'End time must be after the start time' });
      await query(
        'UPDATE events SET name = ?, venue = ?, starts_at = ?, ends_at = ?, status = ? WHERE id = ?',
        [name.trim(), venue.trim(), new Date(starts_at), new Date(ends_at), status, id]
      );
      const [data] = await query('SELECT * FROM events WHERE id = ?', [id]);
      if (!data) return res.status(404).json({ error: 'Event not found' });
      return res.status(200).json(data);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('API error:', err);
    return res.status(500).json({ error: err.message });
  }
}
