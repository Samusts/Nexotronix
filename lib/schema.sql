-- ============================================================
-- NEXOTRONIX MARKETPLACE — COMPLETE DATABASE SCHEMA
-- Run this in your Vercel Postgres dashboard once
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── SESSIONS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  user_type VARCHAR(20) NOT NULL, -- 'superadmin','subadmin','partner','customer'
  token VARCHAR(512) UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_sessions_token ON sessions(token);
CREATE INDEX idx_sessions_user ON sessions(user_id);

-- ── SUPER ADMIN (you only) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS superadmin (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20) NOT NULL,
  google_id VARCHAR(255),
  facebook_id VARCHAR(255),
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── SUB-ADMINS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subadmins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20) NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  google_id VARCHAR(255),
  facebook_id VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  last_login TIMESTAMPTZ,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── SUB-ADMIN PERMISSIONS ───────────────────────────────────
CREATE TABLE IF NOT EXISTS subadmin_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subadmin_id UUID NOT NULL REFERENCES subadmins(id) ON DELETE CASCADE,
  approve_products BOOLEAN DEFAULT FALSE,
  reject_products BOOLEAN DEFAULT FALSE,
  approve_comments BOOLEAN DEFAULT FALSE,
  delete_comments BOOLEAN DEFAULT FALSE,
  view_all_orders BOOLEAN DEFAULT FALSE,
  manage_customers BOOLEAN DEFAULT FALSE,
  view_analytics BOOLEAN DEFAULT FALSE,
  manage_services BOOLEAN DEFAULT FALSE,
  send_push_notifications BOOLEAN DEFAULT FALSE,
  view_partner_list BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── PARTNERS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS partners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(20) NOT NULL,
  business_name VARCHAR(100) NOT NULL,
  business_bio TEXT,
  business_logo VARCHAR(500),
  google_id VARCHAR(255),
  facebook_id VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  is_verified BOOLEAN DEFAULT FALSE,
  verified_at TIMESTAMPTZ,
  total_sales INTEGER DEFAULT 0,
  rating DECIMAL(3,2) DEFAULT 0.00,
  rating_count INTEGER DEFAULT 0,
  slug VARCHAR(100) UNIQUE NOT NULL,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_partners_slug ON partners(slug);

-- ── PARTNER PERMISSIONS ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS partner_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  upload_products BOOLEAN DEFAULT TRUE,
  edit_own_products BOOLEAN DEFAULT TRUE,
  view_own_sales BOOLEAN DEFAULT TRUE,
  view_own_wallet BOOLEAN DEFAULT TRUE,
  request_withdrawal BOOLEAN DEFAULT TRUE,
  reply_to_comments BOOLEAN DEFAULT TRUE,
  view_own_analytics BOOLEAN DEFAULT TRUE,
  price_negotiation BOOLEAN DEFAULT TRUE,
  flash_deals BOOLEAN DEFAULT TRUE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── CUSTOMERS ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name VARCHAR(100),
  email VARCHAR(255) UNIQUE,
  phone VARCHAR(20) UNIQUE,
  profile_photo VARCHAR(500),
  google_id VARCHAR(255),
  facebook_id VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  referral_code VARCHAR(20) UNIQUE NOT NULL DEFAULT SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8),
  referred_by UUID REFERENCES customers(id),
  referral_credit DECIMAL(12,2) DEFAULT 0.00,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_phone ON customers(phone);

-- ── CATEGORIES ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  emoji VARCHAR(10),
  slug VARCHAR(100) UNIQUE NOT NULL,
  status VARCHAR(20) DEFAULT 'approved', -- 'pending','approved','rejected'
  suggested_by UUID, -- NULL = you, UUID = partner_id
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default categories
INSERT INTO categories (name, emoji, slug, status) VALUES
  ('Phones', '📱', 'phones', 'approved'),
  ('Laptops', '💻', 'laptops', 'approved'),
  ('Gaming', '🎮', 'gaming', 'approved'),
  ('Accessories', '🎧', 'accessories', 'approved')
ON CONFLICT (slug) DO NOTHING;

