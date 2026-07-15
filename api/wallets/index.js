// ============================================================
// /api/products
// GET    — list approved products (public storefront)
// POST   — create product (superadmin or partner)
// PUT    — update product
// DELETE — delete product
// ============================================================
import { getMany, getOne, query, insertOne } from '../../lib/db.js';
import {
  sanitizeString, auditLog, checkRateLimit
} from '../../lib/security.js';
import {
  verifySession, successRes, errorRes, unauthorized
} from '../../middleware/auth.js';
import { handleOptions } from '../../lib/cors.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return handleOptions(req);

  const ip = req.headers['x-forwarded-for'] || 'unknown';

  // ── GET — Public product listing ────────────────────────
  if (req.method === 'GET') {
    const {
      category, condition, search, minPrice, maxPrice,
      sort = 'created_at', order = 'DESC', limit = 50, offset = 0,
      owner, status
    } = req.query || {};

    let whereClause = `WHERE p.status = 'approved'`;
    const params = [];
    let pIdx = 1;

    if (category) {
      whereClause += ` AND c.slug = $${pIdx++}`;
      params.push(category);
    }
    if (condition) {
      whereClause += ` AND p.condition = $${pIdx++}`;
      params.push(condition);
    }
    if (minPrice) {
      whereClause += ` AND p.price >= $${pIdx++}`;
      params.push(Number(minPrice));
    }
    if (maxPrice) {
      whereClause += ` AND p.price <= $${pIdx++}`;
      params.push(Number(maxPrice));
    }
    if (search) {
      whereClause += ` AND (p.name ILIKE $${pIdx} OR p.description ILIKE $${pIdx})`;
      params.push(`%${search}%`);
      pIdx++;
    }
    if (owner) {
      whereClause += ` AND p.owner_id = $${pIdx++}`;
      params.push(owner);
    }

    const validSorts = ['price', 'created_at', 'sold_count', 'rating', 'view_count'];
    const safeSort = validSorts.includes(sort) ? sort : 'created_at';
    const safeOrder = order === 'ASC' ? 'ASC' : 'DESC';

    const products = await getMany(
      `SELECT p.*,
              c.name as category_name, c.emoji as category_emoji, c.slug as category_slug,
              COALESCE(pr.business_name, 'Nexotronix') as seller_name,
              COALESCE(pr.slug, '') as seller_slug,
              pr.is_verified as seller_verified,
              pr.rating as seller_rating,
              pi.url as primary_image,
              fd.deal_price, fd.ends_at as deal_ends_at
       FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       LEFT JOIN partners pr ON pr.id = p.owner_id AND p.owner_type = 'partner'
       LEFT JOIN product_images pi ON pi.product_id = p.id AND pi.is_primary = TRUE
       LEFT JOIN flash_deals fd ON fd.product_id = p.id AND fd.status = 'active' AND fd.ends_at > NOW()
       ${whereClause}
       ORDER BY p.${safeSort} ${safeOrder}
       LIMIT $${pIdx++} OFFSET $${pIdx++}`,
      [...params, Number(limit), Number(offset)]
    );

    // Track view analytics
    if (search) {
      await query(
        `INSERT INTO analytics_events (event_type, metadata, ip_address)
         VALUES ('search', $1, $2)`,
        [JSON.stringify({ query: search }), ip]
      );
    }

    return successRes({ products });
  }

  // ── Auth required for write operations ───────────────────
  const session = await verifySession(req, ['superadmin', 'subadmin', 'partner']);
  if (!session) return unauthorized();

  // ── POST — Create product ────────────────────────────────
  if (req.method === 'POST') {
    const rateCheck = await checkRateLimit(`product-create:${session.user_id}`, 20, 60);
    if (!rateCheck.allowed) return errorRes('Too many requests', 429);

    const {
      name, description, price, originalPrice, condition,
      categoryId, stock, emoji, specs, tags, allowOffers, images
    } = req.body || {};

    if (!name || !price) return errorRes('Name and price are required');

    const owner_id = session.user_id;
    const owner_type = session.user_type === 'superadmin' ? 'superadmin' : 'partner';

    // Partners: check permission and status is pending (needs approval)
    let productStatus = 'approved'; // superadmin auto-approved
    if (owner_type === 'partner') {
      const { checkPartnerPermission } = await import('../../middleware/auth.js');
      const canUpload = await checkPartnerPermission(owner_id, 'upload_products');
      if (!canUpload) return unauthorized('Upload permission not granted');
      productStatus = 'pending'; // Partners need approval
    }

    const product = await insertOne(
      `INSERT INTO products
       (owner_id, owner_type, name, description, price, original_price,
        condition, category_id, stock, emoji, specs, tags, allow_offers, status,
        approved_by, approved_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
      [
        owner_id, owner_type,
        sanitizeString(name, 200),
        sanitizeString(description || '', 5000),
        Number(price),
        originalPrice ? Number(originalPrice) : null,
        condition || 'new',
        categoryId || null,
        Number(stock || 0),
        emoji || '📦',
        JSON.stringify(specs || {}),
        tags || [],
        allowOffers === true,
        productStatus,
        productStatus === 'approved' ? session.user_id : null,
        productStatus === 'approved' ? new Date() : null
      ]
    );

    // Save images
    if (images && Array.isArray(images)) {
      for (let i = 0; i < Math.min(images.length, 5); i++) {
        await query(
          `INSERT INTO product_images (product_id, url, is_primary, sort_order)
           VALUES ($1, $2, $3, $4)`,
          [product.id, images[i], i === 0, i]
        );
      }
    }

    await auditLog(session.user_id, session.user_type, 'CREATE_PRODUCT',
      'products', product.id, { name, status: productStatus }, ip);

    return successRes({ product, status: productStatus });
  }

  return errorRes('Method not allowed', 405);
}
