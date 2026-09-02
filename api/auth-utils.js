import jwt from 'jsonwebtoken';
import { query } from './db-client.js';

const JWT_SECRET = process.env.JWT_SECRET;

export function signToken(staffId) {
  return jwt.sign({ sub: staffId }, JWT_SECRET, { expiresIn: '30d' });
}

export async function getStaff(req, allowedRoles = ['admin', 'receptionist'], allowInactive = false) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return { error: 'Authentication required', status: 401 };

  let payload;
  try {
    payload = jwt.verify(token, JWT_SECRET);
  } catch {
    return { error: 'Your session is invalid or expired', status: 401 };
  }

  const rows = await query('SELECT * FROM staff WHERE id = ? LIMIT 1', [payload.sub]);
  const profile = rows[0];
  if (!profile) return { error: 'Your session is invalid or expired', status: 401 };

  const user = { id: profile.id, email: profile.email };
  if (!allowInactive && !profile.active) return { error: 'Your staff access is awaiting administrator approval', status: 403, user, profile };
  if (allowedRoles.length && !allowedRoles.includes(profile.role)) return { error: 'You do not have permission to perform this action', status: 403, user, profile };
  return { user, profile, token };
}

export function setCors(res, methods = 'GET, POST, PUT, DELETE, OPTIONS') {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', methods);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}
