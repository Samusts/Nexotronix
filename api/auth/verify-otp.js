// ============================================================
// POST /api/auth/verify-otp
// Step 2 of login — verify OTP and issue real session
// ============================================================
import { getOne, query } from '../../lib/db.js';
import {
  verifyOTP, createSession, checkRateLimit, auditLog
} from '../../lib/security.js';
import { successRes, errorRes } from '../../middleware/auth.js';
import { handleOptions } from '../../lib/cors.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return handleOptions(req);
  if (req.method !== 'POST') return errorRes('Method not allowed', 405);

  const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';
  const ua = req.headers['user-agent'] || '';

  const rateCheck = await checkRateLimit(`otp:${ip}`, 10, 5);
  if (!rateCheck.allowed) return errorRes('Too many attempts', 429);

  const { preAuthToken, otp } = req.body || {};
  if (!preAuthToken || !otp) return errorRes('Missing required fields');

  // Decode the pre-auth token
  let preAuth;
  try {
    preAuth = JSON.parse(Buffer.from(preAuthToken, 'base64').toString());
  } catch {
    return errorRes('Invalid token', 401);
  }

  // Check token hasn't expired (5 min window)
  if (Date.now() > preAuth.exp) {
    return errorRes('OTP session expired. Please log in again.', 401);
  }

  const { userId, userType, phone } = preAuth;

  // Verify the OTP
  const result = await verifyOTP(phone, otp.trim(), 'login');
  if (!result.valid) {
    const messages = {
      expired: 'OTP has expired. Please log in again.',
      too_many_attempts: 'Too many incorrect attempts. Please log in again.',
      incorrect: 'Incorrect code. Please try again.'
    };
    return errorRes(messages[result.reason] || 'Invalid OTP', 401);
  }

  // Create a real session
  const { token, expiresAt } = await createSession(userId, userType, ip, ua);

  // Update last login
  const tableMap = {
    superadmin: 'superadmin',
    subadmin: 'subadmins',
    partner: 'partners',
    customer: 'customers'
  };
  const table = tableMap[userType];
  if (table) {
    await query(`UPDATE ${table} SET last_login = NOW() WHERE id = $1`, [userId]);
  }

  await auditLog(userId, userType, 'LOGIN_SUCCESS', table, userId, {}, ip);

  // For partners, get their permissions
  let permissions = null;
  if (userType === 'partner') {
    permissions = await getOne(
      'SELECT * FROM partner_permissions WHERE partner_id = $1',
      [userId]
    );
  }
  if (userType === 'subadmin') {
    permissions = await getOne(
      'SELECT * FROM subadmin_permissions WHERE subadmin_id = $1',
      [userId]
    );
  }

  return successRes({
    token,
    expiresAt,
    userType,
    userId,
    permissions
  });
}
