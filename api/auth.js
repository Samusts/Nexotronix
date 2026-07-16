// ============================================================
// /api/auth — handles ALL auth actions in one function
// route via ?action= parameter
// ============================================================
import { getOne, query } from '../lib/db.js';
import { hashPassword, verifyPassword, createSession, deleteSession, generateOTP, storeOTP, verifyOTP, checkRateLimit, sanitizeString, sanitizeEmail, sanitizePhone, auditLog } from '../lib/security.js';
import { corsHeaders, handleOptions } from '../lib/cors.js';

function jsonRes(data, status = 200, origin) {
  return new Response(JSON.stringify(data), {
    status, headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) }
  });
}

export default async function handler(req, res) {
  const origin = req.headers['origin'] || '';
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(origin) });

  const ip = req.headers['x-forwarded-for'] || 'unknown';
  const ua = req.headers['user-agent'] || '';
  const action = req.query?.action;
  const body = req.body || {};

  // ── GET /api/auth?action=me ──────────────────────────────
  if (req.method === 'GET' && action === 'me') {
    const auth = req.headers['authorization'] || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
    if (!token) return jsonRes({ error: 'Unauthorized' }, 401, origin);
    const session = await getOne(`SELECT * FROM sessions WHERE token = $1 AND expires_at > NOW()`, [token]);
    if (!session) return jsonRes({ error: 'Unauthorized' }, 401, origin);
    const tableMap = { superadmin:'superadmin', subadmin:'subadmins', partner:'partners', customer:'customers' };
    const user = await getOne(`SELECT * FROM ${tableMap[session.user_type]} WHERE id = $1`, [session.user_id]);
    if (!user) return jsonRes({ error: 'Unauthorized' }, 401, origin);
    const { password_hash, ...safe } = user;
    return jsonRes({ userId: session.user_id, userType: session.user_type, user: safe }, 200, origin);
  }

  if (req.method !== 'POST') return jsonRes({ error: 'Method not allowed' }, 405, origin);

  // ── POST /api/auth?action=login ──────────────────────────
  if (action === 'login') {
    const { userType, username, email, phone, password } = body;
    if (!userType || !password) return jsonRes({ error: 'Missing fields' }, 400, origin);
    const rate = await checkRateLimit(`login:${ip}`, 8, 15);
    if (!rate.allowed) return jsonRes({ error: `Too many attempts. Wait ${rate.retryAfter}s` }, 429, origin);

    let user = null;
    if (userType === 'superadmin') {
      user = await getOne('SELECT * FROM superadmin WHERE username = $1', [sanitizeString(username||'')]);
    } else if (userType === 'subadmin') {
      const val = email ? sanitizeEmail(email) : sanitizeString(username||'');
      const field = email ? 'email' : 'username';
      user = await getOne(`SELECT * FROM subadmins WHERE ${field} = $1 AND is_active = TRUE`, [val]);
    } else if (userType === 'partner') {
      const val = email ? sanitizeEmail(email) : sanitizeString(username||'');
      const field = email ? 'email' : 'username';
      user = await getOne(`SELECT * FROM partners WHERE ${field} = $1 AND is_active = TRUE`, [val]);
    } else if (userType === 'customer') {
      const val = phone ? sanitizePhone(phone) : sanitizeEmail(email||'');
      const field = phone ? 'phone' : 'email';
      user = await getOne(`SELECT * FROM customers WHERE ${field} = $1 AND is_active = TRUE`, [val]);
    }

    if (!user) { await verifyPassword('dummy','$2b$12$invalid00000000000000000000000000000000000'); return jsonRes({ error: 'Incorrect credentials' }, 401, origin); }
    if (userType !== 'customer') {
      const ok = await verifyPassword(password, user.password_hash);
      if (!ok) return jsonRes({ error: 'Incorrect credentials' }, 401, origin);
    }

    const otp = generateOTP();
    await storeOTP(user.phone, otp, 'login', userType, 2);
    try { await sendSMS(user.phone, otp); } catch(e) { if (process.env.NODE_ENV !== 'production') console.log(`[OTP] ${user.phone}: ${otp}`); }

    const preAuthToken = Buffer.from(JSON.stringify({ userId: user.id, userType, phone: user.phone, exp: Date.now() + 5*60*1000 })).toString('base64');
    return jsonRes({ step: 'otp_required', preAuthToken, message: `Code sent to ${maskPhone(user.phone)}` }, 200, origin);
  }

  // ── POST /api/auth?action=verify-otp ────────────────────
  if (action === 'verify-otp') {
    const { preAuthToken, otp } = body;
    if (!preAuthToken || !otp) return jsonRes({ error: 'Missing fields' }, 400, origin);
    let preAuth;
    try { preAuth = JSON.parse(Buffer.from(preAuthToken, 'base64').toString()); } catch { return jsonRes({ error: 'Invalid token' }, 401, origin); }
    if (Date.now() > preAuth.exp) return jsonRes({ error: 'Session expired. Please log in again.' }, 401, origin);
    const result = await verifyOTP(preAuth.phone, otp.trim(), 'login');
    if (!result.valid) return jsonRes({ error: result.reason === 'expired' ? 'OTP expired' : result.reason === 'too_many_attempts' ? 'Too many attempts' : 'Incorrect code' }, 401, origin);
    const { token, expiresAt } = await createSession(preAuth.userId, preAuth.userType, ip, ua);
    const tableMap = { superadmin:'superadmin', subadmin:'subadmins', partner:'partners', customer:'customers' };
    await query(`UPDATE ${tableMap[preAuth.userType]} SET last_login = NOW() WHERE id = $1`, [preAuth.userId]);
    await auditLog(preAuth.userId, preAuth.userType, 'LOGIN_SUCCESS', tableMap[preAuth.userType], preAuth.userId, {}, ip);
    let permissions = null;
    if (preAuth.userType === 'partner') permissions = await getOne('SELECT * FROM partner_permissions WHERE partner_id = $1', [preAuth.userId]);
    if (preAuth.userType === 'subadmin') permissions = await getOne('SELECT * FROM subadmin_permissions WHERE subadmin_id = $1', [preAuth.userId]);
    return jsonRes({ token, expiresAt, userType: preAuth.userType, userId: preAuth.userId, permissions }, 200, origin);
  }

  // ── POST /api/auth?action=send-otp ──────────────────────
  if (action === 'send-otp') {
    const { phone } = body;
    if (!phone) return jsonRes({ error: 'Phone required' }, 400, origin);
    const rate = await checkRateLimit(`send-otp:${ip}`, 5, 10);
    if (!rate.allowed) return jsonRes({ error: 'Too many requests' }, 429, origin);
    const cleanPhone = sanitizePhone(phone);
    let customer = await getOne('SELECT * FROM customers WHERE phone = $1', [cleanPhone]);
    if (!customer) { const r = await query(`INSERT INTO customers (phone, is_active) VALUES ($1, TRUE) RETURNING *`, [cleanPhone]); customer = r.rows[0]; }
    if (!customer.is_active) return jsonRes({ error: 'Account suspended' }, 403, origin);
    const otp = generateOTP();
    await storeOTP(cleanPhone, otp, 'login', 'customer', 2);
    try { await sendSMS(cleanPhone, otp); } catch(e) { if (process.env.NODE_ENV !== 'production') console.log(`[OTP] ${cleanPhone}: ${otp}`); }
    const preAuthToken = Buffer.from(JSON.stringify({ userId: customer.id, userType: 'customer', phone: cleanPhone, exp: Date.now() + 5*60*1000 })).toString('base64');
    return jsonRes({ step: 'otp_required', preAuthToken, isNewUser: !customer.full_name, message: `Code sent to ${maskPhone(cleanPhone)}` }, 200, origin);
  }

  // ── POST /api/auth?action=logout ─────────────────────────
  if (action === 'logout') {
    const auth = req.headers['authorization'] || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
    if (token) await deleteSession(token);
    return jsonRes({ ok: true }, 200, origin);
  }

  // ── POST /api/auth?action=request-admin-otp ──────────────
  if (action === 'request-admin-otp') {
    const auth = req.headers['authorization'] || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
    const session = await getOne('SELECT * FROM sessions WHERE token = $1 AND expires_at > NOW()', [token]);
    if (!session) return jsonRes({ error: 'Unauthorized' }, 401, origin);
    const user = await getOne('SELECT * FROM superadmin WHERE id = $1', [session.user_id]);
    if (!user?.phone) return jsonRes({ error: 'No phone on file' }, 400, origin);
    const otp = generateOTP();
    await storeOTP(user.phone, otp, 'admin_action', 'superadmin', 2);
    try { await sendSMS(user.phone, otp); } catch(e) { if (process.env.NODE_ENV !== 'production') console.log(`[ADMIN OTP] ${otp}`); }
    return jsonRes({ ok: true, message: `Code sent to ${maskPhone(user.phone)}` }, 200, origin);
  }

  // ── POST /api/auth?action=verify-admin-otp ───────────────
  if (action === 'verify-admin-otp') {
    const auth = req.headers['authorization'] || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
    const session = await getOne('SELECT * FROM sessions WHERE token = $1 AND expires_at > NOW()', [token]);
    if (!session) return jsonRes({ error: 'Unauthorized' }, 401, origin);
    const user = await getOne('SELECT * FROM superadmin WHERE id = $1', [session.user_id]);
    const result = await verifyOTP(user.phone, (body.otp||'').trim(), 'admin_action');
    if (!result.valid) return jsonRes({ error: 'Incorrect or expired code' }, 401, origin);
    return jsonRes({ ok: true }, 200, origin);
  }

  return jsonRes({ error: 'Unknown action' }, 400, origin);
}

async function sendSMS(phone, otp) {
  const apiKey = process.env.TERMII_API_KEY;
  if (!apiKey) throw new Error('Termii not configured');
  let f = phone.replace(/[^0-9]/g,'');
  if (f.startsWith('0')) f = '234' + f.slice(1);
  if (!f.startsWith('234')) f = '234' + f;
  await fetch('https://api.ng.termii.com/api/sms/send', {
    method:'POST', headers:{'Content-Type':'application/json'},
    body: JSON.stringify({ to:f, from:'Nexotronix', sms:`Your Nexotronix code: ${otp}. Valid 2 mins. Never share.`, type:'plain', api_key:apiKey, channel:'generic' })
  });
}
function maskPhone(p) { if (!p||p.length<7) return '****'; return p.slice(0,4)+'****'+p.slice(-4); }
