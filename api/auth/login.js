// ============================================================
// POST /api/auth/login
// Handles login for all account types
// ============================================================
import { getOne, query } from '../../lib/db.js';
import {
  verifyPassword, createSession, generateOTP,
  storeOTP, checkRateLimit, sanitizeString,
  sanitizeEmail, sanitizePhone, auditLog
} from '../../lib/security.js';
import { successRes, errorRes } from '../../middleware/auth.js';
import { handleOptions } from '../../lib/cors.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return handleOptions(req);
  if (req.method !== 'POST') return errorRes('Method not allowed', 405);

  const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown';

  // Rate limit: 8 attempts per 15 minutes per IP
  const rateCheck = await checkRateLimit(`login:${ip}`, 8, 15);
  if (!rateCheck.allowed) {
    return errorRes(`Too many login attempts. Try again in ${rateCheck.retryAfter} seconds.`, 429);
  }

  const { userType, username, email, phone, password } = req.body || {};

  // Validate required fields
  if (!userType || !password) {
    return errorRes('Missing required fields');
  }

  let user = null;
  let table = null;

  // ── FIND USER ────────────────────────────────────────────
  if (userType === 'superadmin') {
    const u = sanitizeString(username);
    user = await getOne('SELECT * FROM superadmin WHERE username = $1', [u]);
    table = 'superadmin';

  } else if (userType === 'subadmin') {
    if (email) {
      const e = sanitizeEmail(email);
      user = await getOne('SELECT * FROM subadmins WHERE email = $1 AND is_active = TRUE', [e]);
    } else if (username) {
      const u = sanitizeString(username);
      user = await getOne('SELECT * FROM subadmins WHERE username = $1 AND is_active = TRUE', [u]);
    }
    table = 'subadmins';

  } else if (userType === 'partner') {
    if (email) {
      const e = sanitizeEmail(email);
      user = await getOne('SELECT * FROM partners WHERE email = $1 AND is_active = TRUE', [e]);
    } else if (username) {
      const u = sanitizeString(username);
      user = await getOne('SELECT * FROM partners WHERE username = $1 AND is_active = TRUE', [u]);
    }
    table = 'partners';

  } else if (userType === 'customer') {
    if (phone) {
      const p = sanitizePhone(phone);
      user = await getOne('SELECT * FROM customers WHERE phone = $1 AND is_active = TRUE', [p]);
    } else if (email) {
      const e = sanitizeEmail(email);
      user = await getOne('SELECT * FROM customers WHERE email = $1 AND is_active = TRUE', [e]);
    }
    table = 'customers';

  } else {
    return errorRes('Invalid user type');
  }

  // ── VERIFY PASSWORD ──────────────────────────────────────
  if (!user) {
    // Timing-safe: still run bcrypt to prevent timing attacks
    await verifyPassword('dummy', '$2b$12$invalidhashfortimingsafety000000000000000000');
    return errorRes('Incorrect credentials', 401);
  }

  // Customers using phone OTP don't have a password
  if (userType !== 'customer') {
    const passwordValid = await verifyPassword(password, user.password_hash);
    if (!passwordValid) {
      await auditLog(user.id, userType, 'LOGIN_FAILED', table, user.id, { reason: 'wrong_password' }, ip);
      return errorRes('Incorrect credentials', 401);
    }
  }

  // ── SEND SMS OTP (all types except customer-Google/FB) ───
  const otpPhone = user.phone;
  if (!otpPhone) {
    return errorRes('No phone number on file for OTP. Contact support.');
  }

  const otp = generateOTP();
  await storeOTP(otpPhone, otp, 'login', userType, 2);

  // Send via Termii
  try {
    await sendTermiiOTP(otpPhone, otp);
  } catch (e) {
    console.error('Termii error:', e.message);
    // In development, log the OTP for testing
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[DEV OTP] ${otpPhone}: ${otp}`);
    }
  }

  // Return a temporary pre-auth token (not a full session yet)
  const preAuthToken = Buffer.from(JSON.stringify({
    userId: user.id,
    userType,
    phone: otpPhone,
    exp: Date.now() + 5 * 60 * 1000 // 5 minutes to complete OTP
  })).toString('base64');

  return successRes({
    step: 'otp_required',
    preAuthToken,
    message: `OTP sent to ${maskPhone(otpPhone)}`
  });
}

// ── TERMII SMS ───────────────────────────────────────────────
async function sendTermiiOTP(phone, otp) {
  const apiKey = process.env.TERMII_API_KEY;
  if (!apiKey) throw new Error('Termii API key not configured');

  // Format Nigerian phone number
  let formatted = phone.replace(/[^0-9]/g, '');
  if (formatted.startsWith('0')) formatted = '234' + formatted.slice(1);
  if (!formatted.startsWith('234')) formatted = '234' + formatted;

  const res = await fetch('https://api.ng.termii.com/api/sms/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to: formatted,
      from: 'Nexotronix',
      sms: `Your Nexotronix login code is: ${otp}. Valid for 2 minutes. Do not share this code.`,
      type: 'plain',
      api_key: apiKey,
      channel: 'generic'
    })
  });

  if (!res.ok) throw new Error('Termii request failed');
}

// Mask phone for privacy: 080****6553
function maskPhone(phone) {
  if (!phone || phone.length < 7) return '****';
  return phone.slice(0, 4) + '****' + phone.slice(-4);
}
