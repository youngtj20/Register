import { randomUUID } from 'node:crypto';
import { query } from './db-client.js';
import { getStaff, setCors } from './auth-utils.js';
import { normalizeNigerianPhone } from './phone-utils.js';

const genRegistrationCode = () => `REG-${randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase()}`;

export default async function handler(req, res) {
  setCors(res, 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const auth = await getStaff(req, ['admin']);
    if (auth.error) return res.status(auth.status).json({ error: auth.error });

    const { event_id, attendees } = req.body || {};
    if (!event_id) return res.status(400).json({ error: 'Event is required' });
    if (!Array.isArray(attendees) || !attendees.length) return res.status(400).json({ error: 'No rows to import' });
    if (attendees.length > 2000) return res.status(400).json({ error: 'Import is limited to 2000 rows at a time' });

    const [event] = await query('SELECT id FROM events WHERE id = ?', [event_id]);
    if (!event) return res.status(404).json({ error: 'Event not found' });

    const results = [];
    let inserted = 0;
    for (let i = 0; i < attendees.length; i++) {
      const row = attendees[i] || {};
      const fullName = String(row.full_name || '').trim();
      const phone = normalizeNigerianPhone(row.phone);
      const organisation = String(row.organisation || '').trim();
      if (fullName.length < 2) { results.push({ row: i + 1, status: 'error', reason: 'Missing or invalid full name' }); continue; }
      if (!phone) { results.push({ row: i + 1, status: 'error', reason: 'Missing or invalid Nigerian phone number' }); continue; }
      try {
        const id = randomUUID();
        const registration_code = genRegistrationCode();
        await query(
          'INSERT INTO attendees (id, event_id, registration_code, full_name, phone, organisation) VALUES (?, ?, ?, ?, ?, ?)',
          [id, event_id, registration_code, fullName, phone, organisation || null]
        );
        inserted += 1;
        results.push({ row: i + 1, status: 'ok', id, full_name: fullName });
      } catch (err) {
        results.push({ row: i + 1, status: 'error', reason: err.message });
      }
    }

    return res.status(200).json({ inserted, skipped: attendees.length - inserted, results });
  } catch (err) {
    console.error('API error:', err);
    return res.status(500).json({ error: err.message });
  }
}
