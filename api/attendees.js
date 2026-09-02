import { randomUUID } from 'node:crypto';
import { query } from './db-client.js';
import { getStaff, setCors } from './auth-utils.js';
import { normalizeNigerianPhone } from './phone-utils.js';

const normalizePhone = (value = '') => value.replace(/\D/g, '');
export const genRegistrationCode = () => `REG-${randomUUID().replace(/-/g, '').slice(0, 10).toUpperCase()}`;

export default async function handler(req, res) {
  setCors(res);
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    const auth = await getStaff(req, req.method === 'GET' ? ['admin', 'receptionist'] : ['admin']);
    if (auth.error) return res.status(auth.status).json({ error: auth.error });

    if (req.method === 'GET') {
      const { eventId, q = '', status = 'all' } = req.query || {};
      if (!eventId) return res.status(400).json({ error: 'Event is required' });
      const data = await query('SELECT * FROM attendees WHERE event_id = ? ORDER BY full_name ASC LIMIT 1000', [eventId]);
      const term = String(q).trim().toLowerCase();
      const phoneTerm = normalizePhone(term);
      const filtered = (data || []).filter((attendee) => {
        const matchesTerm = !term || attendee.full_name.toLowerCase().includes(term) || (phoneTerm && normalizePhone(attendee.phone).includes(phoneTerm)) || attendee.registration_code.toLowerCase().includes(term);
        const matchesStatus = status === 'all' || (status === 'present' ? attendee.checked_in : !attendee.checked_in);
        return matchesTerm && matchesStatus;
      });
      return res.status(200).json(filtered.slice(0, 250));
    }

    if (req.method === 'POST') {
      const { event_id, full_name, phone, organisation = '' } = req.body || {};
      if (!event_id || !full_name?.trim() || !phone?.trim()) return res.status(400).json({ error: 'Name, phone, and event are required' });
      const normalizedPhone = normalizeNigerianPhone(phone);
      if (!normalizedPhone) return res.status(400).json({ error: 'Enter a valid Nigerian phone number, e.g. 0803 123 4567' });
      const id = randomUUID();
      const registration_code = genRegistrationCode();
      await query(
        'INSERT INTO attendees (id, event_id, registration_code, full_name, phone, organisation) VALUES (?, ?, ?, ?, ?, ?)',
        [id, event_id, registration_code, full_name.trim(), normalizedPhone, organisation.trim() || null]
      );
      const [data] = await query('SELECT * FROM attendees WHERE id = ?', [id]);
      return res.status(201).json(data);
    }

    if (req.method === 'PUT') {
      const { id, full_name, phone, organisation = '' } = req.body || {};
      if (!id || !full_name?.trim() || !phone?.trim()) return res.status(400).json({ error: 'Name and phone are required' });
      const normalizedPhone = normalizeNigerianPhone(phone);
      if (!normalizedPhone) return res.status(400).json({ error: 'Enter a valid Nigerian phone number, e.g. 0803 123 4567' });
      await query(
        'UPDATE attendees SET full_name = ?, phone = ?, organisation = ? WHERE id = ?',
        [full_name.trim(), normalizedPhone, organisation.trim() || null, id]
      );
      const [data] = await query('SELECT * FROM attendees WHERE id = ?', [id]);
      if (!data) return res.status(404).json({ error: 'Attendee not found' });
      return res.status(200).json(data);
    }

    if (req.method === 'DELETE') {
      const { id } = req.body || {};
      if (!id) return res.status(400).json({ error: 'Attendee id is required' });
      await query('DELETE FROM checkins WHERE attendee_id = ?', [id]);
      await query('DELETE FROM attendees WHERE id = ?', [id]);
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('API error:', err);
    return res.status(500).json({ error: err.message });
  }
}
