// ============================================================
// POST /api/auth/logout
// ============================================================
import { deleteSession } from '../../lib/security.js';
import { successRes, errorRes } from '../../middleware/auth.js';
import { handleOptions } from '../../lib/cors.js';
import { auditLog } from '../../lib/security.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return handleOptions(req);
  if (req.method !== 'POST') return errorRes('Method not allowed', 405);

  const ip = req.headers['x-forwarded-for'] || 'unknown';
  const auth = req.headers['authorization'] || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';

  if (token) {
    await deleteSession(token);
  }

  return successRes({ ok: true, message: 'Logged out successfully' });
}
