// ============================================================
// POST /api/products/approve
// Approve or reject a pending product
// ============================================================
import { getOne, query } from '../../lib/db.js';
import { sanitizeString, auditLog } from '../../lib/security.js';
import { verifySession, successRes, errorRes, unauthorized, checkPermission } from '../../middleware/auth.js';
import { handleOptions } from '../../lib/cors.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return handleOptions(req);
  if (req.method !== 'POST') return errorRes('Method not allowed', 405);

  const ip = req.headers['x-forwarded-for'] || 'unknown';
  const session = await verifySession(req, ['superadmin', 'subadmin']);
  if (!session) return unauthorized();

  if (session.user_type === 'subadmin') {
    const canApprove = await checkPermission(session.user_id, 'approve_products');
    if (!canApprove) return unauthorized('No permission to approve products');
  }

  const { productId, action, reason } = req.body || {};
  if (!productId || !['approve', 'reject'].includes(action)) {
    return errorRes('Missing productId or invalid action');
  }

  const product = await getOne('SELECT * FROM products WHERE id = $1', [productId]);
  if (!product) return errorRes('Product not found', 404);
  if (product.status !== 'pending') return errorRes('Product is not pending approval');

  if (action === 'approve') {
    await query(
      `UPDATE products SET status = 'approved', approved_by = $1, approved_at = NOW()
       WHERE id = $2`,
      [session.user_id, productId]
    );
    await auditLog(session.user_id, session.user_type, 'APPROVE_PRODUCT',
      'products', productId, {}, ip);
    return successRes({ ok: true, message: 'Product approved and now live' });
  }

  if (action === 'reject') {
    const cleanReason = sanitizeString(reason || 'Does not meet requirements', 500);
    await query(
      `UPDATE products SET status = 'rejected', rejection_reason = $1
       WHERE id = $2`,
      [cleanReason, productId]
    );
    await auditLog(session.user_id, session.user_type, 'REJECT_PRODUCT',
      'products', productId, { reason: cleanReason }, ip);
    return successRes({ ok: true, message: 'Product rejected' });
  }
}
