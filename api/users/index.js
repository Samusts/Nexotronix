// /api/orders — list orders (partner sees their own, admin sees all)
import { getMany, getOne, query } from '../../lib/db.js';
import { verifySession, successRes, errorRes, unauthorized } from '../../middleware/auth.js';
import { sanitizeString, auditLog } from '../../lib/security.js';
import { handleOptions } from '../../lib/cors.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return handleOptions(req);

  const ip = req.headers['x-forwarded-for'] || 'unknown';
  const session = await verifySession(req, ['superadmin', 'subadmin', 'partner']);
  if (!session) return unauthorized();

  if (req.method === 'GET') {
    let orders;
    if (session.user_type === 'partner') {
      orders = await getMany(
        `SELECT o.*, oi.quantity, oi.unit_price, oi.status as item_status
         FROM orders o JOIN order_items oi ON oi.order_id = o.id
         WHERE oi.partner_id = $1 ORDER BY o.created_at DESC LIMIT 100`,
        [session.user_id]
      );
    } else {
      orders = await getMany(
        `SELECT o.*, c.full_name as customer_name, c.phone as customer_phone
         FROM orders o LEFT JOIN customers c ON c.id = o.customer_id
         ORDER BY o.created_at DESC LIMIT 100`
      );
    }
    return successRes({ orders });
  }

  return errorRes('Method not allowed', 405);
}
