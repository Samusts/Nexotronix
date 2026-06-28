/* ============================================================
   SECURITY — escape user-controlled text before rendering
   ============================================================ */
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ============================================================
   THEME SYSTEM
   ============================================================ */
// Apply theme immediately before DOM loads (prevents flash)
const savedTheme = localStorage.getItem('nx_theme') || 'dark';
document.documentElement.setAttribute('data-theme', savedTheme);

function toggleTheme() {
  const cur = document.documentElement.getAttribute('data-theme');
  const next = cur === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('nx_theme', next);
  updateThemeBtn(next);
}

function updateThemeBtn(t) {
  const btn = document.getElementById('theme-toggle');
  if (btn) btn.textContent = t === 'dark' ? '☀️' : '🌙';
}

// Update button after DOM is ready


/* ============================================================
   PRODUCT DATA
   ============================================================ */
let products = JSON.parse(localStorage.getItem('nexotronix_products') || 'null') || [
  { id: 1, name: "iPhone 15 Pro Max 256GB", cat: "phone", emoji: "📱", condition: "new", price: 950000, stock: "instock", specs: "6.7\" Super Retina XDR OLED, A17 Pro chip, 48MP ProCamera, 256GB, Titanium frame, USB-C, iOS 17", featured: true, img: "", images: [], quantity: 5 },
  { id: 2, name: "Samsung Galaxy S24 Ultra", cat: "phone", emoji: "📱", condition: "new", price: 880000, stock: "instock", specs: "6.8\" Dynamic AMOLED 2X, Snapdragon 8 Gen 3, 200MP camera, 12GB RAM, 256GB, S-Pen, 5G", featured: true, img: "", images: [], quantity: 5 },
  { id: 3, name: "iPhone 14 Pro 128GB", cat: "phone", emoji: "📱", condition: "used", price: 420000, stock: "instock", specs: "6.1\" Always-On ProMotion OLED, A16 Bionic, 48MP main camera, Dynamic Island, 5G", featured: false, img: "", images: [], quantity: 5 },
  { id: 4, name: "Samsung Galaxy A54", cat: "phone", emoji: "📱", condition: "new", price: 180000, stock: "instock", specs: "6.4\" Super AMOLED, Exynos 1380, 50MP triple camera, 128GB, IP67 waterproof, 5000mAh", featured: false, img: "", images: [], quantity: 5 },
  { id: 5, name: "MacBook Pro M3 14\"", cat: "laptop", emoji: "💻", condition: "new", price: 1650000, stock: "instock", specs: "14\" Liquid Retina XDR, Apple M3 chip, 18GB RAM, 512GB SSD, 18hr battery, macOS Sonoma", featured: true, img: "", images: [], quantity: 5 },
  { id: 6, name: "Dell XPS 15 Core i9", cat: "laptop", emoji: "💻", condition: "used", price: 750000, stock: "instock", specs: "15.6\" OLED 4K Touch, Intel i9-13900H, 32GB RAM, 1TB SSD, RTX 4060, Windows 11 Pro", featured: true, img: "", images: [], quantity: 5 },
  { id: 7, name: "HP Pavilion Gaming i7", cat: "laptop", emoji: "💻", condition: "new", price: 480000, stock: "instock", specs: "15.6\" FHD 144Hz, Intel i7-13700H, 16GB DDR5, 512GB NVMe, GTX 1650 4GB, backlit keyboard", featured: false, img: "", images: [], quantity: 5 },
  { id: 8, name: "Lenovo ThinkPad X1 Carbon", cat: "laptop", emoji: "💻", condition: "used", price: 520000, stock: "limited", specs: "14\" 2.8K OLED, Intel i7-1365U, 16GB LPDDR5, 512GB SSD, Carbon fiber, MIL-SPEC tested", featured: false, img: "", images: [], quantity: 5 },
  { id: 9, name: "PlayStation 5 Disc Edition", cat: "gaming", emoji: "🎮", condition: "new", price: 650000, stock: "instock", specs: "4K gaming, 60–120fps, DualSense controller, 825GB SSD, Ray Tracing, 3D Audio, 1 game included", featured: true, img: "", images: [], quantity: 5 },
  { id: 10, name: "Xbox Series X 1TB", cat: "gaming", emoji: "🎮", condition: "new", price: 580000, stock: "instock", specs: "4K 120fps gaming, 1TB Custom SSD, Xbox Game Pass compatible, Quick Resume, Wireless controller", featured: false, img: "", images: [], quantity: 5 },
  { id: 11, name: "Nintendo Switch OLED", cat: "gaming", emoji: "🎮", condition: "new", price: 220000, stock: "instock", specs: "7\" OLED screen, handheld & TV mode, 64GB internal, enhanced audio, Joy-Con controllers", featured: false, img: "", images: [], quantity: 5 },
  { id: 12, name: "AirPods Pro 2nd Gen", cat: "accessory", emoji: "🎧", condition: "new", price: 120000, stock: "instock", specs: "Active Noise Cancellation, Adaptive Audio, H2 chip, 30hr total battery, USB-C case", featured: false, img: "", images: [], quantity: 5 },
  { id: 13, name: "Samsung Galaxy Buds2 Pro", cat: "accessory", emoji: "🎧", condition: "new", price: 85000, stock: "instock", specs: "360° Audio, Intelligent ANC, 24-bit Hi-Fi, IPX7, 29hr total battery, Comfort fit design", featured: false, img: "", images: [], quantity: 5 },
  { id: 14, name: "iPhone 13 128GB", cat: "phone", emoji: "📱", condition: "used", price: 280000, stock: "instock", specs: "6.1\" Super Retina XDR, A15 Bionic, Dual 12MP cameras, Ceramic Shield, 5G, MagSafe", featured: false, img: "", images: [], quantity: 5 },
  { id: 15, name: "Logitech G Pro X Headset", cat: "accessory", emoji: "🎧", condition: "new", price: 45000, stock: "limited", specs: "Pro-G 50mm drivers, Blue VO!CE mic, 7.1 DTS Headphone:X, memory foam, aluminium frame", featured: false, img: "", images: [], quantity: 5 },
  { id: 16, name: "ASUS ROG Phone 8 Pro", cat: "phone", emoji: "📱", condition: "new", price: 720000, stock: "instock", specs: "6.78\" AMOLED 165Hz, Snapdragon 8 Gen 3, 24GB RAM, 1TB, 50MP triple cam, 65W charge", featured: false, img: "", images: [], quantity: 5 },
];

let currentFilter = 'all';
let currentCondFilter = '';
let carouselIndex = 0;
let cart = JSON.parse(localStorage.getItem('nx_cart') || '[]');

function saveProducts() { localStorage.setItem('nexotronix_products', JSON.stringify(products)); }
function saveCart() { localStorage.setItem('nx_cart', JSON.stringify(cart)); }
function fmt(n) { return '₦' + Number(n).toLocaleString(); }

/* ============================================================
   VIEWERS (Urgency)
   ============================================================ */
const viewerCounts = {};
function getViewers(id) {
  if (!viewerCounts[id]) viewerCounts[id] = Math.floor(Math.random() * 8) + 2;
  return viewerCounts[id];
}

/* ============================================================
   WHATSAPP LINK
   ============================================================ */
function waLink(product, qty = 1) {
  const num = '2349036006553';
  const total = product.price * qty;
  const msg = encodeURIComponent(
    `Hello Nexotronix! 👋\n\nI want to order:\n\n` +
    `*Product:* ${product.name}\n` +
    `*Price:* ${fmt(product.price)}\n` +
    `*Quantity:* ${qty}\n` +
    `*Total:* ${fmt(total)}\n` +
    `*Condition:* ${product.condition === 'new' ? '🟢 Brand New' : '🟡 UK Used'}\n\n` +
    `Please confirm availability and delivery details.\n\nThank you! 🙏`
  );
  return `https://wa.me/${num}?text=${msg}`;
}

/* ============================================================
   CART
   ============================================================ */
function addToCart(id) {
  const p = products.find(x => x.id === id);
  if (!p || p.stock === 'sold') return;
  const existing = cart.find(x => x.id === id);
  if (existing) existing.qty += 1;
  else cart.push({ id, qty: 1 });
  saveCart();
  updateCartUI();
  showToast(`✅ ${p.name.split(' ').slice(0,3).join(' ')} added to cart`);
}

function removeFromCart(id) {
  cart = cart.filter(x => x.id !== id);
  saveCart(); updateCartUI(); renderCartModal();
}

function changeQty(id, delta) {
  const item = cart.find(x => x.id === id);
  if (!item) return;
  item.qty = Math.max(1, item.qty + delta);
  saveCart(); updateCartUI(); renderCartModal();
}

function clearCart() {
  cart = []; saveCart(); updateCartUI();
  document.getElementById('cart-bar').classList.remove('visible');
}

function openCart() {
  if (cart.length === 0) { showToast('Your cart is empty'); return; }
  renderCartModal();
  document.getElementById('cart-modal').classList.add('open');
}

function closeCart() { document.getElementById('cart-modal').classList.remove('open'); }

function getCartTotal() { return cart.reduce((s, i) => { const p = products.find(x => x.id === i.id); return s + (p ? p.price * i.qty : 0); }, 0); }
function getCartCount() { return cart.reduce((s, i) => s + i.qty, 0); }

function updateCartUI() {
  const count = getCartCount();
  const total = getCartTotal();
  const bar = document.getElementById('cart-bar');
  const countEl = document.getElementById('cart-item-count');
  const totalEl = document.getElementById('cart-total-label');
  const navCount = document.getElementById('nav-cart-count');

  if (countEl) countEl.textContent = count;
  if (totalEl) totalEl.textContent = fmt(total);
  if (bar) { count > 0 ? bar.classList.add('visible') : bar.classList.remove('visible'); }
  if (navCount) {
    if (count > 0) { navCount.textContent = count; navCount.style.display = 'flex'; }
    else navCount.style.display = 'none';
  }
}

function renderCartModal() {
  const list = document.getElementById('cart-items-list');
  const totalSec = document.getElementById('cart-total-section');
  if (!list) return;

  if (cart.length === 0) {
    list.innerHTML = `<div class="cart-empty"><div class="cart-empty-icon">🛒</div><p>Your cart is empty</p></div>`;
    if (totalSec) totalSec.innerHTML = '';
    return;
  }

  list.innerHTML = cart.map(item => {
    const p = products.find(x => x.id === item.id);
    if (!p) return '';
    return `<div class="cart-item">
      <div class="cart-item-emoji">${p.emoji}</div>
      <div class="cart-item-info">
        <div class="cart-item-name">${p.name}</div>
        <div class="cart-item-price">${fmt(p.price * item.qty)}</div>
      </div>
      <div class="cart-qty">
        <button class="qty-btn" onclick="changeQty(${p.id},-1)">−</button>
        <span class="qty-num">${item.qty}</span>
        <button class="qty-btn" onclick="changeQty(${p.id},1)">+</button>
      </div>
      <span class="cart-item-remove" onclick="removeFromCart(${p.id})">✕</span>
    </div>`;
  }).join('');

  const total = getCartTotal();
  const waCartMsg = encodeURIComponent(
    `Hello Nexotronix! 👋\n\nI want to order:\n\n` +
    cart.map(i => {
      const p = products.find(x => x.id === i.id);
      return p ? `• ${p.name} x${i.qty} — ${fmt(p.price * i.qty)}` : '';
    }).join('\n') +
    `\n\n*Total: ${fmt(total)}*\n\nPlease confirm and arrange delivery. Thank you!`
  );

  totalSec.innerHTML = `
    <div class="cart-total-row">
      <div class="cart-total-label">Total</div>
      <div class="cart-total-amt">${fmt(total)}</div>
    </div>
    <div class="cart-actions">
      <a class="btn-checkout-wa" href="https://wa.me/2349036006553?text=${waCartMsg}" target="_blank">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.125.549 4.122 1.51 5.857L.057 23.882l6.207-1.63A11.94 11.94 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.007-1.37l-.36-.213-3.683.967.983-3.596-.234-.371A9.82 9.82 0 012.182 12c0-5.422 4.396-9.818 9.818-9.818 5.422 0 9.818 4.396 9.818 9.818 0 5.422-4.396 9.818-9.818 9.818z"/></svg>
        Checkout on WhatsApp
      </a>
      <button class="btn-checkout-form" onclick="closeCart()">Continue Shopping</button>
    </div>`;
}

