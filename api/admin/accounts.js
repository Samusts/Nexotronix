// ============================================================
// /api/admin/accounts
// GET  — list all accounts (subadmins + partners + customers)
// POST — create new subadmin or partner account
// PUT  — update account / toggle permissions (immediate effect)
// DELETE — suspend or delete account
// ============================================================
import { getMany, getOne, query, insertOne } from '../../lib/db.js';
import {
  hashPassword, sanitizeString, sanitizeEmail,
  sanitizePhone, auditLog, checkRateLimit
} from '../../lib/security.js';
import {
  verifySession, successRes, errorRes, unauthorized
} from '../../middleware/auth.js';
import { handleOptions } from '../../lib/cors.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return handleOptions(req);

  const ip = req.headers['x-forwarded-for'] || 'unknown';
  const session = await verifySession(req, ['superadmin', 'subadmin']);
  if (!session) return unauthorized();

  // ── GET — List accounts ──────────────────────────────────
  if (req.method === 'GET') {
    const { type } = req.query || {};

    if (type === 'subadmins') {
      const rows = await getMany(
        `SELECT s.*, p.* FROM subadmins s
         LEFT JOIN subadmin_permissions p ON p.subadmin_id = s.id
         ORDER BY s.created_at DESC`
      );
      return successRes({ accounts: rows });
    }

    if (type === 'partners') {
      const rows = await getMany(
        `SELECT p.*, pp.*, w.available_balance, w.pending_balance
         FROM partners p
         LEFT JOIN partner_permissions pp ON pp.partner_id = p.id
         LEFT JOIN wallets w ON w.partner_id = p.id
         ORDER BY p.created_at DESC`
      );
      return successRes({ accounts: rows });
    }

    if (type === 'customers') {
      const rows = await getMany(
        `SELECT id, full_name, email, phone, is_active, last_login, created_at
         FROM customers ORDER BY created_at DESC LIMIT 100`
      );
      return successRes({ accounts: rows });
    }

    // Return counts of all
    const [subCount, partnerCount, custCount] = await Promise.all([
      getOne('SELECT COUNT(*) as count FROM subadmins'),
      getOne('SELECT COUNT(*) as count FROM partners'),
      getOne('SELECT COUNT(*) as count FROM customers')
    ]);
    return successRes({
      counts: {
        subadmins: subCount?.count || 0,
        partners: partnerCount?.count || 0,
        customers: custCount?.count || 0
      }
    });
  }

  // ── Only superadmin can create / modify / delete ─────────
  if (session.user_type !== 'superadmin') return unauthorized('Super admin only');

  // ── POST — Create account ────────────────────────────────
  if (req.method === 'POST') {
    const { accountType, username, password, email, phone, fullName, businessName } = req.body || {};
    if (!accountType || !password || !email || !phone) {
      return errorRes('Missing required fields');
    }

    const cleanEmail = sanitizeEmail(email);
    const cleanPhone = sanitizePhone(phone);
    const cleanUsername = sanitizeString(username || email.split('@')[0], 50);
    if (!cleanEmail) return errorRes('Invalid email');
    if (!cleanPhone) return errorRes('Invalid phone number');

    const passwordHash = await hashPassword(password);

    if (accountType === 'subadmin') {
      const existing = await getOne(
        'SELECT id FROM subadmins WHERE email = $1 OR username = $2',
        [cleanEmail, cleanUsername]
      );
      if (existing) return errorRes('Email or username already exists');

      const subadmin = await insertOne(
        `INSERT INTO subadmins
         (username, password_hash, email, phone, full_name, created_by)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [cleanUsername, passwordHash, cleanEmail, cleanPhone,
         sanitizeString(fullName || '', 100), session.user_id]
      );

      // Create default permissions (all OFF)
      await query(
        `INSERT INTO subadmin_permissions (subadmin_id)
         VALUES ($1)`,
        [subadmin.id]
      );

      await auditLog(session.user_id, 'superadmin', 'CREATE_SUBADMIN',
        'subadmins', subadmin.id, { email: cleanEmail }, ip);

      return successRes({ account: { ...subadmin, password_hash: undefined } });
    }

    if (accountType === 'partner') {
      if (!businessName) return errorRes('Business name required');
      const cleanBusiness = sanitizeString(businessName, 100);
      const slug = cleanBusiness.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

      const existing = await getOne(
        'SELECT id FROM partners WHERE email = $1 OR username = $2 OR slug = $3',
        [cleanEmail, cleanUsername, slug]
      );
      if (existing) return errorRes('Email, username, or business name already exists');

      const partner = await insertOne(
        `INSERT INTO partners
         (username, password_hash, email, phone, business_name, slug, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [cleanUsername, passwordHash, cleanEmail, cleanPhone,
         cleanBusiness, slug, session.user_id]
      );

      // Default permissions (all ON for partners)
      await query(
        `INSERT INTO partner_permissions (partner_id) VALUES ($1)`,
        [partner.id]
      );

      // Create wallet
      await query(
        `INSERT INTO wallets (partner_id) VALUES ($1)`,
        [partner.id]
      );

      await auditLog(session.user_id, 'superadmin', 'CREATE_PARTNER',
        'partners', partner.id, { email: cleanEmail, businessName: cleanBusiness }, ip);

      return successRes({ account: { ...partner, password_hash: undefined } });
    }

    return errorRes('Invalid account type');
  }

  // ── PUT — Update permissions or details ──────────────────
  if (req.method === 'PUT') {
    const { accountId, accountType, permissions, isActive } = req.body || {};
    if (!accountId || !accountType) return errorRes('Missing accountId or accountType');

    if (permissions) {
      if (accountType === 'subadmin') {
        const fields = Object.keys(permissions)
          .filter(k => typeof permissions[k] === 'boolean');
        if (fields.length) {
          const setClause = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
          const values = fields.map(f => permissions[f]);
          await query(
            `UPDATE subadmin_permissions SET ${setClause}, updated_at = NOW()
             WHERE subadmin_id = $1`,
            [accountId, ...values]
          );
          await auditLog(session.user_id, 'superadmin', 'UPDATE_PERMISSIONS',
            'subadmin_permissions', accountId, permissions, ip);
        }
      }

      if (accountType === 'partner') {
        const fields = Object.keys(permissions)
          .filter(k => typeof permissions[k] === 'boolean');
        if (fields.length) {
          const setClause = fields.map((f, i) => `${f} = $${i + 2}`).join(', ');
          const values = fields.map(f => permissions[f]);
          await query(
            `UPDATE partner_permissions SET ${setClause}, updated_at = NOW()
             WHERE partner_id = $1`,
            [accountId, ...values]
          );
          await auditLog(session.user_id, 'superadmin', 'UPDATE_PERMISSIONS',
            'partner_permissions', accountId, permissions, ip);
        }
      }
    }

    if (typeof isActive === 'boolean') {
      const tableMap = { subadmin: 'subadmins', partner: 'partners', customer: 'customers' };
      const table = tableMap[accountType];
      if (table) {
        await query(`UPDATE ${table} SET is_active = $1 WHERE id = $2`, [isActive, accountId]);
        await auditLog(session.user_id, 'superadmin',
          isActive ? 'ACTIVATE_ACCOUNT' : 'SUSPEND_ACCOUNT',
          table, accountId, {}, ip);
      }
    }

    return successRes({ ok: true });
  }

  return errorRes('Method not allowed', 405);
}
