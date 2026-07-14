/* ============================================================
   BUTTERSCOTCH — Sub-Admin + Partner Portal JS
   ============================================================ */
const API = '/api';
let _preAuthToken = null;
let _otpTimer = null;
let _otpResendTimer = null;
let _session = null;

// ── INIT ────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  applyTheme();
  checkExistingSession();
});

window.addEventListener('beforeunload', () => {
  // Clear session on close — sessionStorage auto-clears but make explicit
  if (_session) {
    sessionStorage.removeItem('bsc_token');
    sessionStorage.removeItem('bsc_usertype');
  }
});

function applyTheme() {
  const t = localStorage.getItem('bsc_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', t);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('bsc_theme', next);
}

async function checkExistingSession() {
  const token = sessionStorage.getItem('bsc_token');
  const userType = sessionStorage.getItem('bsc_usertype');
  if (!token || !userType) return;

  // Validate token is still live
  try {
    const res = await authFetch('/api/auth/me');
    if (res.ok) {
      _session = { token, userType };
      enterDashboard(userType);
      return;
    }
  } catch {}

  sessionStorage.removeItem('bsc_token');
  sessionStorage.removeItem('bsc_usertype');
}

// ── STEP 1: CREDENTIALS ─────────────────────────────────────
function focusPass() {
  document.getElementById('inp-password').focus();
}

function togglePass() {
  const inp = document.getElementById('inp-password');
  inp.type = inp.type === 'password' ? 'text' : 'password';
}

async function submitCredentials() {
  const username = document.getElementById('inp-username').value.trim();
  const password = document.getElementById('inp-password').value;
  const userType = document.getElementById('inp-type').value;
  const errEl = document.getElementById('cred-error');
  const btnText = document.getElementById('cred-btn-text');

  errEl.textContent = '';
  if (!username || !password) { errEl.textContent = 'Please fill in all fields'; return; }

  btnText.textContent = 'Verifying...';
  document.querySelector('.login-btn').disabled = true;

  try {
    const res = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userType,
        username: username.includes('@') ? undefined : username,
        email: username.includes('@') ? username : undefined,
        password
      })
    });

    const data = await res.json();

    if (!res.ok) {
      errEl.textContent = data.error || 'Incorrect credentials';
      return;
    }

    _preAuthToken = data.preAuthToken;
    showOTPStep(data.message);

  } catch (e) {
    errEl.textContent = '⚠️ Could not reach server. Check your connection.';
  } finally {
    btnText.textContent = 'Continue →';
    document.querySelector('.login-btn').disabled = false;
  }
}

// ── OAUTH ────────────────────────────────────────────────────
async function oauthLogin(provider) {
  const userType = document.getElementById('inp-type').value;

  if (provider === 'google') {
    const clientId = document.querySelector('meta[name="google-client-id"]')?.content
      || window.__GOOGLE_CLIENT_ID__;
    if (!clientId) {
      alert('Google login is not configured yet. Please use username/password.');
      return;
    }
    // Load Google GSI
    if (!window.google) {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      document.head.appendChild(script);
      script.onload = () => initGoogleLogin(clientId, userType);
      return;
    }
    initGoogleLogin(clientId, userType);
  }

  if (provider === 'facebook') {
    const appId = window.__FACEBOOK_APP_ID__;
    if (!appId) {
      alert('Facebook login is not configured yet. Please use username/password.');
      return;
    }
    FB.login(async (response) => {
      if (response.authResponse) {
        await handleOAuthToken('facebook', response.authResponse.accessToken, userType);
      }
    }, { scope: 'email' });
  }
}

function initGoogleLogin(clientId, userType) {
  google.accounts.id.initialize({
    client_id: clientId,
    callback: async (response) => {
      await handleOAuthToken('google', response.credential, userType);
    }
  });
  google.accounts.id.prompt();
}