/* ============================================================
   RENDER PRODUCT CARD
   ============================================================ */
function renderCard(p) {
  if (!p || !p.name) return '';
  if (p.stock === 'sold' || p.stock === 'hidden' || p.stock === 'archived') return '';
  // Hide sold out and hidden products
  if (p.stock === 'sold' || p.stock === 'hidden') return '';

  const condBadge = p.condition === 'new'
    ? '<span class="badge badge-new">🟢 New</span>'
    : '<span class="badge badge-used">🟡 UK Used</span>';
  const stockBadge = p.stock === 'sold'
    ? '<span class="badge badge-sold">Sold Out</span>'
    : p.stock === 'limited'
    ? '<span class="badge badge-hot">Limited</span>'
    : '';
  const stockWarning = p.stock === 'limited' ? `<div class="stock-warning">⚠️ Only a few left!</div>` : '';
  const viewers = getViewers(p.id);
  const catLabel = { phone:'Smartphone', laptop:'Laptop', gaming:'Gaming', accessory:'Accessory' }[p.cat] || p.cat;
  const imgContent = p.img
    ? `<img src="${p.img}" alt="${p.name}" class="product-img-real" onerror="this.parentElement.innerHTML='<div class=\\'product-img-placeholder\\'><span>${p.emoji}</span><span>${p.name.split(' ').slice(0,2).join(' ')}</span></div>'">`
    : `<div class="product-img-placeholder"><span>${p.emoji || '📦'}</span><span>${p.name.split(' ').slice(0,2).join(' ')}</span></div>`;

  const buyBtns = p.stock === 'sold'
    ? `<span class="btn-buy-disabled">Sold Out</span>`
    : `<a class="btn-buy" href="${waLink(p)}" target="_blank" rel="noopener">
        <svg viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.125.549 4.122 1.51 5.857L.057 23.882l6.207-1.63A11.94 11.94 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.007-1.37l-.36-.213-3.683.967.983-3.596-.234-.371A9.82 9.82 0 012.182 12c0-5.422 4.396-9.818 9.818-9.818 5.422 0 9.818 4.396 9.818 9.818 0 5.422-4.396 9.818-9.818 9.818z"/></svg>
        Buy
      </a>`;

  return `<div class="product-card">
    <div class="product-img-wrap" onclick="openProductModal(${p.id})">
      ${imgContent}
      <div class="product-badges">${condBadge}${stockBadge}</div>
      <div class="product-viewers">👁 ${viewers} viewing</div>
    </div>
    <div class="product-body">
      <div class="product-cat">${catLabel}</div>
      <div class="product-name" onclick="openProductModal(${p.id})" style="cursor:pointer;">${p.name}</div>
      <div class="product-specs">${p.specs}</div>
      ${stockWarning}
    </div>
    <div class="product-footer">
      <div>
        <div class="product-price-label">Price</div>
        <div class="product-price">${fmt(p.price)}</div>
      </div>
      <div style="display:flex;flex-direction:column;gap:5px;align-items:flex-end;">
        ${buyBtns}
        ${p.stock !== 'sold' ? `<button class="add-to-cart-btn" onclick="addToCart(${p.id})">+ Cart</button>` : ''}
      </div>
    </div>
  </div>`;
}

/* ============================================================
   FILTER + RENDER PRODUCTS
   ============================================================ */
function renderProducts() {
  const search = (document.getElementById('search-input')?.value || '').toLowerCase().trim();
  const grid = document.getElementById('product-grid');
  if (!grid) return;

  const filtered = products.filter(p => {
    const matchCat = currentFilter === 'all' || p.cat === currentFilter;
    const matchCond = !currentCondFilter || p.condition === currentCondFilter;
    const matchSearch = !search || p.name.toLowerCase().includes(search) || p.specs.toLowerCase().includes(search) || p.cat.toLowerCase().includes(search);
    return matchCat && matchCond && matchSearch;
  });

  const countEl = document.getElementById('result-count');
  if (countEl) countEl.textContent = `(${filtered.length})`;

  if (filtered.length === 0) {
    grid.innerHTML = `<div class="no-results"><div class="no-results-icon">🔍</div><h3>No products found</h3><p>Try a different search or filter</p></div>`;
    return;
  }
  grid.innerHTML = filtered.map(renderCard).join('');
}


/* ============================================================
   ANALYTICS — lightweight page & product tracking
   ============================================================ */
/* Analytics defined below */

function filterProducts() { renderProducts(); }

function setFilter(cat, btn) {
  currentFilter = cat;
  if (btn) {
    document.querySelectorAll('[data-cat]').forEach(b => b.classList.remove('active'));
    document.querySelectorAll(`[data-cat="${cat}"]`).forEach(b => b.classList.add('active'));
  }
  renderProducts();
}

function setCondFilter(cond, btn) {
  const isActive = btn && btn.classList.contains('active');
  document.querySelectorAll('[data-cond]').forEach(b => b.classList.remove('active'));
  if (isActive) currentCondFilter = '';
  else { currentCondFilter = cond; if (btn) btn.classList.add('active'); }
  renderProducts();
}

/* ============================================================
   CATEGORY COUNTS
   ============================================================ */
function updateCatCounts() {
  ['phone','laptop','gaming','accessory'].forEach(cat => {
    const el = document.getElementById(`cat-count-${cat}`);
    const count = products.filter(p => p.cat === cat).length;
    if (el) el.textContent = `${count} product${count !== 1 ? 's' : ''}`;
  });
}

/* ============================================================
   CAROUSEL
   ============================================================ */
function renderCarousel() {
  const featured = products.filter(p => p.featured);
  const track = document.getElementById('carousel-track');
  const dots = document.getElementById('carousel-dots');
  if (!track || !featured.length) return;

  track.innerHTML = featured.map(p => `
    <div class="carousel-slide">
      <div class="carousel-emoji">${p.emoji}</div>
      <div class="carousel-info">
        <div class="carousel-cat">${p.cat}</div>
        <div class="carousel-name">${p.name}</div>
        <div class="carousel-specs">${p.specs}</div>
        <div class="carousel-price">${fmt(p.price)}</div>
        <div class="carousel-ctas">
          <a class="btn-primary" href="${waLink(p)}" target="_blank">📲 Buy on WhatsApp</a>
          <button class="btn-wa" style="padding:12px 18px;font-size:13px;" onclick="addToCart(${p.id})">+ Add to Cart</button>
        </div>
      </div>
    </div>`).join('');

  if (dots) {
    dots.innerHTML = featured.map((_, i) => `<span class="carousel-dot ${i === 0 ? 'active' : ''}" onclick="goCarousel(${i})"></span>`).join('');
  }
}

let carouselTimer = null;
const CAROUSEL_INTERVAL = 20000; // 20 seconds

function carousel(dir) {
  const featured = products.filter(p => p.featured);
  carouselIndex = (carouselIndex + dir + featured.length) % featured.length;
  goCarousel(carouselIndex);
  resetCarouselTimer();
}

function goCarousel(idx) {
  carouselIndex = idx;
  const track = document.getElementById('carousel-track');
  if (track) track.style.transform = `translateX(-${idx * 100}%)`;
  document.querySelectorAll('.carousel-dot').forEach((d, i) => {
    d.classList.toggle('active', i === idx);
  });
  startProgressBar();
}

function startProgressBar() {
  const bar = document.getElementById('carousel-progress-bar');
  if (!bar) return;
  bar.style.transition = 'none';
  bar.style.width = '0%';
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      bar.style.transition = `width ${CAROUSEL_INTERVAL}ms linear`;
      bar.style.width = '100%';
    });
  });
}

function resetCarouselTimer() {
  if (carouselTimer) clearInterval(carouselTimer);
  carouselTimer = setInterval(() => {
    const featured = products.filter(p => p.featured);
    carouselIndex = (carouselIndex + 1) % featured.length;
    goCarousel(carouselIndex);
  }, CAROUSEL_INTERVAL);
}

function startCarouselAutoplay() {
  startProgressBar();
  resetCarouselTimer();
}

/* ============================================================
   TRENDING
   ============================================================ */
function renderTrending() {
  const grid = document.getElementById('trending-grid');
  if (!grid) return;
  const sorted = [...products].sort((a, b) => b.price - a.price);
  const main = sorted[0];
  const rest = sorted.slice(1, 4);

  grid.innerHTML = `
    <div class="trending-main">
      <div class="trending-main-emoji">${main.emoji}</div>
      <h3>${main.name}</h3>
      <div class="trending-main-specs">${main.specs}</div>
      <div class="trending-price">${fmt(main.price)}</div>
      <a class="btn-primary" href="${waLink(main)}" target="_blank">📲 Order Now</a>
    </div>
    <div class="trending-side">
      ${rest.map((p, i) => `
        <div class="trending-item" onclick="window.open('${waLink(p)}','_blank')">
          <div class="trending-item-emoji">${p.emoji}</div>
          <div style="flex:1;">
            <div class="trending-item-name">${p.name}</div>
            <div class="trending-item-price">${fmt(p.price)}</div>
          </div>
          <div class="trending-rank">#${i + 2}</div>
        </div>`).join('')}
    </div>`;
}

/* ============================================================
   COUNTDOWN TIMER
   ============================================================ */
(function initCountdown() {
  const stored = localStorage.getItem('nx_deal_end');
  let endTime;
  if (stored && parseInt(stored) > Date.now()) {
    endTime = parseInt(stored);
  } else {
    endTime = Date.now() + (8 * 3600000 + 24 * 60000 + 37000);
    localStorage.setItem('nx_deal_end', endTime);
  }

  function tick() {
    const diff = Math.max(0, endTime - Date.now());
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    const pad = n => String(n).padStart(2, '0');
    const hEl = document.getElementById('count-h');
    const mEl = document.getElementById('count-m');
    const sEl = document.getElementById('count-s');
    if (hEl) hEl.textContent = pad(h);
    if (mEl) mEl.textContent = pad(m);
    if (sEl) sEl.textContent = pad(s);
  }
  tick();
  setInterval(tick, 1000);
})();

/* ============================================================
   AI ASSISTANT
   ============================================================ */
function toggleAI() {
  const panel = document.getElementById('ai-panel');
  panel.classList.toggle('open');
}

function sendAISugg(btn) {
  document.getElementById('ai-input').value = btn.textContent;
  document.getElementById('ai-suggestions').style.display = 'none';
  sendAIMsg();
}

async function sendAIMsg() {
  const input = document.getElementById('ai-input');
  const msg = input.value.trim();
  if (!msg) return;
  input.value = '';
  addAIMsg('user', msg);

  const typingId = addTyping();
  const inventory = products.map(p =>
    `- ${p.name} | ₦${p.price.toLocaleString()} | ${p.condition === 'new' ? 'Brand New' : 'UK Used'} | ${p.stock} | ${p.specs}`
  ).join('\n');

  const systemPrompt = `You are the AI sales assistant for Nexotronix, a premium tech store in Maiduguri, Nigeria. Here's our current inventory:\n\n${inventory}\n\nRULES:\n1. ONLY recommend products from the inventory above.\n2. Be warm and conversational like a knowledgeable salesperson.\n3. Always mention price and condition.\n4. Keep responses to 2-4 sentences.\n5. End with: "WhatsApp us at +234 903 600 6553 to order!"`;

  try {
    const res = await fetch('https://nexotronix-proxy.samuelphilip002.workers.dev/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 1000, system: systemPrompt, messages: [{ role: 'user', content: msg }] })
    });
    const data = await res.json();
    const reply = data.content?.map(c => c.text || '').join('') || "I couldn't get a response. Please chat us on WhatsApp: +234 903 600 6553";
    removeTyping(typingId);
    addAIMsg('ai', reply);
  } catch (e) {
    removeTyping(typingId);
    addAIMsg('ai', "I'm having trouble right now. Reach us on WhatsApp at +234 903 600 6553 — we're happy to help! 📲");
  }
}

