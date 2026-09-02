import { getStaff, setCors } from './auth-utils.js';

export default async function handler(req, res) {
  setCors(res, 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const auth = await getStaff(req, ['admin', 'receptionist'], true);
    if (auth.error && !auth.profile) return res.status(auth.status).json({ error: auth.error });
    const { password_hash, ...profile } = auth.profile;
    return res.status(200).json({ ...profile, auth_email: profile.email });
  } catch (err) {
    console.error('API error:', err);
    return res.status(500).json({ error: err.message });
  }
}