async function handleOAuthToken(provider, token, userType) {
  const errEl = document.getElementById('cred-error');
  errEl.textContent = '';

  try {
    const res = await fetch(`${API}/auth/oauth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider, accessToken: token, userType })
    });
    const data = await res.json();

    if (!res.ok) { errEl.textContent = data.error || 'OAuth failed'; return; }

    if (data.step === 'otp_required') {
      _preAuthToken = data.preAuthToken;
      showOTPStep(data.message);
    }
  } catch (e) {
    errEl.textContent = '⚠️ Could not reach server.';
  }
}

// ── STEP 2: OTP ──────────────────────────────────────────────
function showOTPStep(message) {
  document.getElementById('step-credentials').classList.remove('active');
  document.getElementById('step-otp').classList.add('active');
  document.getElementById('otp-sent-text').textContent = message || 'Code sent to your phone';
  document.getElementById('inp-otp').value = '';
  document.getElementById('otp-error').textContent = '';
  document.getElementById('inp-otp').focus();
  startOTPCountdown();
}

function startOTPCountdown() {
  clearInterval(_otpTimer);
  let seconds = 120;
  const display = document.getElementById('otp-countdown-display');
  const resendBtn = document.getElementById('resend-btn');
  const resendCount = document.getElementById('resend-countdown');

  resendBtn.disabled = true;

  _otpTimer = setInterval(() => {
    seconds--;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    display.textContent = `${m}:${String(s).padStart(2,'0')}`;
    resendCount.textContent = seconds;

    if (seconds <= 0) {
      clearInterval(_otpTimer);
      display.textContent = 'Expired';
      display.style.color = 'var(--red)';
      resendBtn.disabled = false;
    }
  }, 1000);
}

function backToCredentials() {
  clearInterval(_otpTimer);
  document.getElementById('step-otp').classList.remove('active');
  document.getElementById('step-credentials').classList.add('active');
  _preAuthToken = null;
}

async function resendOTP() {
  // Re-submit credentials to get a new OTP
  _preAuthToken = null;
  backToCredentials();
  await submitCredentials();
}

async function submitOTP() {
  const otp = document.getElementById('inp-otp').value.trim();
  const errEl = document.getElementById('otp-error');
  const btnText = document.getElementById('otp-btn-text');

  errEl.textContent = '';
  if (!otp || otp.length !== 6) { errEl.textContent = 'Enter the 6-digit code'; return; }
  if (!_preAuthToken) { errEl.textContent = 'Session expired. Please start over.'; return; }

  btnText.textContent = 'Verifying...';
  document.querySelectorAll('.login-btn').forEach(b => b.disabled = true);

  try {
    const res = await fetch(`${API}/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ preAuthToken: _preAuthToken, otp })
    });
    const data = await res.json();

    if (!res.ok) { errEl.textContent = data.error || 'Incorrect code'; return; }

    clearInterval(_otpTimer);
    _session = { token: data.token, userType: data.userType, userId: data.userId, permissions: data.permissions };
    sessionStorage.setItem('bsc_token', data.token);
    sessionStorage.setItem('bsc_usertype', data.userType);

    enterDashboard(data.userType);

  } catch (e) {
    errEl.textContent = '⚠️ Could not reach server.';
  } finally {
    btnText.textContent = 'Verify & Enter →';
    document.querySelectorAll('.login-btn').forEach(b => b.disabled = false);
  }
}

// ── ENTER DASHBOARD ──────────────────────────────────────────
function enterDashboard(userType) {
  document.getElementById('login-gate').style.display = 'none';

  if (userType === 'partner') {
    // Redirect to pancake.html with the token
    document.getElementById('partner-redirect').classList.remove('hidden');
    // Pass token via sessionStorage (already set)
    setTimeout(() => {
      window.location.href = 'pancake.html';
    }, 1200);
    return;
  }

  if (userType === 'subadmin') {
    const dashboard = document.getElementById('subadmin-dashboard');
    dashboard.classList.remove('hidden');
    initSubAdminDashboard();
  }
}

// ── SUB-ADMIN DASHBOARD ──────────────────────────────────────
function initSubAdminDashboard() {
  applySubAdminPermissions();
  loadApprovals();
}

function applySubAdminPermissions() {
  const perms = _session?.permissions || {};
  document.querySelectorAll('.sidebar-item[data-perm]').forEach(btn => {
    const perm = btn.getAttribute('data-perm');
    if (!perms[perm]) btn.style.display = 'none';
  });
}

function saGoTo(panel) {
  document.querySelectorAll('.dash-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.sidebar-item').forEach(b => b.classList.remove('active'));
  document.getElementById(`sa-panel-${panel}`)?.classList.add('active');
  document.getElementById(`sa-tab-${panel}`)?.classList.add('active');

  const loaders = {
    approvals: loadApprovals,
    orders: loadOrders,
    customers: loadCustomers,
    partners: loadPartners,
    analytics: loadAnalytics
  };
  loaders[panel]?.();
}