function addAIMsg(role, text) {
  const msgs = document.getElementById('ai-messages');
  const div = document.createElement('div');
  div.className = `ai-msg ${role}`;
  div.innerHTML = `<div class="ai-msg-bubble">${text.replace(/\n/g,'<br>')}</div>`;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
  return div;
}

function addTyping() {
  const msgs = document.getElementById('ai-messages');
  const id = 'typing-' + Date.now();
  const div = document.createElement('div');
  div.className = 'ai-msg ai'; div.id = id;
  div.innerHTML = `<div class="ai-msg-bubble"><div class="typing-indicator"><span></span><span></span><span></span></div></div>`;
  msgs.appendChild(div);
  msgs.scrollTop = msgs.scrollHeight;
  return id;
}

function removeTyping(id) { const el = document.getElementById(id); if (el) el.remove(); }


/* ============================================================
   PRODUCT DETAIL MODAL
   ============================================================ */
let currentModalProduct = null;
let currentImgIndex = 0;

function openProductModal(id) {
  const p = products.find(x => x.id === id);
  if (!p) return;
  currentModalProduct = p;
  currentImgIndex = 0;

  const catLabel = { phone:'Smartphone', laptop:'Laptop', gaming:'Gaming', accessory:'Accessory' }[p.cat] || p.cat;
  const imgs = (p.images && p.images.length > 0) ? p.images : (p.img ? [p.img] : []);

  // Gallery
  const gallery = document.getElementById('pmodal-gallery');
  if (imgs.length > 0) {
    gallery.innerHTML = `
      <div style="position:relative;">
        <img id="pmodal-main-img" src="${imgs[0]}" class="pmodal-main-img"
          onerror="this.parentElement.innerHTML='<div class=\'pmodal-main-placeholder\'><span>${p.emoji}</span><span>${p.name}</span></div>'"
          alt="${p.name}">
        ${imgs.length > 1 ? `<div class="pmodal-img-count">1 / ${imgs.length}</div>` : ''}
      </div>
      ${imgs.length > 1 ? `<div class="pmodal-thumbs">${imgs.map((url, i) =>
        `<div class="pmodal-thumb ${i===0?'active':''}" onclick="switchModalImg(${i},'${url}',${imgs.length})">
          <img src="${url}" alt="img${i}" onerror="this.parentElement.textContent='${p.emoji}'">
        </div>`).join('')}</div>` : ''}`;
  } else {
    gallery.innerHTML = `<div class="pmodal-main-placeholder"><span>${p.emoji}</span><span>${p.name}</span></div>`;
  }

  // Badges
  const cond = p.condition === 'new' ? '<span class="badge badge-new">🟢 Brand New</span>' : '<span class="badge badge-used">🟡 UK Used</span>';
  const stock = p.stock === 'sold' ? '<span class="badge badge-sold">Sold Out</span>' : p.stock === 'limited' ? '<span class="badge badge-hot">⚠️ Limited</span>' : '';
  document.getElementById('pmodal-badges').innerHTML = cond + stock;

  document.getElementById('pmodal-title').textContent = p.name;
  document.getElementById('pmodal-name').textContent = p.name;
  document.getElementById('pmodal-cat').textContent = catLabel;
  document.getElementById('pmodal-price').textContent = fmt(p.price);

  // Stock row
  const qty = (p.quantity !== undefined && p.quantity !== null) ? p.quantity : '—';
  const stockText = p.stock === 'sold' ? '🔴 Sold Out' : p.stock === 'limited' ? '🟡 Limited Stock' : '🟢 In Stock';
  document.getElementById('pmodal-stock-row').innerHTML =
    `<span>${stockText}</span> <span class="pmodal-qty-badge">Qty available: ${qty}</span>`;

  document.getElementById('pmodal-specs').textContent = p.specs;

  // Actions
  const actions = document.getElementById('pmodal-actions');
  if (p.stock === 'sold') {
    actions.innerHTML = `<div class="btn-buy-disabled" style="text-align:center;padding:14px;border-radius:50px;">This product is Sold Out</div>`;
  } else {
    actions.innerHTML = `
      <a class="pmodal-btn-buy" href="${waLink(p)}" target="_blank">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.125.549 4.122 1.51 5.857L.057 23.882l6.207-1.63A11.94 11.94 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 01-5.007-1.37l-.36-.213-3.683.967.983-3.596-.234-.371A9.82 9.82 0 012.182 12c0-5.422 4.396-9.818 9.818-9.818 5.422 0 9.818 4.396 9.818 9.818 0 5.422-4.396 9.818-9.818 9.818z"/></svg>
        📲 Buy on WhatsApp
      </a>
      <button class="pmodal-btn-cart" onclick="addToCart(${p.id}); closeProductModal();">+ Add to Cart</button>`;
  }

  document.getElementById('product-modal').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function switchModalImg(idx, url, total) {
  currentImgIndex = idx;
  const mainImg = document.getElementById('pmodal-main-img');
  if (mainImg) { mainImg.src = url; }
  const countEl = document.querySelector('.pmodal-img-count');
  if (countEl) countEl.textContent = `${idx + 1} / ${total}`;
  document.querySelectorAll('.pmodal-thumb').forEach((t, i) => t.classList.toggle('active', i === idx));
}

function closeProductModal() {
  document.getElementById('product-modal').classList.remove('open');
  document.body.style.overflow = '';
}

document.getElementById('product-modal').addEventListener('click', function(e) {
  if (e.target === this) closeProductModal();
});

/* ============================================================
   ADMIN — MULTIPLE IMAGES
   ============================================================ */
function addImgRow() {
  const list = document.getElementById('img-url-list');
  if (list.children.length >= 5) { showToast('Maximum 5 images per product'); return; }
  const row = document.createElement('div');
  row.className = 'img-url-row';
  row.innerHTML = `<input class="form-input" type="url" placeholder="https://example.com/image.jpg">
    <button class="btn-remove-img" onclick="removeImgRow(this)">✕</button>`;
  list.appendChild(row);
}

function removeImgRow(btn) {
  const list = document.getElementById('img-url-list');
  if (list.children.length <= 1) { btn.previousElementSibling.value = ''; return; }
  btn.parentElement.remove();
}

/* ============================================================
   ADMIN — EDIT STOCK & QUANTITY
   ============================================================ */
function saveProductEdit(id) {
  const p = products.find(x => x.id === id);
  if (!p) return;
  const stockEl = document.getElementById('edit-stock-' + id);
  const qtyEl = document.getElementById('edit-qty-' + id);
  const priceEl = document.getElementById('edit-price-' + id);
  if (stockEl) p.stock = stockEl.value;
  if (qtyEl) p.quantity = parseInt(qtyEl.value) || 0;
  if (priceEl && parseInt(priceEl.value) > 0) p.price = parseInt(priceEl.value);
  saveProducts(); renderProducts(); renderCarousel();
  startCarouselAutoplay(); renderTrending(); renderAdminList();
  showToast('✅ Product updated!');
  pushToGitHub();
}


/* ── OTP COLOUR PUZZLE ──────────────────────────────────────── */
function renderOtpPuzzle(otp) {
  // Each tile: digit, colour, and within-colour position (1 or 2)
  const tiles = [
    { digit: otp[0], colour: 'red',   pos: 1 },
    { digit: otp[1], colour: 'red',   pos: 2 },
    { digit: otp[2], colour: 'blue',  pos: 1 },
    { digit: otp[3], colour: 'blue',  pos: 2 },
    { digit: otp[4], colour: 'green', pos: 1 },
    { digit: otp[5], colour: 'green', pos: 2 },
  ];
  // Fully shuffle all 6 tiles individually
  for (let i = tiles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [tiles[i], tiles[j]] = [tiles[j], tiles[i]];
  }
  // Ensure within each colour, pos1 always appears before pos2
  ['red','blue','green'].forEach(col => {
    const idx = tiles.reduce((a, t, i) => t.colour === col ? [...a, i] : a, []);
    if (tiles[idx[0]].pos > tiles[idx[1]].pos) {
      [tiles[idx[0]], tiles[idx[1]]] = [tiles[idx[1]], tiles[idx[0]]];
    }
  });
  const tilesEl = document.getElementById('otp-colour-tiles');
  tilesEl.innerHTML = tiles.map(t =>
    '<div class="otp-ctile ' + t.colour + '">' + t.digit + '</div>'
  ).join('');
}

/* ============================================================
   ADMIN AUTH — PASSWORD + OTP
   ============================================================ */
// ⚠️ Change these credentials in the source code:
// Password verification now happens server-side in the Worker — nothing sensitive stored here.
let currentOTP = null;
let otpExpiry = null;

function openAdminAuth() {
  document.getElementById('admin-auth-modal').classList.add('open');
  document.getElementById('auth-step-1').classList.add('active');
  document.getElementById('auth-step-2').classList.remove('active');
  document.getElementById('auth-pw-error').style.display = 'none';
  document.getElementById('auth-otp-error').style.display = 'none';
  document.getElementById('auth-password').value = '';
  document.getElementById('auth-otp').value = '';
  setTimeout(() => document.getElementById('auth-password').focus(), 100);
}

function closeAdminAuth() {
  document.getElementById('admin-auth-modal').classList.remove('open');
}

async function checkPassword() {
  if (SEC.isLocked()) {
    const errEl = document.getElementById('auth-pw-error');
    errEl.textContent = '🔒 Locked for ' + SEC.minsLeft() + ' min after too many attempts.';
    errEl.style.display = 'block'; return;
  }
  const pw = document.getElementById('auth-password').value;
  const errEl = document.getElementById('auth-pw-error');

  let loginRes;
  try {
    loginRes = await fetch('https://nexotronix-proxy.samuelphilip002.workers.dev/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ site: 'admin', username: 'admin', password: pw })
    });
  } catch (e) {
    errEl.textContent = '⚠️ Could not reach server. Check your connection.';
    errEl.style.display = 'block'; return;
  }

  if (!loginRes.ok) {
    if (loginRes.status >= 500) {
      errEl.textContent = '⚠️ Server not set up yet (status '+loginRes.status+'). Check Worker secrets/KV binding.';
      errEl.style.display = 'block'; return;
    }
    SEC.fail();
    const left = SEC.maxAttempts - SEC.getA().n;
    errEl.textContent = left<=0 ? '🔒 Account locked 15 min.' : 'Wrong password. '+left+(left===1?' attempt left':' attempts left')+'.';
    errEl.style.display='block';
    document.getElementById('auth-password').value=''; return;
  }

  const { token } = await loginRes.json();
  sessionStorage.setItem('nx_admin_token', token);

  SEC.reset(); SEC.startSess(); logActivity('Admin login successful');
  errEl.style.display = 'none';
  // Generate OTP & render puzzle
  currentOTP = String(Math.floor(100000 + Math.random() * 900000));
  otpExpiry = Date.now() + 120000; // 2 min
  renderOtpPuzzle(currentOTP);
  document.getElementById('auth-step-1').classList.remove('active');
  document.getElementById('auth-step-2').classList.add('active');
  setTimeout(() => document.getElementById('auth-otp').focus(), 100);
}

