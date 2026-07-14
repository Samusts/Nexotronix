/* ============================================================
   PANCAKE — Partner Dashboard JS
   ============================================================ */
const API = '/api';
let _session = null;
let _partner = null;
let _wallet = null;
let _pusher = null;
let _currentFilter = 'all';

// ── INIT ────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  applyTheme();
  verifySession();
});

// Auto-logout when tab/app closes
window.addEventListener('beforeunload', () => {
  if (_session?.token) {
    fetch('/api/auth/logout', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${_session.token}`, 'Content-Type': 'application/json' },
      keepalive: true
    });
    sessionStorage.removeItem('bsc_token');
    sessionStorage.removeItem('bsc_usertype');
  }
});

// Auto-logout after 5 minutes in background
let _bgTimer = null;
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    _bgTimer = setTimeout(() => {
      logout();
    }, 5 * 60 * 1000);
  } else {
    clearTimeout(_bgTimer);
  }
});

function applyTheme() {
  const t = localStorage.getItem('bsc_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', t);
}

function toggleTheme() {
  const cur = document.documentElement.getAttribute('data-theme');
  const next = cur === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('bsc_theme', next);
  document.querySelector('.topbar-btn')?.textContent === '☀️'
    ? document.querySelectorAll('.topbar-btn')[0].textContent = '🌙'
    : document.querySelectorAll('.topbar-btn')[0].textContent = '☀️';
}

async function verifySession() {
  const token = sessionStorage.getItem('bsc_token');
  const userType = sessionStorage.getItem('bsc_usertype');

  if (!token || userType !== 'partner') {
    window.location.href = 'butterscotch.html';
    return;
  }

  try {
    const res = await fetch('/api/auth/me', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    if (!res.ok) {
      sessionStorage.clear();
      window.location.href = 'butterscotch.html';
      return;
    }

    const data = await res.json();
    _session = { token, userType: 'partner', userId: data.userId };
    _partner = data.user;

    document.getElementById('auth-check').style.display = 'none';
    document.getElementById('partner-app').classList.remove('hidden');

    initDashboard();
  } catch (e) {
    window.location.href = 'butterscotch.html';
  }
}

async function initDashboard() {
  renderPartnerInfo();
  await loadDashboardStats();
  initPusherChat();
  goTo('dashboard');
}

function renderPartnerInfo() {
  if (!_partner) return;
  document.getElementById('partner-business-name').textContent = _partner.business_name || 'My Store';
  document.getElementById('partner-name-display').textContent = _partner.business_name || '';
  document.getElementById('partner-rating-display').textContent = `⭐ ${Number(_partner.rating || 0).toFixed(1)}`;
  if (_partner.is_verified) {
    document.getElementById('partner-verified-badge').classList.remove('hidden');
  }
  if (_partner.business_logo) {
    document.getElementById('partner-logo').src = _partner.business_logo;
  }
}

// ── NAVIGATION ───────────────────────────────────────────────
function goTo(panelName) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.pnav-item').forEach(b => b.classList.remove('active'));
  document.getElementById(`panel-${panelName}`)?.classList.add('active');
  document.getElementById(`tab-${panelName}`)?.classList.add('active');
  closeSidebar();

  const loaders = {
    dashboard: loadDashboardStats,
    products: loadProducts,
    orders: loadOrders,
    chat: loadChats,
    wallet: loadWallet,
    analytics: loadAnalytics,
    profile: loadProfile
  };
  loaders[panelName]?.();
}

function toggleSidebar() {
  document.getElementById('partner-sidebar').classList.toggle('open');
}
function closeSidebar() {
  document.getElementById('partner-sidebar').classList.remove('open');
}

// ── DASHBOARD STATS ──────────────────────────────────────────
async function loadDashboardStats() {
  try {
    const [statsRes, walletRes] = await Promise.all([
      authFetch('/api/partners/stats'),
      authFetch('/api/wallets')
    ]);

    if (statsRes.ok) {
      const stats = await statsRes.json();
      document.getElementById('stat-revenue').textContent = fmt(stats.total_revenue || 0);
      document.getElementById('stat-orders').textContent = stats.total_orders || 0;
      document.getElementById('stat-products').textContent = stats.live_products || 0;
    }
    if (walletRes.ok) {
      const walletData = await walletRes.json();
      _wallet = walletData.wallet;
      const bal = _wallet?.available_balance || 0;
      document.getElementById('stat-wallet').textContent = fmt(bal);
      document.getElementById('wallet-balance').textContent = fmt(bal);
    }
  } catch (e) {
    console.error('Stats error:', e);
  }
}

// ── PRODUCTS ─────────────────────────────────────────────────
async function loadProducts() {
  const container = document.getElementById('products-list');
  container.innerHTML = '<div class="skeleton"></div><div class="skeleton" style="margin-top:12px"></div>';

  try {
    const url = _currentFilter === 'all'
      ? `/api/products?owner=${_session.userId}&status=all`
      : `/api/products?owner=${_session.userId}&status=${_currentFilter}`;

    const res = await authFetch(url);
    const data = await res.json();
    const products = data.products || [];

    // Update pending badge
    const pendingCount = products.filter(p => p.status === 'pending').length;
    const badge = document.getElementById('pending-badge');
    if (badge) badge.textContent = pendingCount || '';

    if (!products.length) {
      container.innerHTML = `<div class="empty-state">
        <div style="font-size:48px">📦</div>
        <div style="margin-top:8px">No products yet</div>
        <button class="primary-btn" style="margin-top:16px" onclick="openAddProduct()">+ Add Your First Product</button>
      </div>`;
      return;
    }

    container.innerHTML = products.map(p => `
      <div class="product-card" onclick="viewProduct('${p.id}')">
        <div class="product-img-wrap">
          ${p.primary_image
            ? `<img src="${escHtml(p.primary_image)}" alt="${escHtml(p.name)}" loading="lazy">`
            : `<div class="no-img">${escHtml(p.emoji||'📦')}</div>`}
          <span class="product-status-badge ${p.status}">${statusLabel(p.status)}</span>
        </div>
        <div class="product-card-body">
          <div class="product-card-name">${escHtml(p.name)}</div>
          <div class="product-card-price">${fmt(p.price)}</div>
          <div class="product-card-meta">
            <span>Stock: ${p.stock}</span>
            <span>Sold: ${p.sold_count}</span>
          </div>
          ${p.status === 'rejected' ? `<div class="rejection-note">❌ ${escHtml(p.rejection_reason||'')}</div>` : ''}
        </div>
      </div>
    `).join('');
  } catch (e) {
    container.innerHTML = '<div class="empty-state">Failed to load products</div>';
  }
}

function filterProducts(status, btn) {
  _currentFilter = status;
  document.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  loadProducts();
}

function statusLabel(status) {
  const map = { approved:'✅ Live', pending:'⏳ Pending', rejected:'❌ Rejected', hidden:'👁 Hidden' };
  return map[status] || status;
}

// ── ADD PRODUCT MODAL ─────────────────────────────────────────
let _uploadedImages = [];

function openAddProduct() {
  document.getElementById('add-product-modal').classList.remove('hidden');
  loadCategories();
  _uploadedImages = [];
  document.getElementById('image-previews').innerHTML = '';
  document.getElementById('upload-placeholder').style.display = 'block';
}

function closeAddProduct() {
  document.getElementById('add-product-modal').classList.add('hidden');
}

async function loadCategories() {
  const sel = document.getElementById('prod-category');
  try {
    const res = await fetch('/api/categories');
    const data = await res.json();
    const cats = data.categories || [];
    sel.innerHTML = `<option value="">Select category</option>` +
      cats.map(c => `<option value="${c.id}">${escHtml(c.emoji||'')} ${escHtml(c.name)}</option>`).join('');
  } catch {
    sel.innerHTML = '<option value="">Could not load categories</option>';
  }
}

async function handleImageUpload(input) {
  const files = Array.from(input.files).slice(0, 5 - _uploadedImages.length);
  const previews = document.getElementById('image-previews');
  document.getElementById('upload-placeholder').style.display = 'none';

  for (const file of files) {
    const enhanced = await enhanceImage(file);
    _uploadedImages.push(enhanced.url);
    const img = document.createElement('img');
    img.src = enhanced.url;
    img.className = 'img-preview';
    previews.appendChild(img);
  }

  if (_uploadedImages.length >= 5) {
    document.getElementById('img-input').disabled = true;
  }
}

// Image enhancement using Canvas API
async function enhanceImage(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_SIZE = 1200;
        let { width, height } = img;

        // Resize to max dimension
        if (width > MAX_SIZE || height > MAX_SIZE) {
          const ratio = Math.min(MAX_SIZE / width, MAX_SIZE / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        // Draw
        ctx.drawImage(img, 0, 0, width, height);

        // Apply sharpening / contrast enhancement
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
          // Slight contrast boost
          data[i]   = Math.min(255, data[i]   * 1.05);
          data[i+1] = Math.min(255, data[i+1] * 1.05);
          data[i+2] = Math.min(255, data[i+2] * 1.05);
        }
        ctx.putImageData(imageData, 0, 0);

        // Export as compressed JPEG
        const url = canvas.toDataURL('image/jpeg', 0.88);
        resolve({ url, width, height });
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

async function submitProduct() {
  const errEl = document.getElementById('product-error');
  const btn = document.getElementById('submit-product-text');
  errEl.textContent = '';

  const name = document.getElementById('prod-name').value.trim();
  const price = document.getElementById('prod-price').value;
  const originalPrice = document.getElementById('prod-original-price').value;
  const condition = document.getElementById('prod-condition').value;
  const stock = document.getElementById('prod-stock').value;
  const categoryId = document.getElementById('prod-category').value;
  const description = document.getElementById('prod-description').value.trim();
  const allowOffers = document.getElementById('prod-allow-offers').checked;

  if (!name) { errEl.textContent = 'Product name is required'; return; }
  if (!price || isNaN(price)) { errEl.textContent = 'Valid price is required'; return; }

  btn.textContent = 'Submitting...';
  document.querySelector('#add-product-modal .primary-btn').disabled = true;

  try {
    const res = await authFetch('/api/products', {
      method: 'POST',
      body: JSON.stringify({
        name, price: Number(price),
        originalPrice: originalPrice ? Number(originalPrice) : null,
        condition, stock: Number(stock) || 1,
        categoryId: categoryId || null,
        description, allowOffers,
        images: _uploadedImages
      })
    });

    const data = await res.json();
    if (!res.ok) { errEl.textContent = data.error || 'Failed to submit'; return; }

    closeAddProduct();
    showToast('✅ Product submitted for approval!');
    loadProducts();
  } catch (e) {
    errEl.textContent = '⚠️ Network error. Try again.';
  } finally {
    btn.textContent = 'Submit for Approval';
    document.querySelector('#add-product-modal .primary-btn').disabled = false;
  }
}

// ── ORDERS ───────────────────────────────────────────────────
async function loadOrders() {
  const container = document.getElementById('orders-list');
  container.innerHTML = '<div class="skeleton"></div>';
  try {
    const res = await authFetch('/api/orders?partner=me');
    const data = await res.json();
    const orders = data.orders || [];
    const badge = document.getElementById('new-orders-badge');
    const newOrders = orders.filter(o => o.status === 'pending').length;
    if (badge) badge.textContent = newOrders || '';

    if (!orders.length) {
      container.innerHTML = '<div class="empty-state">No orders yet</div>';
      return;
    }

    container.innerHTML = orders.map(o => `
      <div class="order-card">
        <div class="order-header">
          <span class="order-num">#${escHtml(o.order_number)}</span>
          <span class="status-badge ${orderStatusColor(o.status)}">${escHtml(o.status)}</span>
        </div>
        <div class="order-details">
          <span>₦${Number(o.total_amount).toLocaleString()}</span>
          <span>${new Date(o.created_at).toLocaleDateString()}</span>
        </div>
        <div class="order-address">📍 ${escHtml(o.delivery_city||o.delivery_address||'—')}</div>
        <div class="order-actions">
          ${o.status === 'confirmed' ? `<button class="primary-btn small" onclick="markShipped('${o.id}')">Mark as Shipped</button>` : ''}
        </div>
      </div>
    `).join('');
  } catch {
    container.innerHTML = '<div class="empty-state">Failed to load orders</div>';
  }
}

async function markShipped(orderId) {
  try {
    const res = await authFetch(`/api/orders/${orderId}/status`, {
      method: 'POST',
      body: JSON.stringify({ status: 'shipped' })
    });
    if (res.ok) { showToast('📦 Marked as shipped'); loadOrders(); }
  } catch { showToast('⚠️ Failed to update'); }
}

function orderStatusColor(s) {
  const m = { pending:'gold', confirmed:'blue', shipped:'purple', delivered:'green', cancelled:'red', refunded:'red' };
  return m[s] || '';
}

// ── WALLET ───────────────────────────────────────────────────
async function loadWallet() {
  try {
    const res = await authFetch('/api/wallets');
    const data = await res.json();
    _wallet = data.wallet;

    document.getElementById('wc-available').textContent = fmt(data.wallet?.available_balance || 0);
    document.getElementById('wc-pending').textContent = fmt(data.wallet?.pending_balance || 0);
    document.getElementById('wc-total').textContent = fmt(data.wallet?.total_earned || 0);

    const txEl = document.getElementById('wallet-transactions');
    const txs = data.transactions || [];
    txEl.innerHTML = txs.length
      ? txs.map(t => `
        <div class="tx-row">
          <span class="tx-type ${t.type}">${t.type === 'credit' ? '↑' : '↓'} ${escHtml(t.description)}</span>
          <span class="tx-amount ${t.type === 'credit' ? 'green' : 'red'}">
            ${t.type === 'credit' ? '+' : '-'}${fmt(t.amount)}
          </span>
          <span class="tx-date">${new Date(t.created_at).toLocaleDateString()}</span>
        </div>`).join('')
      : '<div class="empty-state">No transactions yet</div>';

    const wdEl = document.getElementById('pending-withdrawals');
    const wds = data.pendingWithdrawals || [];
    if (wds.length) {
      wdEl.innerHTML = `<div class="section-title" style="margin-top:20px">Pending Withdrawals</div>` +
        wds.map(w => `
          <div class="wd-row">
            <span>${fmt(w.amount)} → ${escHtml(w.bank_name)}</span>
            <span class="status-badge ${w.status === 'paid' ? 'green' : 'gold'}">${escHtml(w.status)}</span>
          </div>`).join('');
    }
  } catch { showToast('⚠️ Failed to load wallet'); }
}

function openWithdrawalModal() {
  const available = _wallet?.available_balance || 0;
  document.getElementById('wd-available-hint').textContent =
    `Available to withdraw: ${fmt(available)}`;
  document.getElementById('withdrawal-modal').classList.remove('hidden');
}

function closeWithdrawalModal() {
  document.getElementById('withdrawal-modal').classList.add('hidden');
}

async function submitWithdrawal() {
  const amount = document.getElementById('wd-amount').value;
  const bankName = document.getElementById('wd-bank').value.trim();
  const accountNumber = document.getElementById('wd-account-number').value.trim();
  const accountName = document.getElementById('wd-account-name').value.trim();
  const errEl = document.getElementById('wd-error');
  errEl.textContent = '';

  if (!amount || !bankName || !accountNumber || !accountName) {
    errEl.textContent = 'All fields are required'; return;
  }

  try {
    const res = await authFetch('/api/wallets', {
      method: 'POST',
      body: JSON.stringify({ amount: Number(amount), bankName, accountNumber, accountName })
    });
    const data = await res.json();
    if (!res.ok) { errEl.textContent = data.error || 'Request failed'; return; }
    closeWithdrawalModal();
    showToast('✅ Withdrawal request submitted!');
    loadWallet();
  } catch { errEl.textContent = '⚠️ Network error'; }
}

// ── CHAT (Pusher) ────────────────────────────────────────────
function initPusherChat() {
  const pusherKey = window.__PUSHER_KEY__;
  const pusherCluster = window.__PUSHER_CLUSTER__;
  if (!pusherKey || typeof Pusher === 'undefined') return;

  _pusher = new Pusher(pusherKey, { cluster: pusherCluster, encrypted: true });

  // Subscribe to partner's notification channel
  const channel = _pusher.subscribe(`partner-${_session.userId}`);
  channel.bind('new-message', (data) => {
    updateUnreadBadge(data.count);
    if (data.room_id === _currentChatRoom) renderNewMessage(data.message);
  });
  channel.bind('new-order', (data) => {
    updateNewOrdersBadge(data.count);
    showToast('🛍 New order received!');
  });
}

let _currentChatRoom = null;

async function loadChats() {
  const listEl = document.getElementById('chat-list');
  listEl.innerHTML = '<div class="skeleton" style="height:60px;margin:8px"></div>';
  try {
    const res = await authFetch('/api/chat/rooms');
    const data = await res.json();
    const rooms = data.rooms || [];
    const badge = document.getElementById('unread-badge');
    const unread = rooms.filter(r => r.unread > 0).length;
    if (badge) badge.textContent = unread || '';

    listEl.innerHTML = rooms.length
      ? rooms.map(r => `
        <div class="chat-room-item ${r.id === _currentChatRoom ? 'active' : ''}"
             onclick="openChatRoom('${r.id}','${escHtml(r.customer_name||r.customer_phone||'Customer')}')">
          <div class="chat-room-name">${escHtml(r.customer_name||r.customer_phone||'Customer')}</div>
          <div class="chat-room-last">${escHtml(r.last_message||'')}</div>
          ${r.unread ? `<span class="unread-count">${r.unread}</span>` : ''}
        </div>`).join('')
      : '<div class="empty-state" style="padding:20px">No conversations yet</div>';
  } catch { listEl.innerHTML = '<div class="empty-state">Failed to load chats</div>'; }
}

async function openChatRoom(roomId, customerName) {
  _currentChatRoom = roomId;
  const win = document.getElementById('chat-window');
  win.innerHTML = `
    <div class="chat-win-header">${escHtml(customerName)}</div>
    <div id="chat-messages" class="chat-messages"></div>
    <div class="chat-input-row">
      <input type="text" id="chat-inp" placeholder="Type a message..."
        onkeydown="if(event.key==='Enter')sendMessage()">
      <button onclick="sendMessage()">Send</button>
    </div>`;

  await loadMessages(roomId);
  loadChats(); // refresh to clear unread
}

async function loadMessages(roomId) {
  const el = document.getElementById('chat-messages');
  if (!el) return;
  try {
    const res = await authFetch(`/api/chat/messages?room=${roomId}`);
    const data = await res.json();
    const msgs = data.messages || [];
    el.innerHTML = msgs.map(m => `
      <div class="chat-msg ${m.sender_type === 'partner' ? 'mine' : 'theirs'}">
        <div class="chat-bubble">${escHtml(m.message)}</div>
        <div class="chat-time">${new Date(m.created_at).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})}</div>
      </div>`).join('');
    el.scrollTop = el.scrollHeight;
  } catch {}
}

async function sendMessage() {
  const inp = document.getElementById('chat-inp');
  const msg = inp?.value.trim();
  if (!msg || !_currentChatRoom) return;
  inp.value = '';
  try {
    await authFetch('/api/chat/send', {
      method: 'POST',
      body: JSON.stringify({ roomId: _currentChatRoom, message: msg })
    });
    await loadMessages(_currentChatRoom);
  } catch { showToast('⚠️ Failed to send message'); }
}

function renderNewMessage(message) {
  const el = document.getElementById('chat-messages');
  if (!el) return;
  const div = document.createElement('div');
  div.className = `chat-msg ${message.sender_type === 'partner' ? 'mine' : 'theirs'}`;
  div.innerHTML = `<div class="chat-bubble">${escHtml(message.message)}</div>`;
  el.appendChild(div);
  el.scrollTop = el.scrollHeight;
}

function updateUnreadBadge(count) {
  const badge = document.getElementById('unread-badge');
  if (badge) { badge.textContent = count || ''; badge.classList.toggle('hidden', !count); }
}
function updateNewOrdersBadge(count) {
  const badge = document.getElementById('new-orders-badge');
  if (badge) { badge.textContent = count || ''; }
}

// ── ANALYTICS ─────────────────────────────────────────────────
async function loadAnalytics() {
  document.getElementById('analytics-content').innerHTML = `
    <div class="empty-state">
      <div style="font-size:48px">📈</div>
      <div style="margin-top:8px">Analytics coming in Phase 5</div>
      <div style="font-size:11px;color:var(--dim);margin-top:4px">Views, conversions, peak times and more</div>
    </div>`;
}

// ── PROFILE ──────────────────────────────────────────────────
async function loadProfile() {
  const container = document.getElementById('profile-form');
  container.innerHTML = `
    <div class="form-field">
      <label>Business Name</label>
      <input type="text" id="prof-business-name" value="${escHtml(_partner?.business_name||'')}">
    </div>
    <div class="form-field">
      <label>Business Bio</label>
      <textarea id="prof-bio" rows="3">${escHtml(_partner?.business_bio||'')}</textarea>
    </div>
    <div class="form-field">
      <label>Phone</label>
      <input type="text" id="prof-phone" value="${escHtml(_partner?.phone||'')}">
    </div>
    <div class="form-field">
      <label>Suggest a New Category</label>
      <div style="display:flex;gap:8px">
        <input type="text" id="prof-category-suggestion" placeholder="e.g. Smart Home Devices">
        <button class="primary-btn" onclick="suggestCategory()">Suggest</button>
      </div>
    </div>
    <button class="primary-btn" onclick="saveProfile()" style="margin-top:8px">Save Changes</button>`;
}

async function saveProfile() {
  const businessName = document.getElementById('prof-business-name').value.trim();
  const bio = document.getElementById('prof-bio').value.trim();
  const phone = document.getElementById('prof-phone').value.trim();
  try {
    const res = await authFetch('/api/partners/profile', {
      method: 'PUT', body: JSON.stringify({ businessName, bio, phone })
    });
    const data = await res.json();
    if (res.ok) { showToast('✅ Profile saved!'); _partner = { ..._partner, ...data.partner }; renderPartnerInfo(); }
    else showToast(data.error || '⚠️ Save failed');
  } catch { showToast('⚠️ Network error'); }
}

async function suggestCategory() {
  const name = document.getElementById('prof-category-suggestion').value.trim();
  if (!name) return;
  try {
    const res = await authFetch('/api/categories', {
      method: 'POST', body: JSON.stringify({ name, suggestedBy: _session.userId })
    });
    const data = await res.json();
    if (res.ok) { showToast('✅ Category suggested — awaiting approval'); document.getElementById('prof-category-suggestion').value = ''; }
    else showToast(data.error || '⚠️ Failed');
  } catch { showToast('⚠️ Network error'); }
}

// ── LOGOUT ───────────────────────────────────────────────────
async function logout() {
  try { await authFetch('/api/auth/logout', { method: 'POST' }); } catch {}
  sessionStorage.removeItem('bsc_token');
  sessionStorage.removeItem('bsc_usertype');
  window.location.href = 'butterscotch.html';
}

// ── HELPERS ──────────────────────────────────────────────────
async function authFetch(url, options = {}) {
  return fetch(url, {
    ...options,
    headers: { 'Content-Type':'application/json', 'Authorization':`Bearer ${sessionStorage.getItem('bsc_token')||''}`, ...(options.headers||{}) },
    body: options.body
  });
}

function escHtml(str) {
  if (!str) return '';
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function fmt(amount) {
  return '₦' + Number(amount||0).toLocaleString('en-NG', { minimumFractionDigits:0, maximumFractionDigits:0 });
}

let _toastTimer;
function showToast(msg) {
  let t = document.getElementById('toast-el');
  if (!t) {
    t = document.createElement('div');
    t.id = 'toast-el';
    t.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:var(--surface);border:1px solid var(--border-gold);color:var(--text);padding:10px 20px;border-radius:99px;font-size:13px;font-weight:600;z-index:9999;box-shadow:0 8px 24px rgba(0,0,0,0.3);transition:opacity 0.3s;';
    document.body.appendChild(t);
  }
  clearTimeout(_toastTimer);
  t.textContent = msg;
  t.style.opacity = '1';
  _toastTimer = setTimeout(() => { t.style.opacity = '0'; }, 3000);
}
