// GET /api/auth/me — validate session and return user info
import { getOne } from '../../lib/db.js';
import { verifySession, successRes, errorRes, unauthorized } from '../../middleware/auth.js';
import { handleOptions } from '../../lib/cors.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return handleOptions(req);
  if (req.method !== 'GET') return errorRes('Method not allowed', 405);

  const session = await verifySession(req);
  if (!session) return unauthorized();

  const tableMap = { superadmin:'superadmin', subadmin:'subadmins', partner:'partners', customer:'customers' };
  const table = tableMap[session.user_type];
  const user = await getOne(`SELECT * FROM ${table} WHERE id = $1`, [session.user_id]);
  if (!user) return unauthorized();

  const { password_hash, ...safeUser } = user;
  return successRes({ userId: session.user_id, userType: session.user_type, user: safeUser });
}