function checkOTP() {
  const entered = document.getElementById('auth-otp').value.trim();
  const errEl = document.getElementById('auth-otp-error');

  if (!currentOTP || Date.now() > otpExpiry) {
    errEl.textContent = 'OTP expired. Please restart.';
    errEl.style.display = 'block';
    return;
  }
  if (entered !== currentOTP) {
    errEl.style.display = 'block';
    document.getElementById('auth-otp').value = '';
    return;
  }
  // SUCCESS
  closeAdminAuth();
  currentOTP = null;
  openAdminPanel();
}

function openAdminPanel() {
  document.getElementById('admin-panel').style.display = 'block';
  renderAdminList();
}

/* closeAdmin: superseded by safe window.closeAdmin assignment below */

// Keyboard shortcut — Ctrl+Shift+A
document.addEventListener('keydown', e => {
  if (e.ctrlKey && e.shiftKey && e.key === 'A') { e.preventDefault(); openAdminAuth(); }
});

// Mobile secret: tap footer logo 5 times within 3 seconds
let tapCount = 0, tapTimer;
document.getElementById('footer-logo-tap').addEventListener('click', () => {
  tapCount++;
  clearTimeout(tapTimer);
  tapTimer = setTimeout(() => tapCount = 0, 3000);
  if (tapCount >= 5) { tapCount = 0; openAdminAuth(); }
});

// Hidden secret #2: inside the Admin Panel, tap the logo 5 times
// within 3 seconds to open the ERP. No visible card, no tap feedback.
let erpTapCount = 0, erpTapTimer;
const adminLogoTap = document.getElementById('admin-logo-tap');
if (adminLogoTap) {
  adminLogoTap.addEventListener('click', () => {
    erpTapCount++;
    clearTimeout(erpTapTimer);
    erpTapTimer = setTimeout(() => erpTapCount = 0, 3000);
    if (erpTapCount >= 5) {
      erpTapCount = 0;
      window.open('fatcarbohydrate.html', '_blank');
    }
  });
}

/* ============================================================
   ADMIN PRODUCT MANAGEMENT
   ============================================================ */
function renderAdminList() {
  const list = document.getElementById('admin-products-list');
  list.innerHTML = `<h3 style="font-family:var(--font-display);font-size:17px;font-weight:800;margin-bottom:14px;padding:0 24px;">All Products (${products.length})</h3>` +
    products.map(p => `
      <div class="admin-product-row" style="flex-direction:column;align-items:stretch;">
        <div style="display:flex;align-items:center;gap:12px;">
          <div class="admin-product-emoji">${p.emoji}</div>
          <div class="admin-product-info">
            <h4>${p.name}</h4>
            <p>${p.condition === 'new' ? '🟢 New' : '🟡 UK Used'} · ${p.cat}</p>
          </div>
          <div class="admin-product-price">${fmt(p.price)}</div>
          <button class="btn-del" onclick="deleteProduct(${p.id})">Delete</button>
        </div>
        <div class="admin-edit-row">
          <label style="font-size:11px;color:var(--text-muted);">Stock:</label>
          <select class="admin-mini-select" id="edit-stock-${p.id}">
            <option value="instock" ${p.stock==='instock'?'selected':''}>In Stock</option>
            <option value="limited" ${p.stock==='limited'?'selected':''}>Limited</option>
            <option value="sold" ${p.stock==='sold'?'selected':''}>Sold Out</option>
          </select>
          <label style="font-size:11px;color:var(--text-muted);">Qty:</label>
          <input class="admin-mini-input" id="edit-qty-${p.id}" type="number" min="0" value="${p.quantity||0}" style="width:56px;">
          <label style="font-size:11px;color:var(--text-muted);">₦ Price:</label>
          <input class="admin-mini-input" id="edit-price-${p.id}" type="number" min="0" value="${p.price}" style="width:90px;">
          <button class="btn-save-edit" onclick="saveProductEdit(${p.id})">Save</button>
        </div>
      </div>`).join('');
}

function deleteProduct(id) {
  if (!confirm('Delete this product?')) return;
  products = products.filter(p => p.id !== id);
  saveProducts(); renderProducts(); renderCarousel();
  startCarouselAutoplay(); renderTrending(); updateCatCounts(); renderAdminList();
  showToast('Product deleted');
  pushToGitHub();
}

async function aiGenerateSpecs() {
  const name = document.getElementById('p-name').value.trim();
  if (!name) { showToast('Enter a product name first'); return; }
  const btn = document.querySelector('.ai-gen-btn');
  btn.textContent = '⏳ Generating...';
  btn.disabled = true;
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': getAiKey(), 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514', max_tokens: 1000,
        messages: [{ role: 'user', content: `Generate a concise product specs summary for "${name}" in 1 line (max 120 chars), comma-separated key specs only. No intro text, just the specs. Example: "6.7" OLED, A17 Pro, 48MP, 256GB, USB-C"` }]
      })
    });
    const data = await res.json();
    const specs = data.content?.map(c => c.text || '').join('').trim();
    if (specs) document.getElementById('p-specs').value = specs;
  } catch(e) { showToast('AI unavailable, enter specs manually'); }
  btn.textContent = '✨ Auto-Generate with AI';
  btn.disabled = false;
}

function adminAddProduct() {
  const name = document.getElementById('p-name').value.trim();
  const price = parseInt(document.getElementById('p-price').value);
  if (!name || !price) { showToast('Name and price are required'); return; }
  const catVal = document.getElementById('p-cat').value;
  const imgRows = document.querySelectorAll('#img-url-list .img-url-row input');
  const images = Array.from(imgRows).map(i => i.value.trim()).filter(Boolean);
  const product = {
    id: Date.now(), name, cat: catVal,
    emoji: document.getElementById('p-emoji').value || { phone:'📱', laptop:'💻', gaming:'🎮', accessory:'🎧' }[catVal],
    condition: document.getElementById('p-cond').value, price,
    stock: document.getElementById('p-stock').value,
    quantity: parseInt(document.getElementById('p-qty').value) || 1,
    specs: document.getElementById('p-specs').value || 'High quality device',
    featured: document.getElementById('p-featured').value === 'yes',
    img: images[0] || '',
    images: images,
  };
  products.unshift(product);
  saveProducts(); renderProducts(); renderCarousel();
  startCarouselAutoplay(); renderTrending(); updateCatCounts(); renderAdminList();
  ['p-name','p-price','p-specs','p-emoji','p-qty'].forEach(id => document.getElementById(id).value = '');
  document.querySelectorAll('#img-url-list .img-url-row input').forEach(i => i.value = '');
  const list = document.getElementById('img-url-list');
  while (list.children.length > 1) list.lastChild.remove();
  showToast('✅ Product added!');
  pushToGitHub();
}

/* ============================================================
   TOAST
   ============================================================ */
function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.style.display = 'block';
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => { toast.style.display = 'none'; }, 3000);
}

/* ============================================================
   NAV + UI
   ============================================================ */
window.addEventListener('scroll', () => {
  document.getElementById('nav').classList.toggle('scrolled', window.scrollY > 50);
});

function toggleMenu() {
  const menu = document.getElementById('mobile-menu');
  const ham = document.getElementById('hamburger');
  menu.classList.toggle('open');
  ham.classList.toggle('open');
}

function focusSearch() {
  const box = document.getElementById('search-inner-collapsible');
  const isOpen = box.style.display !== 'none';
  box.style.display = isOpen ? 'none' : 'block';
  if (!isOpen) {
    document.getElementById('search-input').focus();
    updateHeaderSpacer();
  }
}
// Close modals on backdrop click
document.getElementById('cart-modal').addEventListener('click', function(e) {
  if (e.target === this) closeCart();
});
document.getElementById('admin-auth-modal').addEventListener('click', function(e) {
  if (e.target === this) closeAdminAuth();
});

/* ============================================================
   INIT
   ============================================================ */



/* ============================================================
   GITHUB JSON DATABASE
   ============================================================ */
const GH_USER  = 'samusts';
const GH_REPO  = 'Nexotronix';
const GH_FILE  = 'db.json';
const GH_RAW   = 'https://raw.githubusercontent.com/samusts/Nexotronix/main/db.json';
const GH_API   = 'https://api.github.com/repos/samusts/Nexotronix/contents/db.json';

function getGhToken() {
  if (typeof NEXOTRONIX_CONFIG !== 'undefined' && NEXOTRONIX_CONFIG.githubToken) {
    return NEXOTRONIX_CONFIG.githubToken;
  }
  return localStorage.getItem('nexotronix_gh_token') || '';
}

function saveGhToken() {
  const t = document.getElementById('gh-token-input').value.trim();
  if (!t) { showToast('Please enter a token'); return; }
  localStorage.setItem('nexotronix_gh_token', t);
  document.getElementById('gh-token-input').value = '';
  showToast('✅ GitHub token saved!');
  setGhStatus('yellow', 'Testing connection...');
  syncFromGitHub();
}

function saveAiKey() {
  const k = document.getElementById('ai-key-input').value.trim();
  if (!k) { showToast('Please enter an API key'); return; }
  localStorage.setItem('nexotronix_ai_key', k);
  document.getElementById('ai-key-input').value = '';
  showToast('✅ AI key saved!');
}

function getAiKey() {
  if (typeof NEXOTRONIX_CONFIG !== 'undefined' && NEXOTRONIX_CONFIG.anthropicKey) {
    return NEXOTRONIX_CONFIG.anthropicKey;
  }
  return localStorage.getItem('nexotronix_ai_key') || '';
}

function setGhStatus(color, text) {
  const dot = document.getElementById('gh-dot');
  const txt = document.getElementById('gh-status-text');
  if (dot) { dot.className = 'gh-dot ' + color; }
  if (txt) { txt.textContent = text; }
}

async function syncFromGitHub() {
  setGhStatus('yellow', 'Syncing...');
  try {
    const res = await fetch('https://nexotronix-proxy.samuelphilip002.workers.dev/db?t=' + Date.now());
    if (!res.ok) throw new Error('Fetch failed');
    const raw = await res.json();
    const db = raw.content
      ? JSON.parse(decodeURIComponent(escape(atob(raw.content.replace(/\n/g,'')))))
      : raw;
    if (db.products && db.products.length > 0) {
      products = db.products;
      saveProducts();
    }
    if (db.reviews) {
      localStorage.setItem('nexotronix_reviews', JSON.stringify(db.reviews));
    }
    if (db.aiKey) { localStorage.setItem('nexotronix_ai_key', db.aiKey); }
    if (db.services) { localStorage.setItem('nx_services',JSON.stringify(db.services)); customServices=db.services; renderServiceCards(); }
    if (db.categories) { localStorage.setItem('nx_cats',JSON.stringify(db.categories)); customCategories=db.categories; }
    if (db.settings) { localStorage.setItem('nx_settings',JSON.stringify(db.settings)); storeSettings=db.settings; }
    if (db.flash) { localStorage.setItem('nx_flash',JSON.stringify(db.flash)); renderFlashBanner(); }
    if (db.notifs) { localStorage.setItem('nx_notifs',JSON.stringify(db.notifs)); updateNotifBadge(); }
    localStorage.setItem('nx_last_sync', String(Date.now()));
    updateLastSyncTime();
    renderProducts(); renderCarousel(); renderTrending(); updateCatCounts();
    renderTestiPage(0, false); loadReviews();
    setGhStatus('green', '✅ Synced — ' + new Date().toLocaleTimeString());
    localStorage.setItem('nx_last_sync', String(Date.now()));
    updateLastSyncTime();
    if (document.getElementById('admin-list')) renderAdminList();
  } catch(e) {
    setGhStatus('red', 'Sync failed — check connection');
    console.error(e);
  }
}

