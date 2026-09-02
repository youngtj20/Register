import { query } from './db-client.js';
import { setCors } from './auth-utils.js';

export default async function handler(req, res) {
  setCors(res, 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const code = String(req.query?.code || '').trim();
    if (!code) return res.status(400).json({ error: 'Event code is required' });
    const [event] = await query('SELECT id, name, venue, starts_at, ends_at, status, self_checkin_code FROM events WHERE self_checkin_code = ? LIMIT 1', [code]);
    if (!event || event.status !== 'active') return res.status(404).json({ error: 'This check-in link is not active' });
    const [{ count }] = await query('SELECT COUNT(*) AS count FROM attendees WHERE event_id = ? AND checked_in = 1', [event.id]);
    return res.status(200).json({ ...event, present_count: count || 0 });
  } catch (err) {
    console.error('API error:', err);
    return res.status(500).json({ error: err.message });
  }
}
