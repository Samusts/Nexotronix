// ============================================================
// POST /api/auth/send-otp
// For customer phone login — send OTP without password
// ============================================================
import { getOne, query } from '../../lib/db.js';
import {
  generateOTP, storeOTP, checkRateLimit, sanitizePhone
} from '../../lib/security.js';
import { successRes, errorRes } from '../../middleware/auth.js';
import { handleOptions } from '../../lib/cors.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return handleOptions(req);
  if (req.method !== 'POST') return errorRes('Method not allowed', 405);

  const ip = req.headers['x-forwarded-for'] || 'unknown';

  const rateCheck = await checkRateLimit(`send-otp:${ip}`, 5, 10);
  if (!rateCheck.allowed) return errorRes('Too many requests. Wait before trying again.', 429);

  const { phone } = req.body || {};
  if (!phone) return errorRes('Phone number required');

  const cleanPhone = sanitizePhone(phone);
  if (!cleanPhone) return errorRes('Invalid phone number');

  // Find or create customer
  let customer = await getOne(
    'SELECT * FROM customers WHERE phone = $1',
    [cleanPhone]
  );

  if (!customer) {
    // Auto-create account on first login
    customer = await query(
      `INSERT INTO customers (phone, is_active)
       VALUES ($1, TRUE) RETURNING *`,
      [cleanPhone]
    );
    customer = customer.rows[0];
  }

  if (!customer.is_active) {
    return errorRes('This account has been suspended. Contact support.', 403);
  }

  const otp = generateOTP();
  await storeOTP(cleanPhone, otp, 'login', 'customer', 2);

  // Send via Termii
  try {
    await sendSMS(cleanPhone, otp);
  } catch (e) {
    console.error('SMS error:', e.message);
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[DEV OTP] ${cleanPhone}: ${otp}`);
    }
  }

  // Pre-auth token for OTP verification step
  const preAuthToken = Buffer.from(JSON.stringify({
    userId: customer.id,
    userType: 'customer',
    phone: cleanPhone,
    exp: Date.now() + 5 * 60 * 1000
  })).toString('base64');

  return successRes({
    step: 'otp_required',
    preAuthToken,
    isNewUser: !customer.full_name,
    message: `Code sent to ${maskPhone(cleanPhone)}`
  });
}

async function sendSMS(phone, otp) {
  const apiKey = process.env.TERMII_API_KEY;
  if (!apiKey) throw new Error('Termii not configured');

  let formatted = phone.replace(/[^0-9]/g, '');
  if (formatted.startsWith('0')) formatted = '234' + formatted.slice(1);
  if (!formatted.startsWith('234')) formatted = '234' + formatted;

  const res = await fetch('https://api.ng.termii.com/api/sms/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to: formatted,
      from: 'Nexotronix',
      sms: `Your Nexotronix code is: ${otp}. Valid for 2 minutes. Never share this code.`,
      type: 'plain',
      api_key: apiKey,
      channel: 'generic'
    })
  });
  if (!res.ok) throw new Error('Termii failed');
}

function maskPhone(phone) {
  if (!phone || phone.length < 7) return '****';
  return phone.slice(0, 4) + '****' + phone.slice(-4);
}