async function loadApprovals() {
  const container = document.getElementById('approvals-list');
  container.innerHTML = '<div class="loading-skeleton"></div>';

  try {
    const res = await authFetch('/api/products?status=pending&limit=50');
    const data = await res.json();
    const products = data.products || [];

    const badge = document.getElementById('sa-approvals-badge');
    if (badge) badge.textContent = products.length || '';

    if (!products.length) {
      container.innerHTML = '<div class="empty-state">✅ No pending approvals</div>';
      return;
    }

    container.innerHTML = products.map(p => `
      <div class="approval-card">
        <div class="approval-img">
          ${p.primary_image ? `<img src="${escHtml(p.primary_image)}" alt="">` : '<div class="no-img">📦</div>'}
        </div>
        <div class="approval-info">
          <div class="approval-name">${escHtml(p.name)}</div>
          <div class="approval-price">₦${Number(p.price).toLocaleString()}</div>
          <div class="approval-seller">by ${escHtml(p.seller_name)}</div>
        </div>
        <div class="approval-actions">
          <button class="approve-btn" onclick="approveProduct('${p.id}','approve')">✅ Approve</button>
          <button class="reject-btn" onclick="approveProduct('${p.id}','reject')">❌ Reject</button>
        </div>
      </div>
    `).join('');
  } catch (e) {
    container.innerHTML = '<div class="empty-state">Failed to load approvals</div>';
  }
}

async function approveProduct(productId, action) {
  let reason = '';
  if (action === 'reject') {
    reason = prompt('Reason for rejection:') || '';
    if (!reason) return;
  }
  try {
    const res = await authFetch('/api/products/approve', {
      method: 'POST',
      body: JSON.stringify({ productId, action, reason })
    });
    const data = await res.json();
    if (res.ok) {
      alert(data.message);
      loadApprovals();
    } else {
      alert(data.error || 'Action failed');
    }
  } catch { alert('Network error'); }
}

async function loadOrders() {
  const el = document.getElementById('orders-list');
  el.innerHTML = '<div class="loading-skeleton"></div>';
  try {
    const res = await authFetch('/api/orders?limit=50');
    const data = await res.json();
    if (!data.orders?.length) { el.innerHTML = '<div class="empty-state">No orders yet</div>'; return; }
    el.innerHTML = data.orders.map(o => `
      <div class="order-row">
        <span class="order-num">${escHtml(o.order_number)}</span>
        <span>${escHtml(o.status)}</span>
        <span>₦${Number(o.total_amount).toLocaleString()}</span>
      </div>
    `).join('');
  } catch { el.innerHTML = '<div class="empty-state">Failed to load</div>'; }
}

async function loadCustomers() {
  const el = document.getElementById('customers-list');
  el.innerHTML = '<div class="loading-skeleton"></div>';
  try {
    const res = await authFetch('/api/users?limit=50');
    const data = await res.json();
    if (!data.users?.length) { el.innerHTML = '<div class="empty-state">No customers yet</div>'; return; }
    el.innerHTML = data.users.map(u => `
      <div class="customer-row">
        <span>${escHtml(u.full_name||u.phone||'—')}</span>
        <span>${escHtml(u.email||'—')}</span>
        <span class="status-badge ${u.is_active?'green':'red'}">${u.is_active?'Active':'Suspended'}</span>
      </div>
    `).join('');
  } catch { el.innerHTML = '<div class="empty-state">Failed to load</div>'; }
}

async function loadPartners() {
  const el = document.getElementById('partners-list');
  el.innerHTML = '<div class="loading-skeleton"></div>';
  try {
    const res = await authFetch('/api/admin/accounts?type=partners');
    const data = await res.json();
    if (!data.accounts?.length) { el.innerHTML = '<div class="empty-state">No partners yet</div>'; return; }
    el.innerHTML = data.accounts.map(p => `
      <div class="partner-row">
        <span class="partner-name">${escHtml(p.business_name)}</span>
        <span>${escHtml(p.email)}</span>
        <span class="status-badge ${p.is_active?'green':'red'}">${p.is_active?'Active':'Suspended'}</span>
      </div>
    `).join('');
  } catch { el.innerHTML = '<div class="empty-state">Failed to load</div>'; }
}

async function loadAnalytics() {
  document.getElementById('analytics-content').innerHTML = '<div class="empty-state">Analytics coming in Phase 5</div>';
}

// ── LOGOUT ───────────────────────────────────────────────────
async function logout() {
  try {
    await authFetch('/api/auth/logout', { method: 'POST' });
  } catch {}
  sessionStorage.removeItem('bsc_token');
  sessionStorage.removeItem('bsc_usertype');
  _session = null;
  window.location.reload();
}

// ── HELPERS ──────────────────────────────────────────────────
async function authFetch(url, options = {}) {
  const token = sessionStorage.getItem('bsc_token');
  return fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token || ''}`,
      ...(options.headers || {})
    },
    body: options.body
  });
}

function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
