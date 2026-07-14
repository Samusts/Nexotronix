// ============================================================
// AUTH MIDDLEWARE — verifies every request server-side
// ============================================================
import { getOne } from '../lib/db.js';
import { corsHeaders } from '../lib/cors.js';

// Verify session token from Authorization header
export async function verifySession(request, allowedTypes = []) {
  const auth = request.headers.get('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (!token) return null;

  const session = await getOne(
    `SELECT s.*, s.user_type, s.user_id
     FROM sessions s
     WHERE s.token = $1
     AND s.expires_at > NOW()`,
    [token]
  );
  if (!session) return null;
  if (allowedTypes.length && !allowedTypes.includes(session.user_type)) return null;

  return session;
}

// Get full user object based on session
export async function getSessionUser(session) {
  if (!session) return null;
  const tableMap = {
    superadmin: 'superadmin',
    subadmin: 'subadmins',
    partner: 'partners',
    customer: 'customers'
  };
  const table = tableMap[session.user_type];
  if (!table) return null;

  return await getOne(
    `SELECT * FROM ${table} WHERE id = $1`,
    [session.user_id]
  );
}

// Check sub-admin permission
export async function checkPermission(subadminId, permission) {
  const perms = await getOne(
    `SELECT ${permission} FROM subadmin_permissions WHERE subadmin_id = $1`,
    [subadminId]
  );
  return perms?.[permission] === true;
}

// Check partner permission
export async function checkPartnerPermission(partnerId, permission) {
  const perms = await getOne(
    `SELECT ${permission} FROM partner_permissions WHERE partner_id = $1`,
    [partnerId]
  );
  return perms?.[permission] === true;
}

// Standard unauthorized response
export function unauthorized(message = 'Unauthorized') {
  return new Response(
    JSON.stringify({ error: message }),
    { status: 401, headers: { 'Content-Type': 'application/json', ...corsHeaders() } }
  );
}

// Standard error response
export function errorRes(message, status = 400) {
  return new Response(
    JSON.stringify({ error: message }),
    { status, headers: { 'Content-Type': 'application/json', ...corsHeaders() } }
  );
}

// Standard success response
export function successRes(data, status = 200) {
  return new Response(
    JSON.stringify(data),
    { status, headers: { 'Content-Type': 'application/json', ...corsHeaders() } }
  );
}
