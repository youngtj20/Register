import { query } from './db-client.js';
import { getStaff, setCors } from './auth-utils.js';

export default async function handler(req, res) {
  setCors(res, 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const auth = await getStaff(req);
    if (auth.error) return res.status(auth.status).json({ error: auth.error });
    const { eventId } = req.query || {};
    if (!eventId) return res.status(400).json({ error: 'Event is required' });
    const attendees = await query('SELECT id, checked_in, checkin_method, checked_in_at FROM attendees WHERE event_id = ?', [eventId]);
    const present = attendees.filter((item) => item.checked_in);
    const self = present.filter((item) => item.checkin_method === 'qr').length;
    const scanned = present.filter((item) => item.checkin_method === 'scanner').length;
    const total = attendees.length;
    const recent = await query('SELECT * FROM checkins WHERE event_id = ? ORDER BY checked_in_at DESC LIMIT 8', [eventId]);
    const ids = (recent || []).map((item) => item.attendee_id);
    let names = [];
    if (ids.length) {
      names = await query(`SELECT id, full_name FROM attendees WHERE id IN (${ids.map(() => '?').join(',')})`, ids);
    }
    const nameMap = Object.fromEntries(names.map((item) => [item.id, item]));
    return res.status(200).json({ total, present: present.length, pending: total - present.length, rate: total ? Math.round((present.length / total) * 100) : 0, self, scanned, recent: (recent || []).map((item) => ({ ...item, attendee: nameMap[item.attendee_id] || null })) });
  } catch (err) {
    console.error('API error:', err);
    return res.status(500).json({ error: err.message });
  }
}