async function pushToGitHub() {
  setGhStatus('yellow', 'Saving to cloud...');
  try {
    // Get current SHA
    const metaRes = await fetch('https://nexotronix-proxy.samuelphilip002.workers.dev/db', {
      headers: { Accept: 'application/vnd.github.v3+json' }
    });
    let sha = null;
    if (metaRes.ok) {
      const meta = await metaRes.json();
      sha = meta.sha;
    }

    const reviews = JSON.parse(localStorage.getItem('nexotronix_reviews')||'[]');
    const aiKey = localStorage.getItem('nexotronix_ai_key')||'';
    const svcs = JSON.parse(localStorage.getItem('nx_services')||'[]');
    const cats = JSON.parse(localStorage.getItem('nx_cats')||'[]');
    const settings = JSON.parse(localStorage.getItem('nx_settings')||'{}');
    const flash = JSON.parse(localStorage.getItem('nx_flash')||'null');
    const notifs = JSON.parse(localStorage.getItem('nx_notifs')||'[]');
    const db = {products, reviews, aiKey, services:svcs, categories:cats, settings, flash, notifs, lastUpdated:Date.now()};
    const content = btoa(unescape(encodeURIComponent(JSON.stringify(db, null, 2))));

    const body = { message: 'Update db.json', content };
    if (sha) body.sha = sha;

    const putRes = await fetch('https://nexotronix-proxy.samuelphilip002.workers.dev/db', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + (sessionStorage.getItem('nx_admin_token') || '')
      },
      body: JSON.stringify(body)
    });

    if (!putRes.ok) throw new Error('Push failed');
    setGhStatus('green', 'Saved to cloud — ' + new Date().toLocaleTimeString());
    showToast('☁️ Saved to GitHub!');
  } catch(e) {
    setGhStatus('red', 'Save failed — ' + e.message);
    showToast('⚠️ Cloud save failed — saved locally only');
    console.error(e);
  }
}



/* ============================================================
   FEEDBACK / REVIEWS
   ============================================================ */
let selectedStars = 5;
let testiPage = 0;
let testiTimer = null;
const MAX_REVIEWS = 20;

const DEFAULT_REVIEWS = [
  { name: 'Ahmad Bello', location: 'Maiduguri, Borno', stars: 5,
    text: 'Got my iPhone 15 Pro Max delivered same day. The phone is 100% original with proper warranty. Nexotronix is the real deal in Maiduguri!' },
  { name: 'Fatima Usman', location: 'Abuja, FCT', stars: 5,
    text: 'Ordered a UK-used MacBook Pro and I can\'t believe the quality. Looks brand new, works perfectly. Price was very fair. Highly recommended!' },
  { name: 'Musa Ibrahim', location: 'Kano, Nigeria', stars: 5,
    text: 'The PS5 I bought for my son is genuine. Fast delivery, good packaging, and the customer service on WhatsApp was excellent. Will definitely order again!' },
];

function setStars(n) {
  selectedStars = n;
  document.querySelectorAll('#star-row .star-btn').forEach((btn, i) => {
    btn.classList.toggle('selected', i < n);
  });
}

function getAllReviews() {
  const saved = JSON.parse(localStorage.getItem('nexotronix_reviews') || '[]');
  // Newest customer reviews first, then defaults
  return [...saved, ...DEFAULT_REVIEWS];
}

function renderTestiPage(page, animate) {
  const all = getAllReviews();
  const totalPages = Math.ceil(all.length / 3);
  const slice = all.slice(page * 3, page * 3 + 3);
  const grid = document.getElementById('testi-grid');
  if (!grid) return;

  function doRender() {
    grid.innerHTML = slice.map(r => `
      <div class="testi-card fade-in">
        <div class="testi-stars">${'★'.repeat(r.stars)}${'☆'.repeat(5 - r.stars)}</div>
        <p class="testi-text">"${r.text}"</p>
        <div class="testi-author">
          <div class="testi-avatar">👤</div>
          <div>
            <div class="testi-name">${r.name}</div>
            <div class="testi-location">${r.location || r.date || ''}</div>
          </div>
        </div>
      </div>`).join('');

    // Dots
    const dots = document.getElementById('testi-dots');
    if (dots) {
      dots.innerHTML = Array.from({length: totalPages}, (_, i) =>
        `<div class="testi-dot ${i === page ? 'active' : ''}"></div>`).join('');
    }
  }

  if (animate && grid.children.length > 0) {
    grid.querySelectorAll('.testi-card').forEach(c => c.classList.add('fade-out'));
    setTimeout(doRender, 450);
  } else {
    doRender();
  }
}

function startTestiAutoplay() {
  if (testiTimer) clearInterval(testiTimer);
  testiTimer = setInterval(() => {
    const all = getAllReviews();
    const totalPages = Math.ceil(all.length / 3);
    testiPage = (testiPage + 1) % totalPages;
    renderTestiPage(testiPage, true);
  }, 6000);
}

async function submitReview() {
  const name = document.getElementById('review-name').value.trim();
  const text = document.getElementById('review-text').value.trim();
  if (!name) { showToast('Please enter your name'); return; }
  if (!text)  { showToast('Please write your review'); return; }

  const btn = document.querySelector('.feedback-submit-btn');
  btn.textContent = '🔍 Checking review...';
  btn.disabled = true;

  // Moderate with AI — reject reviews that don't promote Nexotronix
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': getAiKey(), 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 50,
        system: 'You are a review moderator for Nexotronix, a tech store in Maiduguri, Nigeria. Reply with only "APPROVE" if the review is positive, genuine, or neutral about the store/products. Reply with only "REJECT" if the review is negative, offensive, spam, unrelated, or harms the store reputation. One word only.',
        messages: [{ role: 'user', content: `Review by ${name}: "${text}"` }]
      })
    });
    const data = await res.json();
    const verdict = data.content?.[0]?.text?.trim().toUpperCase();
    if (verdict !== 'APPROVE') {
      showToast('⚠️ Review could not be posted.');
      btn.textContent = '⭐ Submit Review';
      btn.disabled = false;
      return;
    }
  } catch(e) {
    // If AI check fails, allow through
  }

  const reviews = JSON.parse(localStorage.getItem('nexotronix_reviews') || '[]');
  reviews.unshift({
    name, text, stars: selectedStars,
    location: '',
    date: new Date().toLocaleDateString('en-NG', { day:'numeric', month:'short', year:'numeric' })
  });
  // Keep only latest MAX_REVIEWS
  if (reviews.length > MAX_REVIEWS) reviews.splice(MAX_REVIEWS);
  localStorage.setItem('nexotronix_reviews', JSON.stringify(reviews));

  document.getElementById('review-name').value = '';
  document.getElementById('review-text').value = '';
  setStars(5);
  btn.textContent = '⭐ Submit Review';
  btn.disabled = false;

  const succ = document.getElementById('feedback-success');
  succ.style.display = 'block';
  setTimeout(() => succ.style.display = 'none', 3000);

  pushToGitHub();
  // Jump to page 0 to show new review immediately
  testiPage = 0;
  renderTestiPage(0, true);
  startTestiAutoplay();
  showToast('✅ Review posted!');

  // Update list below form
  loadReviews();
}

function loadReviews() {
  const list = document.getElementById('customer-reviews-list');
  if (!list) return;
  const reviews = JSON.parse(localStorage.getItem('nexotronix_reviews') || '[]');
  if (!reviews.length) { list.innerHTML = ''; return; }
  list.innerHTML = reviews.map(r => `
    <div class="customer-review-item">
      <div class="customer-review-stars">${'⭐'.repeat(Math.min(5, Math.max(0, parseInt(r.stars)||0)))}</div>
      <div class="customer-review-text">"${escapeHtml(r.text)}"</div>
      <div class="customer-review-meta">${escapeHtml(r.name)} · ${escapeHtml(r.date)}</div>
    </div>`).join('');
}

// Init



/* ============================================================
   PWA — Install prompt & Service Worker
   ============================================================ */
let deferredInstallPrompt = null;

window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  deferredInstallPrompt = e;
  // Show install banner after 30s
  setTimeout(showInstallBanner, 30000);
});

function showInstallBanner() {
  if (!deferredInstallPrompt) return;
  const banner = document.createElement('div');
  banner.id = 'install-banner';
  banner.style.cssText = 'position:fixed;bottom:80px;left:16px;right:16px;z-index:3000;background:var(--surface);border:1px solid var(--gold);border-radius:14px;padding:14px 16px;display:flex;align-items:center;gap:12px;box-shadow:0 8px 32px rgba(0,0,0,0.3);';
  banner.innerHTML = `
    <span style="font-size:28px;">⚡</span>
    <div style="flex:1;">
      <div style="font-weight:700;font-size:13px;">Install Nexotronix App</div>
      <div style="font-size:11px;color:var(--text-muted);">Fast access, works offline</div>
    </div>
    <button onclick="installPWA()" style="background:var(--gold);color:#0a0a0a;border:none;border-radius:20px;padding:7px 14px;font-weight:700;font-size:12px;cursor:pointer;">Install</button>
    <button onclick="this.parentElement.remove()" style="background:none;border:none;color:var(--text-muted);font-size:18px;cursor:pointer;">✕</button>`;
  document.body.appendChild(banner);
}

async function installPWA() {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  const result = await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  document.getElementById('install-banner')?.remove();
  if (result.outcome === 'accepted') showToast('✅ Nexotronix installed!');
}

// Register service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/Nexotronix/sw.js')
      .then(reg => console.log('SW registered'))
      .catch(err => console.log('SW failed:', err));
  });
}

/* ============================================================
   NOTIFICATION SYSTEM
   ============================================================ */
let notifications = JSON.parse(localStorage.getItem('nx_notifs') || '[]');

function addNotif(title, body, icon = '🔔', url = null) {
  const n = { id: Date.now(), title, body, icon, url, read: false, time: Date.now() };
  notifications.unshift(n);
  notifications = notifications.slice(0, 20);
  localStorage.setItem('nx_notifs', JSON.stringify(notifications));
  renderNotifs();
  updateNotifBadge();
}

function renderNotifs() {
  const list = document.getElementById('notif-list');
  if (!list) return;
  if (!notifications.length) {
    list.innerHTML = '<div style="padding:16px;text-align:center;color:var(--text-muted);font-size:13px;">No notifications yet</div>';
    return;
  }
  list.innerHTML = notifications.map(n => `
    <div onclick="markNotifRead(${n.id})" style="padding:10px 12px;border-radius:10px;margin-bottom:4px;cursor:pointer;background:${n.read ? 'transparent' : 'var(--surface2)'};border:1px solid ${n.read ? 'transparent' : 'var(--border)'};">
      <div style="display:flex;gap:8px;align-items:flex-start;">
        <span style="font-size:20px;">${n.icon}</span>
        <div style="flex:1;">
          <div style="font-size:12px;font-weight:700;margin-bottom:2px;">${n.title}</div>
          <div style="font-size:11px;color:var(--text-muted);">${n.body}</div>
          <div style="font-size:10px;color:var(--text-dim);margin-top:3px;">${timeAgo(n.time)}</div>
        </div>
        ${!n.read ? '<div style="width:7px;height:7px;border-radius:50%;background:var(--gold);flex-shrink:0;margin-top:3px;"></div>' : ''}
      </div>
    </div>`).join('');
}

function markNotifRead(id) {
  notifications = notifications.map(n => n.id === id ? {...n, read: true} : n);
  localStorage.setItem('nx_notifs', JSON.stringify(notifications));
  renderNotifs();
  updateNotifBadge();
}

function clearNotifs() {
  notifications = [];
  localStorage.setItem('nx_notifs', '[]');
  renderNotifs();
  updateNotifBadge();
}

function updateNotifBadge() {
  const unread = notifications.filter(n => !n.read).length;
  const badge = document.getElementById('notif-badge');
  if (!badge) return;
  badge.style.display = unread > 0 ? 'flex' : 'none';
  badge.textContent = unread > 9 ? '9+' : unread;
}

/* toggleNotifPanel: superseded by event-aware version below */

function timeAgo(ts) {
  const diff = Date.now() - ts;
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return Math.floor(diff/60000) + 'm ago';
  if (diff < 86400000) return Math.floor(diff/3600000) + 'h ago';
  return Math.floor(diff/86400000) + 'd ago';
}

