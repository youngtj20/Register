import { query } from './db-client.js';
import { getStaff, setCors } from './auth-utils.js';

const xmlEscape = (value) => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const cell = (value, type = 'String') => `<Cell><Data ss:Type="${type}">${xmlEscape(value)}</Data></Cell>`;

export default async function handler(req, res) {
  setCors(res, 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const auth = await getStaff(req, ['admin']);
    if (auth.error) return res.status(auth.status).json({ error: auth.error });
    const { eventId } = req.query || {};
    if (!eventId) return res.status(400).json({ error: 'Event is required' });
    const [[event], attendees] = await Promise.all([
      query('SELECT * FROM events WHERE id = ?', [eventId]),
      query('SELECT * FROM attendees WHERE event_id = ? ORDER BY full_name', [eventId]),
    ]);
    if (!event) return res.status(404).json({ error: 'Event not found' });
    const headers = ['Registration ID', 'Full name', 'Phone', 'Union/Organisation', 'Attendance', 'Check-in date/time', 'Method', 'Assisted by'];
    const rows = attendees.map((item) => `<Row>${cell(item.registration_code)}${cell(item.full_name)}${cell(item.phone)}${cell(item.organisation || '')}${cell(item.checked_in ? 'Present' : 'Not present')}${cell(item.checked_in_at || '')}${cell(item.checkin_method || '')}${cell(item.checked_in_by_name || '')}</Row>`).join('');
    const workbook = `<?xml version="1.0"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><DocumentProperties xmlns="urn:schemas-microsoft-com:office:office"><Title>${xmlEscape(event.name)} Attendance</Title></DocumentProperties><Styles><Style ss:ID="Header"><Font ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#087F5B" ss:Pattern="Solid"/></Style></Styles><Worksheet ss:Name="Attendance"><Table><Row ss:StyleID="Header">${headers.map((header) => cell(header)).join('')}</Row>${rows}</Table></Worksheet></Workbook>`;
    const safeName = event.name.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();
    res.setHeader('Content-Type', 'application/vnd.ms-excel; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}-attendance.xls"`);
    return res.status(200).send(workbook);
  } catch (err) {
    console.error('API error:', err);
    return res.status(500).json({ error: err.message });
  }
}
