import { query } from './db-client.js';
import { getStaff, setCors } from './auth-utils.js';

export default async function handler(req, res) {
  setCors(res, 'POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const auth = await getStaff(req);
    if (auth.error) return res.status(auth.status).json({ error: auth.error });

    const { eventId, ids, q = '', printed = true } = req.body || {};
    const printedAt = printed ? new Date() : null;

    if (Array.isArray(ids) && ids.length) {
      if (ids.length > 2000) return res.status(400).json({ error: 'Too many records in one request' });
      const result = await query(
        `UPDATE checkins SET printed_at = ? WHERE id IN (${ids.map(() => '?').join(',')})`,
        [printedAt, ...ids]
      );
      return res.status(200).json({ updated: result.affectedRows });
    }

    if (eventId) {
      const term = String(q).trim();
      const like = `%${term}%`;
      const searchClause = term ? 'AND (a.full_name LIKE ? OR a.phone LIKE ? OR a.organisation LIKE ? OR a.registration_code LIKE ?)' : '';
      const searchParams = term ? [like, like, like, like] : [];
      const result = await query(
        `UPDATE checkins c JOIN attendees a ON a.id = c.attendee_id
         SET c.printed_at = ?
         WHERE c.event_id = ? ${searchClause}`,
        [printedAt, eventId, ...searchParams]
      );
      return res.status(200).json({ updated: result.affectedRows });
    }

    return res.status(400).json({ error: 'Provide either ids or eventId' });
  } catch (err) {
    console.error('API error:', err);
    return res.status(500).json({ error: err.message });
  }
}