-- ── PRODUCTS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  owner_id UUID NOT NULL,
  owner_type VARCHAR(20) NOT NULL, -- 'superadmin' or 'partner'
  name VARCHAR(200) NOT NULL,
  description TEXT,
  price DECIMAL(12,2) NOT NULL,
  original_price DECIMAL(12,2),
  condition VARCHAR(20) DEFAULT 'new', -- 'new','uk-used'
  category_id UUID REFERENCES categories(id),
  stock INTEGER DEFAULT 0,
  sold_count INTEGER DEFAULT 0,
  status VARCHAR(20) DEFAULT 'pending', -- 'pending','approved','rejected','hidden'
  rejection_reason TEXT,
  emoji VARCHAR(10) DEFAULT '📦',
  specs JSONB DEFAULT '{}',
  tags TEXT[],
  allow_offers BOOLEAN DEFAULT FALSE,
  view_count INTEGER DEFAULT 0,
  rating DECIMAL(3,2) DEFAULT 0.00,
  rating_count INTEGER DEFAULT 0,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_products_owner ON products(owner_id);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_category ON products(category_id);

-- ── PRODUCT IMAGES ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS product_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url VARCHAR(500) NOT NULL,
  is_primary BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── FLASH DEALS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS flash_deals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  deal_price DECIMAL(12,2) NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  status VARCHAR(20) DEFAULT 'pending', -- 'pending','approved','active','expired'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── ORDERS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number VARCHAR(20) UNIQUE NOT NULL,
  customer_id UUID NOT NULL REFERENCES customers(id),
  status VARCHAR(30) DEFAULT 'pending',
  -- 'pending','confirmed','shipped','delivered','disputed','refunded','cancelled'
  total_amount DECIMAL(12,2) NOT NULL,
  commission_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  delivery_address TEXT NOT NULL,
  delivery_city VARCHAR(100),
  delivery_state VARCHAR(100),
  delivery_notes TEXT,
  whatsapp_notified BOOLEAN DEFAULT FALSE,
  payment_status VARCHAR(20) DEFAULT 'pending',
  -- 'pending','paid','refunded','failed'
  payment_gateway VARCHAR(20), -- 'paystack','flutterwave','remita'
  payment_reference VARCHAR(200),
  escrow_released BOOLEAN DEFAULT FALSE,
  escrow_released_at TIMESTAMPTZ,
  auto_release_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_number ON orders(order_number);

-- ── ORDER ITEMS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  partner_id UUID, -- NULL if your own product
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(12,2) NOT NULL,
  total_price DECIMAL(12,2) NOT NULL,
  commission_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  partner_earnings DECIMAL(12,2) NOT NULL DEFAULT 0,
  status VARCHAR(30) DEFAULT 'pending',
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── PAYMENTS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id),
  gateway VARCHAR(20) NOT NULL,
  reference VARCHAR(200) UNIQUE NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'NGN',
  status VARCHAR(20) DEFAULT 'pending',
  gateway_response JSONB,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── REFUNDS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS refunds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id),
  customer_id UUID NOT NULL REFERENCES customers(id),
  reason TEXT NOT NULL,
  customer_amount DECIMAL(12,2) NOT NULL, -- 80%
  partner_amount DECIMAL(12,2) NOT NULL,  -- 10%
  admin_amount DECIMAL(12,2) NOT NULL,    -- 10%
  status VARCHAR(20) DEFAULT 'pending', -- 'pending','approved','processed','rejected'
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── PARTNER WALLETS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wallets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  partner_id UUID UNIQUE NOT NULL REFERENCES partners(id),
  available_balance DECIMAL(12,2) DEFAULT 0.00,
  pending_balance DECIMAL(12,2) DEFAULT 0.00, -- held in escrow
  total_earned DECIMAL(12,2) DEFAULT 0.00,
  total_withdrawn DECIMAL(12,2) DEFAULT 0.00,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── WALLET TRANSACTIONS ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS wallet_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_id UUID NOT NULL REFERENCES wallets(id),
  type VARCHAR(20) NOT NULL, -- 'credit','debit','hold','release'
  amount DECIMAL(12,2) NOT NULL,
  balance_after DECIMAL(12,2) NOT NULL,
  description TEXT NOT NULL,
  order_id UUID REFERENCES orders(id),
  hold_release_at TIMESTAMPTZ, -- 7-day hold tracking
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── WITHDRAWALS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS withdrawals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  partner_id UUID NOT NULL REFERENCES partners(id),
  amount DECIMAL(12,2) NOT NULL,
  bank_name VARCHAR(100) NOT NULL,
  account_number VARCHAR(20) NOT NULL,
  account_name VARCHAR(100) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending', -- 'pending','approved','paid','rejected'
  approved_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── ESCROW ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS escrow (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID UNIQUE NOT NULL REFERENCES orders(id),
  order_item_id UUID NOT NULL REFERENCES order_items(id),
  partner_id UUID NOT NULL REFERENCES partners(id),
  amount DECIMAL(12,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'held', -- 'held','released','refunded'
  auto_release_at TIMESTAMPTZ NOT NULL,
  released_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── DISPUTES ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS disputes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id),
  customer_id UUID NOT NULL REFERENCES customers(id),
  partner_id UUID,
  reason TEXT NOT NULL,
  evidence TEXT,
  status VARCHAR(20) DEFAULT 'open', -- 'open','resolved','closed'
  resolution VARCHAR(20), -- 'refund','release','split'
  resolution_notes TEXT,
  resolved_by UUID,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── COMMENTS & REVIEWS ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id),
  order_id UUID REFERENCES orders(id),
  rating INTEGER CHECK (rating BETWEEN 1 AND 5), -- NULL if not verified purchase
  comment TEXT NOT NULL,
  is_verified_purchase BOOLEAN DEFAULT FALSE,
  status VARCHAR(20) DEFAULT 'pending', -- 'pending','approved','rejected'
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_reviews_product ON reviews(product_id);

