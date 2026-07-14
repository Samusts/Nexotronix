// GET /api/chat/rooms — get chat rooms for a partner
import { getMany } from '../../lib/db.js';
import { verifySession, successRes, errorRes, unauthorized } from '../../middleware/auth.js';
import { handleOptions } from '../../lib/cors.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return handleOptions(req);
  if (req.method !== 'GET') return errorRes('Method not allowed', 405);

  const session = await verifySession(req, ['partner', 'superadmin']);
  if (!session) return unauthorized();

  const where = session.user_type === 'partner' ? 'WHERE cr.partner_id = $1' : '';
  const params = session.user_type === 'partner' ? [session.user_id] : [];

  const rooms = await getMany(
    `SELECT cr.*,
            COALESCE(c.full_name, c.phone) as customer_name,
            COUNT(CASE WHEN cm.is_read = FALSE AND cm.sender_type = 'customer' THEN 1 END) as unread
     FROM chat_rooms cr
     LEFT JOIN customers c ON c.id = cr.customer_id
     LEFT JOIN chat_messages cm ON cm.room_id = cr.id
     ${where}
     GROUP BY cr.id, c.full_name, c.phone
     ORDER BY cr.last_message_at DESC NULLS LAST`,
    params
  );
  return successRes({ rooms });
}