// Close notif panel on outside click
document.addEventListener('click', e => {
  const panel = document.getElementById('notif-panel');
  if (panel && !panel.contains(e.target) && !e.target.classList.contains('notif-bell')) {
    panel.style.display = 'none';
  }
});

/* renderAnalyticsPanel: superseded by Analytics.renderAnalyticsPanel-using version below */


/* ============================================================
   SECURITY SYSTEM
   ============================================================ */
const SEC = {
  maxAttempts: 5, lockoutMs: 15*60*1000, sessionMs: 30*60*1000,
  getA() { return JSON.parse(localStorage.getItem('nx_sec_a')||'{"n":0,"t":0}'); },
  setA(d) { localStorage.setItem('nx_sec_a', JSON.stringify(d)); },
  isLocked() {
    const a=this.getA();
    if (a.n>=this.maxAttempts && Date.now()-a.t<this.lockoutMs) return true;
    if (Date.now()-a.t>=this.lockoutMs) { this.setA({n:0,t:0}); return false; }
    return false;
  },
  fail() { const a=this.getA(); this.setA({n:a.n+1,t:Date.now()}); },
  reset() { this.setA({n:0,t:0}); },
  minsLeft() { const a=this.getA(); return Math.ceil((this.lockoutMs-(Date.now()-a.t))/60000); },
  startSess() { localStorage.setItem('nx_admin_sess',String(Date.now())); },
  validSess() { const s=localStorage.getItem('nx_admin_sess'); return !!(s && Date.now()-parseInt(s)<this.sessionMs); },
  endSess() { localStorage.removeItem('nx_admin_sess'); }
};

function sanitize(s) {
  if (typeof s!=='string') return '';
  return s.replace(/[<>&"'`]/g,c=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&#x27;','`':'&#x60;'}[c]));
}

// Session timeout monitor
setInterval(() => {
  const p = document.getElementById('admin-panel');
  const wasLoggedIn=localStorage.getItem('nx_admin_active')==='1';
  if (p && wasLoggedIn && p.style.display!=='none' && !SEC.validSess()) {
    p.style.display='none'; document.body.style.overflow='';
    showToast('⏰ Session expired. Please login again.');
    logActivity('Auto-logout: session expired');
  }
  // Update session status
  const el = document.getElementById('admin-session-status');
  if (el && SEC.validSess()) {
    const mins = Math.ceil((SEC.sessionMs-(Date.now()-parseInt(localStorage.getItem('nx_admin_sess')||'0')))/60000);
    el.textContent = `Session: ${mins}m remaining`;
  }
}, 30000);

/* ============================================================
   ACTIVITY LOG
   ============================================================ */
function logActivity(action) {
  const logs = JSON.parse(localStorage.getItem('nx_act_log')||'[]');
  logs.unshift({action:sanitize(action), time:Date.now()});
  localStorage.setItem('nx_act_log', JSON.stringify(logs.slice(0,100)));
}

function renderActivityLog() {
  const el = document.getElementById('activity-content');
  if (!el) return;
  const logs = JSON.parse(localStorage.getItem('nx_act_log')||'[]');
  if (!logs.length) { el.innerHTML='<div style="padding:24px;text-align:center;color:var(--text-muted);">No activity recorded yet</div>'; return; }
  el.innerHTML = '<div style="padding:0 4px;">' + logs.map(l=>`
    <div style="display:flex;gap:10px;padding:9px 0;border-bottom:1px solid var(--border);font-size:11.5px;align-items:flex-start;">
      <span style="color:var(--text-dim);white-space:nowrap;flex-shrink:0;">${new Date(l.time).toLocaleString()}</span>
      <span style="color:var(--text);">${l.action}</span>
    </div>`).join('') + '</div>';
}

/* ============================================================
   FLASH SALE SYSTEM
   ============================================================ */
function getFlashSale() { return JSON.parse(localStorage.getItem('nx_flash')||'null'); }

function renderFlashBanner() {
  document.getElementById('flash-banner')?.remove();
  const s = getFlashSale();
  if (!s?.active || Date.now()>s.endTime) return;
  const mins = Math.max(0, Math.ceil((s.endTime-Date.now())/60000));
  const b = document.createElement('div');
  b.id='flash-banner';
  b.style.cssText='background:linear-gradient(90deg,#e53e3e,#c53030);color:#fff;text-align:center;padding:8px 16px;font-size:12px;font-weight:700;letter-spacing:0.3px;position:fixed;width:100%;z-index:996;';
  b.innerHTML=`⚡ FLASH SALE — ${sanitize(s.label)}: ${s.discount}% OFF! ⏱ ${mins} mins left <button onclick="this.parentElement.remove()" style="background:none;border:none;color:rgba(255,255,255,0.8);margin-left:8px;cursor:pointer;font-size:14px;">✕</button>`;
  // Insert after marquee
  const marquee = document.querySelector('.marquee-strip');
  if (marquee) marquee.after(b);
}

function startFlashSale() {
  const label = document.getElementById('set-flash-label')?.value.trim()||'Flash Sale';
  const disc = parseInt(document.getElementById('set-flash-disc')?.value)||20;
  const dur = parseInt(document.getElementById('set-flash-dur')?.value)||120;
  const sale = {active:true, label, discount:disc, endTime:Date.now()+dur*60000};
  localStorage.setItem('nx_flash', JSON.stringify(sale));
  renderFlashBanner();
  addNotif('⚡ Flash Sale LIVE!', `${label} — ${disc}% OFF for ${dur} minutes!`, '🔥');
  logActivity(`Started flash sale: ${label} ${disc}% off`);
  showToast('⚡ Flash Sale is LIVE!');
  pushToGitHub();
}

function endFlashSale() {
  localStorage.removeItem('nx_flash');
  document.getElementById('flash-banner')?.remove();
  logActivity('Flash sale ended');
  showToast('Flash sale ended');
  pushToGitHub();
}

setInterval(renderFlashBanner, 60000);

/* ============================================================
   DYNAMIC SERVICES MANAGEMENT
   ============================================================ */
let customServices = JSON.parse(localStorage.getItem('nx_services')||'[]');

function adminAddService() {
  const name = document.getElementById('svc-name')?.value.trim();
  if (!name) { showToast('Please enter a service name'); return; }
  const svc = {
    id: Date.now(),
    name: sanitize(name),
    desc: sanitize(document.getElementById('svc-desc')?.value.trim()||''),
    price: sanitize(document.getElementById('svc-price')?.value.trim()||''),
    duration: sanitize(document.getElementById('svc-duration')?.value.trim()||''),
    icon: document.getElementById('svc-icon')?.value.trim()||'🔧',
    wa: sanitize(document.getElementById('svc-wa')?.value.trim()||`Hi Nexotronix, I need ${name}`),
    status: document.getElementById('svc-status')?.value||'active',
    createdAt: Date.now()
  };
  customServices.unshift(svc);
  localStorage.setItem('nx_services', JSON.stringify(customServices));
  renderServicesAdmin();
  renderServiceCards();
  logActivity(`Added service: ${name}`);
  showToast('✅ Service added!');
  ['svc-name','svc-desc','svc-price','svc-duration','svc-icon','svc-wa'].forEach(id=>{
    const el=document.getElementById(id); if(el) el.value='';
  });
  pushToGitHub();
}

function toggleServiceStatus(id) {
  const s = customServices.find(x=>x.id===id);
  if (!s) return;
  s.status = s.status==='active' ? 'hidden' : 'active';
  localStorage.setItem('nx_services',JSON.stringify(customServices));
  renderServicesAdmin(); renderServiceCards();
  logActivity(`Service "${s.name}" → ${s.status}`);
  pushToGitHub();
}

function deleteService(id) {
  const s = customServices.find(x=>x.id===id);
  customServices = customServices.filter(x=>x.id!==id);
  localStorage.setItem('nx_services',JSON.stringify(customServices));
  renderServicesAdmin(); renderServiceCards();
  logActivity(`Deleted service: ${s?.name||id}`);
  showToast('Service deleted');
  pushToGitHub();
}

function renderServicesAdmin() {
  const el = document.getElementById('services-admin-list');
  if (!el) return;
  if (!customServices.length) {
    el.innerHTML='<div style="padding:16px;text-align:center;color:var(--text-muted);font-size:12px;">No custom services yet. Built-in services always show.</div>';
    return;
  }
  el.innerHTML = customServices.map(s=>`
    <div style="display:flex;align-items:center;gap:10px;padding:12px 16px;background:var(--surface2);border-top:1px solid var(--border);">
      <span style="font-size:22px;">${s.icon}</span>
      <div style="flex:1;">
        <div style="font-size:13px;font-weight:700;">${s.name}</div>
        <div style="font-size:11px;color:var(--text-muted);">${s.price||'No price'} · ${s.duration||''} · <span style="color:${s.status==='active'?'#38a169':'#e53e3e'}">${s.status}</span></div>
      </div>
      <button onclick="toggleServiceStatus(${s.id})" style="background:none;border:1px solid var(--border);border-radius:6px;padding:4px 8px;color:var(--text-muted);font-size:10px;cursor:pointer;">${s.status==='active'?'Hide':'Show'}</button>
      <button class="btn-del" onclick="deleteService(${s.id})">Del</button>
    </div>`).join('');
}

function renderServiceCards() {
  const grid = document.getElementById('services-grid');
  if (!grid) return;
  grid.querySelectorAll('.custom-svc-card').forEach(el=>el.remove());
  customServices.filter(s=>s.status==='active').forEach(s=>{
    const card = document.createElement('div');
    card.className='service-card custom-svc-card';
    card.innerHTML=`
      <div class="service-icon">${s.icon}</div>
      <div class="service-name">${s.name}</div>
      <div class="service-desc">${s.desc}</div>
      ${s.duration?`<div class="service-meta">⏱ ${s.duration} &nbsp;|&nbsp; 📍 Maiduguri</div>`:''}
      <a class="service-wa-btn" href="https://wa.me/${WA}?text=${encodeURIComponent(s.wa)}" target="_blank">📲 Book Now</a>`;
    grid.appendChild(card);
  });
}

/* ============================================================
   DYNAMIC CATEGORY MANAGEMENT
   ============================================================ */
let customCategories = JSON.parse(localStorage.getItem('nx_cats')||'[]');

const BUILT_IN_CATS = [
  {id:'phone',name:'Smartphones',icon:'📱'},{id:'laptop',name:'Laptops',icon:'💻'},
  {id:'gaming',name:'Gaming',icon:'🎮'},{id:'tablet',name:'Tablets',icon:'📟'},
  {id:'watch',name:'Smartwatches',icon:'⌚'},{id:'audio',name:'Audio',icon:'🎧'},
  {id:'accessory',name:'Accessories',icon:'🔌'},{id:'pc',name:'PC & Parts',icon:'🖥️'},
  {id:'camera',name:'Cameras',icon:'📷'},{id:'tv',name:'TVs & Displays',icon:'📺'},
  {id:'smart-home',name:'Smart Home',icon:'🏠'},{id:'network',name:'Networking',icon:'📶'},
  {id:'power',name:'Power & Charging',icon:'🔋'},{id:'software',name:'Software',icon:'💿'},
  {id:'digital',name:'Digital Products',icon:'📦'},
];

function allCats() { return [...BUILT_IN_CATS,...customCategories]; }

function adminAddCategory() {
  const name = document.getElementById('cat-name')?.value.trim();
  if (!name) { showToast('Enter category name'); return; }
  const slug = (document.getElementById('cat-slug')?.value.trim()||name).toLowerCase().replace(/[^a-z0-9]+/g,'-');
  if (allCats().find(c=>c.id===slug)) { showToast('Category ID already exists'); return; }
  const cat = {id:slug, name:sanitize(name), icon:document.getElementById('cat-icon')?.value.trim()||'📦', custom:true};
  customCategories.push(cat);
  localStorage.setItem('nx_cats',JSON.stringify(customCategories));
  renderCategoriesAdmin(); updateCatCounts();
  logActivity(`Added category: ${name}`);
  showToast('✅ Category added!');
  ['cat-name','cat-icon','cat-slug'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  pushToGitHub();
}

function deleteCategory(id) {
  customCategories = customCategories.filter(c=>c.id!==id);
  localStorage.setItem('nx_cats',JSON.stringify(customCategories));
  renderCategoriesAdmin(); updateCatCounts();
  logActivity(`Deleted category: ${id}`);
  showToast('Category deleted'); pushToGitHub();
}

function renderCategoriesAdmin() {
  const el = document.getElementById('categories-admin-list');
  if (!el) return;
  const all = allCats();
  const counts = {};
  products.forEach(p=>{counts[p.cat]=(counts[p.cat]||0)+1;});
  el.innerHTML = '<div style="padding:0 16px 16px;">' + all.map(c=>`
    <div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:var(--surface2);border:1px solid var(--border);border-radius:10px;margin-bottom:6px;">
      <span style="font-size:18px;">${c.icon}</span>
      <div style="flex:1;">
        <div style="font-size:12px;font-weight:700;">${c.name}</div>
        <div style="font-size:10px;color:var(--text-muted);">ID: ${c.id} · ${counts[c.id]||0} products</div>
      </div>
      ${c.custom?`<button class="btn-del" style="font-size:10px;" onclick="deleteCategory('${c.id}')">Del</button>`:'<span style="font-size:9px;color:var(--text-dim);padding:2px 6px;background:var(--surface);border-radius:4px;">Built-in</span>'}
    </div>`).join('') + '</div>';
}

/* ============================================================
   SETTINGS MANAGEMENT
   ============================================================ */
let storeSettings = JSON.parse(localStorage.getItem('nx_settings')||'{"storeName":"Nexotronix","wa":"2349036006553"}');

function saveSettings() {
  storeSettings.storeName = document.getElementById('set-name')?.value.trim()||storeSettings.storeName;
  storeSettings.wa = document.getElementById('set-wa')?.value.trim()||storeSettings.wa;
  storeSettings.marquee = document.getElementById('set-marquee')?.value.trim()||storeSettings.marquee;
  localStorage.setItem('nx_settings',JSON.stringify(storeSettings));
  logActivity('Store settings updated');
  showToast('✅ Settings saved!');
  pushToGitHub();
}

function loadSettings() {
  if(document.getElementById('set-name')) document.getElementById('set-name').value=storeSettings.storeName||'';
  if(document.getElementById('set-wa')) document.getElementById('set-wa').value=storeSettings.wa||'';
  if(document.getElementById('set-marquee')) document.getElementById('set-marquee').value=storeSettings.marquee||'';
}

/* ============================================================
   ANALYTICS SYSTEM
   ============================================================ */
const Analytics = {
  data: JSON.parse(localStorage.getItem('nx_analytics')||'{"views":{},"searches":[],"clicks":{},"sessions":0,"revenue":0}'),
  save() { localStorage.setItem('nx_analytics',JSON.stringify(this.data)); },
  view(id) { this.data.views[id]=(this.data.views[id]||0)+1; this.save(); },
  search(q) { if(!q||q.length<2) return; this.data.searches.unshift({q,t:Date.now()}); this.data.searches=this.data.searches.slice(0,100); this.save(); },
  click(l) { this.data.clicks[l]=(this.data.clicks[l]||0)+1; this.save(); },
  session() { this.data.sessions=(this.data.sessions||0)+1; this.save(); },
  topProds(n=5) { return Object.entries(this.data.views).sort((a,b)=>b[1]-a[1]).slice(0,n); },
  topSearches(n=5) {
    const f={}; this.data.searches.forEach(s=>f[s.q]=(f[s.q]||0)+1);
    return Object.entries(f).sort((a,b)=>b[1]-a[1]).slice(0,n);
  }
};
Analytics.session();

function renderAnalyticsPanel() {
  const topP = Analytics.topProds(5);
  const topS = Analytics.topSearches(5);
  const inStock = products.filter(p=>p.stock==='instock').length;
  const limited = products.filter(p=>p.stock==='limited').length;
  const soldOut = products.filter(p=>p.stock==='sold').length;
  return `
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:16px;">
      <div style="background:var(--surface2);border-radius:10px;padding:14px;text-align:center;">
        <div style="font-size:22px;font-weight:800;color:var(--gold);">${products.length}</div>
        <div style="font-size:10px;color:var(--text-muted);margin-top:2px;">Total Products</div>
      </div>
      <div style="background:var(--surface2);border-radius:10px;padding:14px;text-align:center;">
        <div style="font-size:22px;font-weight:800;color:#38a169;">${inStock}</div>
        <div style="font-size:10px;color:var(--text-muted);margin-top:2px;">In Stock</div>
      </div>
      <div style="background:var(--surface2);border-radius:10px;padding:14px;text-align:center;">
        <div style="font-size:22px;font-weight:800;color:var(--gold);">${Analytics.data.sessions}</div>
        <div style="font-size:10px;color:var(--text-muted);margin-top:2px;">Sessions</div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px;">
      <div style="background:var(--surface2);border-radius:10px;padding:14px;">
        <div style="font-size:11px;font-weight:700;margin-bottom:8px;">🔥 Top Viewed</div>
        ${topP.length ? topP.map(([id,v])=>{const p=products.find(x=>String(x.id)===String(id));return `<div style="display:flex;justify-content:space-between;font-size:11px;padding:5px 0;border-bottom:1px solid var(--border);"><span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${p?p.name:'Unknown'}</span><span style="color:var(--gold);font-weight:700;flex-shrink:0;margin-left:6px;">${v}</span></div>`;}).join('') : '<div style="font-size:11px;color:var(--text-muted);">No data yet</div>'}
      </div>
      <div style="background:var(--surface2);border-radius:10px;padding:14px;">
        <div style="font-size:11px;font-weight:700;margin-bottom:8px;">🔍 Top Searches</div>
        ${topS.length ? topS.map(([q,c])=>`<div style="display:flex;justify-content:space-between;font-size:11px;padding:5px 0;border-bottom:1px solid var(--border);"><span>"${sanitize(q)}"</span><span style="color:var(--gold);font-weight:700;">${c}x</span></div>`).join('') : '<div style="font-size:11px;color:var(--text-muted);">No searches yet</div>'}
      </div>
    </div>
    <div style="background:var(--surface2);border-radius:10px;padding:14px;">
      <div style="font-size:11px;font-weight:700;margin-bottom:8px;">📦 Inventory Health</div>
      <div style="display:flex;gap:12px;flex-wrap:wrap;">
        <span style="font-size:11px;">✅ In Stock: <b>${inStock}</b></span>
        <span style="font-size:11px;">⚡ Limited: <b>${limited}</b></span>
        <span style="font-size:11px;">❌ Sold Out: <b>${soldOut}</b></span>
        <span style="font-size:11px;">📋 Total: <b>${products.length}</b></span>
      </div>
    </div>`;
}

/* ============================================================
   ADMIN TAB SWITCHER
   ============================================================ */
function switchAdminTab(tab) {
  document.querySelectorAll('.admin-tab').forEach(t=>t.classList.remove('active'));
  document.querySelectorAll('.admin-tab-content').forEach(c=>c.style.display='none');
  const btn = document.querySelector(`.admin-tab[onclick*="'${tab}'"]`);
  if (btn) btn.classList.add('active');
  const el = document.getElementById('tab-'+tab);
  if (el) el.style.display='block';
  // Load tab content
  if (tab==='analytics') document.getElementById('analytics-content').innerHTML=renderAnalyticsPanel();
  else if (tab==='activity') renderActivityLog();
  else if (tab==='services') renderServicesAdmin();
  else if (tab==='categories') renderCategoriesAdmin();
  else if (tab==='settings') loadSettings();
  else if (tab==='products') renderAdminList();
  logActivity(`Viewed admin tab: ${tab}`);
}

/* ============================================================
   ADMIN SEARCH + BULK ACTIONS
   ============================================================ */
function filterAdminList() {
  const q = (document.getElementById('admin-search-input')?.value||'').toLowerCase();
  document.querySelectorAll('#admin-products-list .admin-product-row').forEach(row=>{
    row.style.display = (row.querySelector('h4')?.textContent||'').toLowerCase().includes(q)?'':'none';
  });
}

function bulkAction(action) {
  if (action==='delete') {
    if (!confirm(`⚠️ Delete ALL ${products.length} products? This cannot be undone.`)) return;
    products=[]; saveProducts(); renderProducts(); renderAdminList();
    logActivity('Bulk DELETE all products'); pushToGitHub(); showToast('🗑️ All products deleted'); return;
  }
  if (action==='hidden' && !confirm(`Hide all ${products.length} products from storefront?`)) return;
  products.forEach(p=>p.stock=action);
  saveProducts(); renderProducts(); renderAdminList();
  logActivity(`Bulk set all products to: ${action}`); pushToGitHub();
  showToast(`✅ All products set to ${action}`);
}

/* ============================================================
   EXPORT + BACKUP
   ============================================================ */
function exportProducts() {
  const db = {
    exportedAt: new Date().toISOString(),
    products,
    services: customServices,
    categories: allCats(),
    settings: storeSettings
  };
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(db,null,2)],{type:'application/json'}));
  a.download = `nexotronix-export-${Date.now()}.json`;
  a.click(); URL.revokeObjectURL(a.href);
  logActivity('Data exported to JSON'); showToast('📥 Export downloaded!');
}

