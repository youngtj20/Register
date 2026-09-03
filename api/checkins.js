import { randomUUID } from 'node:crypto';
import { query } from './db-client.js';
import { getStaff, setCors } from './auth-utils.js';
import { normalizeNigerianPhone } from './phone-utils.js';

export default async function handler(req, res) {
  setCors(res, 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'GET') {
      const auth = await getStaff(req);
      if (auth.error) return res.status(auth.status).json({ error: auth.error });
      const { eventId, q = '', printed = 'all' } = req.query || {};
      if (!eventId) return res.status(400).json({ error: 'Event is required' });

      const page = Math.max(1, parseInt(req.query?.page, 10) || 1);
      const pageSize = Math.min(1000, Math.max(1, parseInt(req.query?.pageSize, 10) || 30));
      const offset = (page - 1) * pageSize;
      const term = String(q).trim();
      const like = `%${term}%`;
      const searchClause = term ? 'AND (a.full_name LIKE ? OR a.phone LIKE ? OR a.organisation LIKE ? OR a.registration_code LIKE ?)' : '';
      const searchParams = term ? [like, like, like, like] : [];
      const printedClause = printed === 'unprinted' ? 'AND c.printed_at IS NULL' : printed === 'printed' ? 'AND c.printed_at IS NOT NULL' : '';

      const [{ total }] = await query(
        `SELECT COUNT(*) AS total FROM checkins c JOIN attendees a ON a.id = c.attendee_id WHERE c.event_id = ? ${searchClause} ${printedClause}`,
        [eventId, ...searchParams]
      );
      const rows = await query(
        `SELECT c.*, a.full_name, a.phone, a.organisation, a.registration_code
         FROM checkins c JOIN attendees a ON a.id = c.attendee_id
         WHERE c.event_id = ? ${searchClause} ${printedClause}
         ORDER BY c.checked_in_at DESC
         LIMIT ? OFFSET ?`,
        [eventId, ...searchParams, pageSize, offset]
      );
      const results = rows.map(({ full_name, phone, organisation, registration_code, ...checkin }) => ({
        ...checkin,
        attendee: { full_name, phone, organisation, registration_code },
      }));
      return res.status(200).json({ total, page, pageSize, results });
    }

    if (req.method === 'POST') {
      const { attendeeId, registrationCode, eventCode, method = 'reception' } = req.body || {};
      const isPublic = method === 'qr';
      let actor = { user: null, profile: null };
      let event = null;

      if (isPublic) {
        if (!eventCode) return res.status(400).json({ error: 'Event code is required' });
        const [found] = await query('SELECT * FROM events WHERE self_checkin_code = ? LIMIT 1', [eventCode]);
        event = found || null;
        if (!event || event.status !== 'active') return res.status(404).json({ error: 'This self check-in is not active' });
      } else {
        actor = await getStaff(req);
        if (actor.error) return res.status(actor.status).json({ error: actor.error });
      }

      let attendee = null;
      if (attendeeId) {
        [attendee] = await query('SELECT * FROM attendees WHERE id = ? LIMIT 1', [attendeeId]);
      } else if (registrationCode) {
        [attendee] = await query('SELECT * FROM attendees WHERE registration_code = ? LIMIT 1', [String(registrationCode).trim().toUpperCase()]);
      } else {
        return res.status(400).json({ error: 'Attendee id or registration code is required' });
      }
      if (!attendee) return res.status(404).json({ error: 'No attendee matched that registration' });
      if (isPublic && attendee.event_id !== event.id) return res.status(400).json({ error: 'This attendee is not registered for this event' });
      if (isPublic) {
        const suppliedPhone = normalizeNigerianPhone(req.body?.phone);
        if (!suppliedPhone || suppliedPhone !== attendee.phone) {
          return res.status(403).json({ error: 'That phone number does not match our records for this registration.' });
        }
      }

      if (!event) {
        [event] = await query('SELECT * FROM events WHERE id = ? LIMIT 1', [attendee.event_id]);
      }
      if (!event) return res.status(404).json({ error: 'Event not found' });
      if (attendee.checked_in) return res.status(409).json({ error: `${attendee.full_name} was already checked in`, attendee });

      const checkedInAt = new Date();
      const assistantName = isPublic ? 'Self check-in' : actor.profile.full_name;
      const sourceDetail = isPublic ? 'Self check-in via event QR' : method === 'scanner' ? 'Registration code scanned by staff' : 'Marked present at reception desk';

      const result = await query(
        'UPDATE attendees SET checked_in = 1, checked_in_at = ?, checkin_method = ?, checked_in_by = ?, checked_in_by_name = ? WHERE id = ? AND checked_in = 0',
        [checkedInAt, method, actor.user?.id || null, assistantName, attendee.id]
      );
      if (!result.affectedRows) return res.status(409).json({ error: `${attendee.full_name} was just checked in on another device` });
      const [updated] = await query('SELECT * FROM attendees WHERE id = ?', [attendee.id]);

      const logId = randomUUID();
      await query(
        'INSERT INTO checkins (id, event_id, attendee_id, method, checked_in_by, assistant_name, source_detail, checked_in_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [logId, attendee.event_id, attendee.id, method, actor.user?.id || null, assistantName, sourceDetail, checkedInAt]
      );
      const [log] = await query('SELECT * FROM checkins WHERE id = ?', [logId]);

      return res.status(201).json({ attendee: updated, checkin: log });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('API error:', err);
    return res.status(500).json({ error: err.message });
  }
}
