import { query } from './db-client.js';
import { setCors } from './auth-utils.js';

const normalizePhone = (value = '') => value.replace(/\D/g, '');
const maskPhone = (phone = '') => phone.length > 4 ? `${'•'.repeat(Math.max(0, phone.length - 4))}${phone.slice(-4)}` : phone;

export default async function handler(req, res) {
  setCors(res, 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const code = String(req.query?.code || '').trim();
    const q = String(req.query?.q || '').trim();
    if (!code || q.length < 2) return res.status(400).json({ error: 'Enter at least 2 characters' });
    const [event] = await query('SELECT id, status FROM events WHERE self_checkin_code = ? LIMIT 1', [code]);
    if (!event || event.status !== 'active') return res.status(404).json({ error: 'This check-in link is not active' });

    const data = await query('SELECT id, full_name, phone, organisation, checked_in, checked_in_at FROM attendees WHERE event_id = ? ORDER BY full_name LIMIT 1000', [event.id]);
    const term = q.toLowerCase();
    const phoneTerm = normalizePhone(q);
    const matches = (data || []).filter((attendee) => attendee.full_name.toLowerCase().includes(term) || (phoneTerm.length >= 2 && normalizePhone(attendee.phone).includes(phoneTerm))).slice(0, 12);
    return res.status(200).json(matches.map((attendee) => ({ ...attendee, phone: maskPhone(attendee.phone) })));
  } catch (err) {
    console.error('API error:', err);
    return res.status(500).json({ error: err.message });
  }
}