function backupData() {
  const backup = {products, services:customServices, settings:storeSettings, ts:Date.now()};
  const backups = JSON.parse(localStorage.getItem('nx_backups')||'[]');
  backups.unshift(backup);
  localStorage.setItem('nx_backups', JSON.stringify(backups.slice(0,5)));
  logActivity('Manual backup saved (local)');
  showToast('💾 Backup saved! (5 max stored locally)');
}

/* ============================================================
   INVENTORY WARNINGS
   ============================================================ */
function checkInventoryWarnings() {
  const low = products.filter(p=>p.quantity>0&&p.quantity<=3&&p.stock==='instock');
  if (low.length) {
    addNotif('⚠️ Low Stock Alert', low.slice(0,3).map(p=>p.name).join(', ')+(low.length>3?`...+${low.length-3} more`:''), '📦');
  }
}

/* ============================================================
   LAST SYNC TIME DISPLAY
   ============================================================ */
function updateLastSyncTime() {
  const el = document.getElementById('last-sync-time');
  const el2 = document.getElementById('gh-status-text2');
  const el3 = document.getElementById('gh-dot2');
  const t = localStorage.getItem('nx_last_sync');
  if (t && el) {
    const mins = Math.floor((Date.now()-parseInt(t))/60000);
    el.textContent = mins<1 ? 'just now' : mins+'m ago';
  }
  // Mirror main status to settings tab
  const mainDot = document.getElementById('gh-dot');
  const mainStatus = document.getElementById('gh-status-text');
  if (el2 && mainStatus) el2.textContent = mainStatus.textContent;
  if (el3 && mainDot) el3.className = mainDot.className;
}
setInterval(updateLastSyncTime, 10000);

/* ============================================================
   UNIFIED INIT — Nexotronix v4.0
   ============================================================ */
