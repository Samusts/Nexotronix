// /api/users — customer management (admin only)
import { getMany } from '../../lib/db.js';
import { verifySession, successRes, errorRes, unauthorized } from '../../middleware/auth.js';
import { handleOptions } from '../../lib/cors.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return handleOptions(req);
  if (req.method !== 'GET') return errorRes('Method not allowed', 405);

  const session = await verifySession(req, ['superadmin', 'subadmin']);
  if (!session) return unauthorized();

  const users = await getMany(
    `SELECT id, full_name, email, phone, is_active, last_login, created_at
     FROM customers ORDER BY created_at DESC LIMIT 100`
  );
  return successRes({ users });
}
