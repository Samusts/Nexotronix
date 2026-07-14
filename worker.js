/**
 * Nexotronix Cloudflare Worker — v4.2
 * 
 * Add these secrets in Cloudflare Worker → Settings → Variables:
 *   GITHUB_TOKEN   — your ghp_... token
 *   ANTHROPIC_KEY  — your sk-ant-... key
 *   VAPID_PUBLIC_KEY   — from web-push-codelab.glitch.me
 *   VAPID_PRIVATE_KEY  — from web-push-codelab.glitch.me
 *   VAPID_SUBJECT      — mailto:youremail@gmail.com
 */

const ALLOWED_ORIGINS = [
  'https://samusts.github.io',
  'https://nexotronix.vercel.app'
];
function corsFor(request) {
  const origin = request.headers.get('Origin') || '';
  const allow = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}
let CORS = ALLOWED_ORIGINS.reduce((h, o) => h, {
  'Access-Control-Allow-Origin': ALLOWED_ORIGINS[0],
  'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
});

const GITHUB_REPO = 'samusts/Nexotronix';

// Rate limiter
const rateLimits = new Map();
function checkRate(ip, key, max, ms = 60000) {
  const k = `${ip}:${key}`;
  const now = Date.now();
  const entry = rateLimits.get(k) || { n: 0, reset: now + ms };
  if (now > entry.reset) { entry.n = 0; entry.reset = now + ms; }
  entry.n++;
  rateLimits.set(k, entry);
  return entry.n <= max;
}

// Verify a session token issued by /auth/login
async function verifyToken(request, env, requiredSite) {
  const auth = request.headers.get('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!token || !env.NEXOTRONIX_KV) return false;
  const raw = await env.NEXOTRONIX_KV.get('session_' + token);
  if (!raw) return false;
  try {
    const session = JSON.parse(raw);
    if (session.expiresAt < Date.now()) return false;
    if (requiredSite && session.site !== requiredSite) return false;
    return true;
  } catch { return false; }
}

// Helpers
function jsonRes(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { 'Content-Type': 'application/json', ...CORS }
  });
}
function errRes(msg, status = 400) {
  return new Response(JSON.stringify({ error: msg }), {
    status, headers: { 'Content-Type': 'application/json', ...CORS }
  });
}