-- ── REVIEW REPLIES ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS review_replies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  replier_id UUID NOT NULL,
  replier_type VARCHAR(20) NOT NULL, -- 'partner','subadmin','superadmin'
  reply TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── CHAT ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  partner_id UUID NOT NULL REFERENCES partners(id),
  product_id UUID REFERENCES products(id),
  last_message TEXT,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(customer_id, partner_id, product_id)
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  sender_type VARCHAR(20) NOT NULL, -- 'customer','partner'
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_chat_messages_room ON chat_messages(room_id);

-- ── PRICE OFFERS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS offers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id),
  customer_id UUID NOT NULL REFERENCES customers(id),
  partner_id UUID NOT NULL REFERENCES partners(id),
  offered_price DECIMAL(12,2) NOT NULL,
  counter_price DECIMAL(12,2),
  status VARCHAR(20) DEFAULT 'pending', -- 'pending','accepted','rejected','countered'
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── WISHLISTS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wishlists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  product_id UUID NOT NULL REFERENCES products(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(customer_id, product_id)
);

-- ── SELLER FOLLOWS ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS seller_follows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  partner_id UUID NOT NULL REFERENCES partners(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(customer_id, partner_id)
);

-- ── REFERRALS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS referrals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_id UUID NOT NULL REFERENCES customers(id),
  referred_id UUID NOT NULL REFERENCES customers(id),
  order_id UUID REFERENCES orders(id),
  credit_amount DECIMAL(12,2) DEFAULT 0.00,
  status VARCHAR(20) DEFAULT 'pending', -- 'pending','credited'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── NOTIFICATIONS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_id UUID NOT NULL,
  recipient_type VARCHAR(20) NOT NULL,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(200) NOT NULL,
  body TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_notifications_recipient ON notifications(recipient_id);

-- ── OTP CODES ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS otp_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone VARCHAR(20),
  email VARCHAR(255),
  code VARCHAR(6) NOT NULL,
  purpose VARCHAR(30) NOT NULL, -- 'login','register','reset'
  user_type VARCHAR(20) NOT NULL,
  attempts INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_otp_phone ON otp_codes(phone);

-- ── ANALYTICS EVENTS ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_type VARCHAR(50) NOT NULL,
  product_id UUID REFERENCES products(id),
  partner_id UUID REFERENCES partners(id),
  customer_id UUID REFERENCES customers(id),
  session_id VARCHAR(100),
  ip_address VARCHAR(45),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_analytics_product ON analytics_events(product_id);
CREATE INDEX idx_analytics_type ON analytics_events(event_type);

-- ── AUDIT LOG ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id UUID NOT NULL,
  actor_type VARCHAR(20) NOT NULL,
  action VARCHAR(100) NOT NULL,
  target_type VARCHAR(50),
  target_id UUID,
  details JSONB DEFAULT '{}',
  ip_address VARCHAR(45),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_audit_actor ON audit_log(actor_id);

-- ── PUSH SUBSCRIPTIONS ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  user_type VARCHAR(20) NOT NULL,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, endpoint)
);

COMMIT;