document.addEventListener('DOMContentLoaded', function() {
  // Theme
  updateThemeBtn(document.documentElement.getAttribute('data-theme'));
  // Core products & UI
  renderProducts();
  renderCarousel();
  startCarouselAutoplay();
  renderTrending();
  updateCatCounts();
  updateCartUI();
  // Testimonials + reviews
  setStars(5);
  renderTestiPage(0, false);
  startTestiAutoplay();
  loadReviews();
  // Notifications
  updateNotifBadge();
  renderNotifs();
  // Dynamic content
  renderServiceCards();
  renderFlashBanner();
  // Inventory check
  checkInventoryWarnings();
  // Admin tab default
  switchAdminTab('products');
  // Cloud sync — initial + every 10s
  syncFromGitHub();
  setInterval(syncFromGitHub, 10000);
  // Welcome notification (first visit only)
  if (!localStorage.getItem('nx_welcomed')) {
    setTimeout(() => {
      addNotif('👋 Welcome to Nexotronix!', 'Browse premium devices & installation services in Maiduguri.', '⚡');
      localStorage.setItem('nx_welcomed', '1');
    }, 4000);
  }
});

/* ==============================================================
   NEXOTRONIX v5 — PRODUCTION JS
   ============================================================== */

/* === PATCH 1: NOTIFICATION PANEL FIX === */
let _notifJustOpened = false;

function toggleNotifPanel(event) {
  if (event) event.stopPropagation();
  const panel = document.getElementById('notif-panel');
  if (!panel) return;
  const isOpen = panel.style.display === 'block';
  if (isOpen) { panel.style.display = 'none'; return; }
  panel.style.display = 'block';
  renderNotifs();
  _notifJustOpened = true;
  setTimeout(() => { _notifJustOpened = false; }, 300);
}

document.addEventListener('click', function(e) {
  if (_notifJustOpened) return;
  const panel = document.getElementById('notif-panel');
  const wrapper = e.target.closest('.notif-wrapper');
  if (panel && panel.style.display === 'block' && !panel.contains(e.target) && !wrapper) {
    panel.style.display = 'none';
  }
});

/* === PATCH 2: DYNAMIC NAVBAR OFFSET === */
function recalcOffset() {
  const nav = document.getElementById('nav');
  const mq  = document.querySelector('.marquee-strip');
  const sb  = document.getElementById('search-bar');
  const sp  = document.getElementById('header-spacer');
  if (!nav) return;
  const h = (nav.offsetHeight||0) + (mq?.offsetHeight||0) + (sb?.offsetHeight||0) + 6;
  document.documentElement.style.setProperty('--header-offset', h+'px');
  if (sp) sp.style.height = h + 'px';
}
['load','resize','orientationchange'].forEach(e => window.addEventListener(e, recalcOffset, {passive:true}));
setTimeout(recalcOffset, 100);
setTimeout(recalcOffset, 800);

/* === PATCH 4: STABLE SMART SCROLL (iOS + Android) === */
(function() {
  let lastY = 0, hidden = false, ticking = false, timer = null;

  function applyScroll() {
    const y = Math.max(0, window.scrollY || window.pageYOffset);
    const d = y - lastY;
    lastY = y;
    if (Math.abs(d) < 6) { ticking = false; return; }
    if (d > 0 && y > 180 && !hidden) {
      hidden = true;
      document.body.classList.add('header-hidden');
    } else if (d < 0 && hidden) {
      hidden = false;
      document.body.classList.remove('header-hidden');
    }
    ticking = false;
  }

  window.addEventListener('scroll', function() {
    if (!ticking) {
      requestAnimationFrame(applyScroll);
      ticking = true;
    }
    if (timer) clearTimeout(timer);
    timer = setTimeout(function() { ticking = false; }, 100);
  }, { passive: true });
})();

/* === PATCH 3: DYNAMIC CATEGORY FILTER (hide empty) === */
function updateFilterPills() {
  const row = document.getElementById('filter-pills-row');
  if (!row) return;
  row.querySelectorAll('.pill[data-cat]').forEach(pill => {
    const cat = pill.getAttribute('data-cat');
    if (cat === 'all') { pill.style.display = ''; return; }
    const has = products.some(p => p.cat === cat && p.stock !== 'sold' && p.stock !== 'hidden');
    pill.style.display = has ? '' : 'none';
  });
}

/* === SESSION FIX: close admin sets flag (safe, non-recursive) === */
window.closeAdmin = function() {
  localStorage.removeItem('nx_admin_active');
  const panel = document.getElementById('admin-panel');
  if (panel) panel.style.display = 'none';
  document.body.style.overflow = '';
};

/* === DEAL POPUP === */
function showDealPopup() {
  const p = document.getElementById('deal-popup');
  if (!p) return;
  p.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}
function closeDealPopup() {
  const p = document.getElementById('deal-popup');
  if (!p) return;
  p.style.display = 'none';
  document.body.style.overflow = '';
  localStorage.setItem('nx_deal_closed', String(Date.now()));
}
document.addEventListener('click', e => {
  const p = document.getElementById('deal-popup');
  if (p && e.target === p) closeDealPopup();
});
setTimeout(() => {
  const last = parseInt(localStorage.getItem('nx_deal_closed')||'0');
  if (Date.now() - last > 86400000) showDealPopup();
}, 10000);


/* === WEB PUSH NOTIFICATIONS === */
const VAPID_PUBLIC_KEY = 'YOUR_VAPID_PUBLIC_KEY_HERE';
let pushSubscription = null;

function urlBase64ToUint8Array(b64) {
  const pad = '='.repeat((4 - b64.length%4)%4);
  const b = (b64+pad).replace(/-/g,'+').replace(/_/g,'/');
  const raw = atob(b);
  return new Uint8Array([...raw].map(c=>c.charCodeAt(0)));
}

async function requestPushPermission() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return false;
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') { showToast('Notification permission denied'); return false; }
  try {
    const reg = await navigator.serviceWorker.ready;
    const existing = await reg.pushManager.getSubscription();
    if (existing) { pushSubscription = existing; return true; }
    if (VAPID_PUBLIC_KEY === 'YOUR_VAPID_PUBLIC_KEY_HERE') return false;
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    });
    pushSubscription = sub;
    const WORKER_BASE = 'https://nexotronix-proxy.samuelphilip002.workers.dev';
    await fetch(WORKER_BASE+'/push/subscribe', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({subscription: sub.toJSON()})
    });
    showToast('🔔 Notifications enabled!');
    return true;
  } catch(e) { return false; }
}

async function sendPushToAll(title, body) {
  const WORKER_BASE = 'https://nexotronix-proxy.samuelphilip002.workers.dev';
  const res = await fetch(WORKER_BASE+'/push/send', {
    method:'POST',
    headers:{
      'Content-Type':'application/json',
      'Authorization': 'Bearer ' + (sessionStorage.getItem('nx_admin_token') || '')
    },
    body: JSON.stringify({title, body, url:'/Nexotronix/'})
  });
  if (!res.ok) { showToast('⚠️ Send failed — not authorized'); return; }
  const d = await res.json();
  showToast(d.sent ? '📲 Sent to '+d.sent+' users!' : '⚠️ Send failed');
  logActivity('Push sent: '+title);
}


/* push prompt removed for stability */



/* Push notification prompt */
function showPushPrompt() {
  if (typeof Notification === 'undefined' || Notification.permission !== 'default') return;
  const b = document.createElement('div');
  b.id = 'push-prompt';
  Object.assign(b.style, {
    position:'fixed', bottom:'80px', left:'12px', right:'12px',
    zIndex:'4000', background:'var(--surface)', border:'1px solid var(--border)',
    borderRadius:'14px', padding:'12px 14px', display:'flex',
    alignItems:'center', gap:'10px', boxShadow:'0 8px 32px rgba(0,0,0,0.3)',
    maxWidth:'400px', margin:'0 auto'
  });
  const icon = Object.assign(document.createElement('span'), {textContent:'🔔', style:'font-size:22px'});
  const txt = document.createElement('div');
  txt.style.flex = '1';
  txt.innerHTML = '<b style="font-size:12px">Get instant alerts</b><br><span style="font-size:10px;color:var(--text-muted)">New products & flash sales</span>';
  const yes = document.createElement('button');
  yes.textContent = 'Allow';
  Object.assign(yes.style, {background:'var(--gold)',color:'#0a0a0a',border:'none',borderRadius:'20px',padding:'6px 12px',fontWeight:'700',fontSize:'11px',cursor:'pointer',whiteSpace:'nowrap'});
  yes.addEventListener('click', function() {
    if (typeof requestPushPermission === 'function') requestPushPermission();
    b.remove();
  });
  const no = document.createElement('button');
  no.textContent = '✕';
  Object.assign(no.style, {background:'none',border:'none',color:'var(--text-muted)',fontSize:'18px',cursor:'pointer',padding:'4px'});
  no.addEventListener('click', function() { b.remove(); });
  b.append(icon, txt, yes, no);
  document.body.appendChild(b);
  setTimeout(function() { if (b.parentNode) b.remove(); }, 15000);
}
setTimeout(showPushPrompt, 12000);


/* ── DUAL LOGO THEME SYSTEM ── */
function getLogoSrc() {
  const theme = document.documentElement.getAttribute('data-theme') || 'dark';
  return theme === 'dark' ? 'logo-dark.png' : 'logo-light.png';
}

function updateAllLogos() {
  const src = getLogoSrc();
  document.querySelectorAll('#site-logo, .site-logo, .admin-logo-img').forEach(img => {
    if (img.src !== src) {
      img.style.opacity = '0';
      setTimeout(() => { img.src = src; img.style.opacity = '1'; }, 150);
    }
  });
}

// Hook into existing theme toggle
const _origToggleTheme = typeof toggleTheme === 'function' ? toggleTheme : null;
if (_origToggleTheme) {
  window.toggleTheme = function() {
    _origToggleTheme();
    setTimeout(updateAllLogos, 50);
  };
}

// Run on load
document.addEventListener('DOMContentLoaded', function() {
  updateAllLogos();
});


/* ── DYNAMIC HEADER SPACER ── */
function updateHeaderSpacer() {
  const nav = document.getElementById('nav');
  const mq  = document.querySelector('.marquee-strip');
  const sb  = document.getElementById('search-bar');
  const sp  = document.getElementById('header-spacer');

  const navH = nav ? nav.offsetHeight : 58;
  const mqH  = mq  ? mq.offsetHeight  : 32;
  const sbH  = sb  ? sb.offsetHeight  : 50;

  /* Dynamically fix fixed-position elements (overrides hardcoded CSS top values) */
  if (mq) mq.style.top = navH + 'px';
  if (sb) sb.style.top = (navH + mqH) + 'px';

  const totalH = navH + mqH + sbH + 4;
  if (sp) sp.style.height = totalH + 'px';
  document.documentElement.style.setProperty('--header-h', totalH + 'px');
}
['load','resize','orientationchange'].forEach(e =>
  window.addEventListener(e, updateHeaderSpacer, {passive:true})
);
setTimeout(updateHeaderSpacer, 80);
setTimeout(updateHeaderSpacer, 500);
setTimeout(updateHeaderSpacer, 1500);

/* ── DYNAMIC CATEGORY PILLS — hide empty ── */
function updateVisibleCategories() {
  const row = document.getElementById('filter-pills-row');
  if (!row) return;
  const pills = row.querySelectorAll('.pill[data-cat]');
  let visibleCount = 0;
  pills.forEach(pill => {
    const cat = pill.getAttribute('data-cat');
    if (!cat || cat === 'all') { pill.style.display = ''; return; }
    const hasItems = products.some(p =>
      p.cat === cat &&
      p.stock !== 'sold' &&
      p.stock !== 'hidden' &&
      p.stock !== 'archived'
    );
    pill.style.display = hasItems ? '' : 'none';
    if (hasItems) visibleCount++;
  });
}

/* ── EMPTY STATE INJECTION ── */
const _origRenderProducts = typeof renderProducts === 'function' ? renderProducts : null;
if (_origRenderProducts) {
  window.renderProducts = function() {
    _origRenderProducts();
    updateVisibleCategories();
    // Check if grid is empty
    const grid = document.getElementById('product-grid');
    if (grid && grid.children.length === 0) {
      grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><div class="empty-state-icon">&#128230;</div><div class="empty-state-title">No products found</div><div class="empty-state-sub">Try a different category or search term</div></div>';
    }
  };
}
