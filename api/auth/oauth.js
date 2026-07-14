// ============================================================
// POST /api/auth/oauth
// Google + Facebook OAuth callback handler
// ============================================================
import { getOne, query } from '../../lib/db.js';
import {
  generateOTP, storeOTP, checkRateLimit,
  createSession, auditLog
} from '../../lib/security.js';
import { successRes, errorRes } from '../../middleware/auth.js';
import { handleOptions } from '../../lib/cors.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return handleOptions(req);
  if (req.method !== 'POST') return errorRes('Method not allowed', 405);

  const ip = req.headers['x-forwarded-for'] || 'unknown';
  const ua = req.headers['user-agent'] || '';

  const rateCheck = await checkRateLimit(`oauth:${ip}`, 10, 5);
  if (!rateCheck.allowed) return errorRes('Too many requests', 429);

  const { provider, accessToken, userType } = req.body || {};
  if (!provider || !accessToken || !userType) return errorRes('Missing fields');
  if (!['google', 'facebook'].includes(provider)) return errorRes('Invalid provider');

  // Verify token with provider and get user info
  let providerUser;
  try {
    providerUser = provider === 'google'
      ? await verifyGoogleToken(accessToken)
      : await verifyFacebookToken(accessToken);
  } catch (e) {
    return errorRes('OAuth verification failed. Please try again.', 401);
  }

  const { id: providerId, email, name, picture } = providerUser;
  const idField = provider === 'google' ? 'google_id' : 'facebook_id';

  // ── FIND USER ───────────────────────────────────────────
  let user = null;
  let table = null;

  if (userType === 'customer') {
    // Customers: find by OAuth ID first, then email, then create new
    user = await getOne(
      `SELECT * FROM customers WHERE ${idField} = $1`,
      [providerId]
    );
    if (!user && email) {
      user = await getOne(
        'SELECT * FROM customers WHERE email = $1',
        [email]
      );
      if (user) {
        // Link OAuth ID to existing account
        await query(
          `UPDATE customers SET ${idField} = $1 WHERE id = $2`,
          [providerId, user.id]
        );
      }
    }
    if (!user) {
      // Create new customer account
      const result = await query(
        `INSERT INTO customers (full_name, email, ${idField}, profile_photo, is_active)
         VALUES ($1, $2, $3, $4, TRUE) RETURNING *`,
        [name, email, providerId, picture]
      );
      user = result.rows[0];
    }
    table = 'customers';

  } else {
    // Sub-admins and partners: must already exist with this email
    // You created their account — they can't self-register
    const tableMap = {
      superadmin: 'superadmin',
      subadmin: 'subadmins',
      partner: 'partners'
    };
    table = tableMap[userType];
    if (!table) return errorRes('Invalid user type');

    user = await getOne(
      `SELECT * FROM ${table} WHERE ${idField} = $1`,
      [providerId]
    );
    if (!user && email) {
      user = await getOne(
        `SELECT * FROM ${table} WHERE email = $1`,
        [email]
      );
      if (user) {
        await query(
          `UPDATE ${table} SET ${idField} = $1 WHERE id = $2`,
          [providerId, user.id]
        );
      }
    }
    if (!user) {
      return errorRes('No account found. Contact your administrator.', 404);
    }

    const activeField = userType === 'superadmin' ? null : 'is_active';
    if (activeField && !user[activeField]) {
      return errorRes('Your account has been suspended.', 403);
    }

    // Non-customers still need SMS OTP as second factor
    if (!user.phone) {
      return errorRes('No phone number on file for OTP verification.');
    }

    const otp = generateOTP();
    await storeOTP(user.phone, otp, 'login', userType, 2);

    try {
      await sendSMS(user.phone, otp);
    } catch (e) {
      if (process.env.NODE_ENV !== 'production') {
        console.log(`[DEV OTP] ${user.phone}: ${otp}`);
      }
    }

    const preAuthToken = Buffer.from(JSON.stringify({
      userId: user.id,
      userType,
      phone: user.phone,
      exp: Date.now() + 5 * 60 * 1000
    })).toString('base64');

    return successRes({
      step: 'otp_required',
      preAuthToken,
      message: `Verification code sent to your phone`
    });
  }

  // Customers get a session directly (no extra OTP after OAuth)
  if (!user.is_active) return errorRes('Account suspended.', 403);

  const { token, expiresAt } = await createSession(user.id, 'customer', ip, ua);
  await query('UPDATE customers SET last_login = NOW() WHERE id = $1', [user.id]);
  await auditLog(user.id, 'customer', 'LOGIN_OAUTH', 'customers', user.id, { provider }, ip);

  return successRes({ token, expiresAt, userType: 'customer', userId: user.id });
}

async function verifyGoogleToken(token) {
  const res = await fetch(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${token}`
  );
  if (!res.ok) throw new Error('Invalid Google token');
  const data = await res.json();
  if (data.aud !== process.env.GOOGLE_CLIENT_ID) throw new Error('Token mismatch');
  return { id: data.sub, email: data.email, name: data.name, picture: data.picture };
}

async function verifyFacebookToken(token) {
  const appToken = `${process.env.FACEBOOK_APP_ID}|${process.env.FACEBOOK_APP_SECRET}`;
  const verifyRes = await fetch(
    `https://graph.facebook.com/debug_token?input_token=${token}&access_token=${appToken}`
  );
  const verify = await verifyRes.json();
  if (!verify.data?.is_valid) throw new Error('Invalid Facebook token');

  const userRes = await fetch(
    `https://graph.facebook.com/me?fields=id,name,email,picture&access_token=${token}`
  );
  const userData = await userRes.json();
  return { id: userData.id, email: userData.email, name: userData.name, picture: userData.picture?.data?.url };
}

async function sendSMS(phone, otp) {
  const apiKey = process.env.TERMII_API_KEY;
  if (!apiKey) throw new Error('Termii not configured');
  let formatted = phone.replace(/[^0-9]/g, '');
  if (formatted.startsWith('0')) formatted = '234' + formatted.slice(1);
  if (!formatted.startsWith('234')) formatted = '234' + formatted;
  await fetch('https://api.ng.termii.com/api/sms/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to: formatted, from: 'Nexotronix',
      sms: `Your Nexotronix verification code is: ${otp}. Valid for 2 minutes.`,
      type: 'plain', api_key: apiKey, channel: 'generic'
    })
  });
}