// GitHub file helpers
async function ghRead(file, token) {
  const res = await fetch(
    `https://api.github.com/repos/${GITHUB_REPO}/contents/${file}`,
    { headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json', 'User-Agent': 'Nexotronix' } }
  );
  return res;
}

async function ghWrite(file, content, sha, message, token) {
  const body = { message, content: btoa(unescape(encodeURIComponent(content))) };
  if (sha) body.sha = sha;
  return fetch(
    `https://api.github.com/repos/${GITHUB_REPO}/contents/${file}`,
    {
      method: 'PUT',
      headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json', 'Content-Type': 'application/json', 'User-Agent': 'Nexotronix' },
      body: JSON.stringify(body)
    }
  );
}

export default {
  async fetch(request, env) {
    CORS = corsFor(request);

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS });
    }

    const url = new URL(request.url);
    const path = url.pathname;
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';

    // ── REAL SERVER-SIDE LOGIN (replaces client-side password checks) ──
    if (path === '/auth/login' && request.method === 'POST') {
      if (!checkRate(ip, 'login:' + ip, 8, 15 * 60000)) {
        return errRes('Too many attempts. Wait 15 minutes.', 429);
      }
      if (!env.NEXOTRONIX_KV) return errRes('KV not bound — cannot authenticate', 500);
      let body;
      try { body = await request.json(); } catch { return errRes('Invalid JSON'); }
      const { site, username, password } = body;
      const kvKey = 'auth_' + (site === 'erp' ? 'erp' : 'admin');

      // Credentials live in KV (so they can be changed later via /auth/change-password).
      // First run: seed from the Worker secret, then never touch the secret again.
      let stored = await env.NEXOTRONIX_KV.get(kvKey);
      let creds;
      if (stored) {
        creds = JSON.parse(stored);
      } else {
        const seedPass = site === 'erp' ? env.ERP_PASSWORD : env.ADMIN_PASSWORD;
        if (!seedPass) return errRes('Server not configured for login', 500);
        creds = { user: site === 'erp' ? (env.ERP_USERNAME || 'admin') : 'admin', pass: seedPass };
        await env.NEXOTRONIX_KV.put(kvKey, JSON.stringify(creds));
      }

      if (username !== creds.user || password !== creds.pass) {
        return errRes('Incorrect username or password', 401);
      }

      const token = crypto.randomUUID() + crypto.randomUUID();
      const ttlMs = 12 * 60 * 60 * 1000; // 12 hour session
      await env.NEXOTRONIX_KV.put('session_' + token, JSON.stringify({ site, expiresAt: Date.now() + ttlMs }), { expirationTtl: 12 * 60 * 60 });
      return jsonRes({ token, expiresIn: ttlMs });
    }

    // ── Change password (requires a valid session for that site) ──
    if (path === '/auth/change-password' && request.method === 'POST') {
      let body;
      try { body = await request.json(); } catch { return errRes('Invalid JSON'); }
      const { site, newUsername, newPassword } = body;
      if (!(await verifyToken(request, env, site === 'erp' ? 'erp' : 'admin'))) {
        return errRes('Unauthorized', 401);
      }
      if (!newPassword && !newUsername) return errRes('Nothing to update');
      const kvKey = 'auth_' + (site === 'erp' ? 'erp' : 'admin');
      const stored = await env.NEXOTRONIX_KV.get(kvKey);
      const creds = stored ? JSON.parse(stored) : { user: 'admin', pass: '' };
      if (newUsername) creds.user = newUsername;
      if (newPassword) creds.pass = newPassword;
      await env.NEXOTRONIX_KV.put(kvKey, JSON.stringify(creds));
      return jsonRes({ ok: true });
    }

    // ── ERP KV STORE (Cloudflare KV — shared online ERP data) ──
    if (path.startsWith('/kv/')) {
      const key = path.slice(4);
      const ALLOWED_KEYS = ['invoices','quotations','receipts','estimates','customers','projects','expenses','audit','settings'];
      if (!ALLOWED_KEYS.includes(key)) return errRes('Unknown key', 404);

      if (!(await verifyToken(request, env, 'erp'))) return errRes('Unauthorized', 401);
      if (!env.NEXOTRONIX_KV) return errRes('KV not bound on this Worker', 500);

      if (request.method === 'GET') {
        const val = await env.NEXOTRONIX_KV.get('erp_' + key);
        return jsonRes({ key, value: val ? JSON.parse(val) : null });
      }
      if (request.method === 'POST' || request.method === 'PUT') {
        if (!checkRate(ip, 'kvwrite', 60)) return errRes('Rate limit exceeded', 429);
        let body;
        try { body = await request.json(); } catch { return errRes('Invalid JSON'); }
        const serialized = JSON.stringify(body.value);
        if (serialized.length > 2 * 1024 * 1024) return errRes('Value too large (max 2MB)', 413);
        await env.NEXOTRONIX_KV.put('erp_' + key, serialized);
        return jsonRes({ ok: true, key });
      }
      return errRes('Method not allowed', 405);
    }

    // ── Health check ─────────────────────────────────────────
    if (path === '/health') {
      return jsonRes({
        status: 'ok',
        worker: 'Nexotronix v4.4',
        ai: !!env.ANTHROPIC_KEY,
        db: !!env.GITHUB_TOKEN,
        push: !!env.VAPID_PRIVATE_KEY,
        kvBound: !!env.NEXOTRONIX_KV,
        adminPasswordSet: !!env.ADMIN_PASSWORD,
        erpPasswordSet: !!env.ERP_PASSWORD,
        time: new Date().toISOString()
      });
    }

    // ── AI Chat ───────────────────────────────────────────────
    if (path === '/ai' && request.method === 'POST') {
      if (!checkRate(ip, 'ai', 20)) return errRes('Rate limit exceeded. Wait 1 minute.', 429);

      let body;
      try { body = await request.json(); } catch { return errRes('Invalid JSON'); }
      if (!body.messages || !Array.isArray(body.messages)) return errRes('Missing messages array');

      const messages = body.messages.slice(-10).map(m => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        content: String(m.content || '').slice(0, 2000)
      }));

      const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': env.ANTHROPIC_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: String(body.system || 'You are Nexotronix AI assistant.').slice(0, 3000),
          messages
        })
      });

      if (!aiRes.ok) {
        const txt = await aiRes.text();
        console.error('Anthropic error:', txt);
        return errRes('AI temporarily unavailable', 503);
      }

      return jsonRes(await aiRes.json());
    }

    // ── Database Read ─────────────────────────────────────────
    if (path === '/db' && request.method === 'GET') {
      const res = await ghRead('db.json', env.GITHUB_TOKEN);
      if (!res.ok) return errRes('Database read failed', 502);
      return jsonRes(await res.json());
    }

    // ── Database Write ────────────────────────────────────────
    if (path === '/db' && request.method === 'PUT') {
      if (!(await verifyToken(request, env, 'admin'))) return errRes('Unauthorized', 401);
      if (!checkRate(ip, 'db-write', 30)) return errRes('Too many writes. Wait.', 429);

      let body;
      try { body = await request.json(); } catch { return errRes('Invalid JSON'); }
      if (!body.content || !body.message) return errRes('Missing content or message');

      // Validate JSON structure before writing
      try {
        const decoded = JSON.parse(decodeURIComponent(escape(atob(body.content.replace(/\n/g, '')))));
        if (!decoded.products || !Array.isArray(decoded.products)) {
          return errRes('Invalid database structure');
        }
      } catch (validErr) {
        console.error('Validation error:', validErr);
        return errRes('Corrupted content — write rejected');
      }

      const writeRes = await fetch(
        `https://api.github.com/repos/${GITHUB_REPO}/contents/db.json`,
        {
          method: 'PUT',
          headers: {
            Authorization: `token ${env.GITHUB_TOKEN}`,
            Accept: 'application/vnd.github.v3+json',
            'Content-Type': 'application/json',
            'User-Agent': 'Nexotronix'
          },
          body: JSON.stringify(body)
        }
      );

      if (!writeRes.ok) {
        const txt = await writeRes.text();
        console.error('GitHub write error:', txt);
        return errRes('Database write failed', 502);
      }

      const writeData = await writeRes.json();
      return jsonRes({ success: true, sha: writeData.content?.sha });
    }

    // ── Review Moderation ─────────────────────────────────────
    if (path === '/moderate' && request.method === 'POST') {
      if (!checkRate(ip, 'moderate', 10)) return errRes('Rate limit', 429);

      let body;
      try { body = await request.json(); } catch { return errRes('Invalid JSON'); }

      const modRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': env.ANTHROPIC_KEY,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 10,
          system: 'You moderate reviews for Nexotronix tech store. Reply ONLY with "APPROVE" or "REJECT".',
          messages: [{ role: 'user', content: `Review: "${String(body.text || '').slice(0, 500)}"` }]
        })
      });

      const modData = await modRes.json();
      const verdict = modData.content?.[0]?.text?.trim().toUpperCase() || 'REJECT';
      return jsonRes({ verdict: verdict.includes('APPROVE') ? 'APPROVE' : 'REJECT' });
    }

    // ── Push Subscribe ────────────────────────────────────────
    if (path === '/push/subscribe' && request.method === 'POST') {
      if (!checkRate(ip, 'push-sub', 5)) return errRes('Rate limit', 429);

      let body;
      try { body = await request.json(); } catch { return errRes('Invalid JSON'); }
      if (!body.subscription?.endpoint) return errRes('Invalid subscription');

      // Read existing subscribers
      let subs = [];
      let sha = null;
      const subsRes = await ghRead('subscribers.json', env.GITHUB_TOKEN);
      if (subsRes.ok) {
        try {
          const subsData = await subsRes.json();
          sha = subsData.sha;
          subs = JSON.parse(decodeURIComponent(escape(atob(subsData.content.replace(/\n/g, '')))));
        } catch { subs = []; }
      }

      // Add if new
      const alreadyExists = subs.some(s => s.endpoint === body.subscription.endpoint);
      if (!alreadyExists) {
        subs.push({ ...body.subscription, addedAt: Date.now() });
        await ghWrite('subscribers.json', JSON.stringify(subs), sha, 'Add subscriber', env.GITHUB_TOKEN);
      }

      return jsonRes({ success: true, total: subs.length });
    }

    // ── Push Send (admin) ─────────────────────────────────────
    if (path === '/push/send' && request.method === 'POST') {
      if (!(await verifyToken(request, env, 'admin'))) return errRes('Unauthorized', 401);
      if (!checkRate(ip, 'push-send', 10)) return errRes('Rate limit', 429);
      if (!env.VAPID_PRIVATE_KEY) return errRes('VAPID not configured', 503);

      let body;
      try { body = await request.json(); } catch { return errRes('Invalid JSON'); }
      if (!body.title || !body.body) return errRes('Title and body required');

      // Read subscribers
      const subsRes = await ghRead('subscribers.json', env.GITHUB_TOKEN);
      if (!subsRes.ok) return jsonRes({ sent: 0, message: 'No subscribers yet' });

      let subs = [];
      let sha = null;
      try {
        const subsData = await subsRes.json();
        sha = subsData.sha;
        subs = JSON.parse(decodeURIComponent(escape(atob(subsData.content.replace(/\n/g, '')))));
      } catch { return jsonRes({ sent: 0 }); }

      if (!subs.length) return jsonRes({ sent: 0 });

      const payload = JSON.stringify({
        title: body.title,
        body: body.body,
        icon: '/Nexotronix/icon.png',
        badge: '/Nexotronix/icon.png',
        url: body.url || '/Nexotronix/',
        timestamp: Date.now()
      });

      let sent = 0;
      const expired = [];

      for (const sub of subs) {
        try {
          const pushRes = await sendPush(sub, payload, env.VAPID_PRIVATE_KEY, env.VAPID_PUBLIC_KEY, env.VAPID_SUBJECT);
          if (pushRes.ok || pushRes.status === 201) {
            sent++;
          } else if (pushRes.status === 410 || pushRes.status === 404) {
            expired.push(sub.endpoint);
          }
        } catch (pushErr) {
          console.error('Push error for subscriber:', pushErr);
          expired.push(sub.endpoint);
        }
      }

      // Clean expired subscriptions
      if (expired.length > 0) {
        const validSubs = subs.filter(s => !expired.includes(s.endpoint));
        await ghWrite('subscribers.json', JSON.stringify(validSubs), sha, 'Remove expired subscribers', env.GITHUB_TOKEN);
      }

      return jsonRes({ success: true, sent, expired: expired.length });
    }

    // ── 404 ───────────────────────────────────────────────────
    return errRes('Route not found. Try /health', 404);
  }
};

// ── Web Push Signing (VAPID) ──────────────────────────────────
function b64url(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

async function sendPush(sub, payload, vapidPrivKey, vapidPubKey, vapidSubject) {
  const enc = new TextEncoder();
  const audience = new URL(sub.endpoint).origin;
  const now = Math.floor(Date.now() / 1000);

  const header = b64url(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const claims = b64url(enc.encode(JSON.stringify({ aud: audience, exp: now + 43200, sub: vapidSubject })));
  const sigInput = `${header}.${claims}`;

  const privBytes = Uint8Array.from(atob(vapidPrivKey.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('pkcs8', privBytes, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, enc.encode(sigInput));
  const jwt = `${sigInput}.${b64url(sig)}`;

  return fetch(sub.endpoint, {
    method: 'POST',
    headers: {
      Authorization: `vapid t=${jwt},k=${vapidPubKey}`,
      'Content-Type': 'application/octet-stream',
      TTL: '86400',
    },
    body: enc.encode(payload)
  });
}
