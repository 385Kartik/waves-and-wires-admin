-- ============================================================
-- WAVES & WIRES — Complete E-Commerce Schema for Supabase
-- Run this in Supabase SQL Editor
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ── Profiles (extends Supabase auth.users) ──────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name    TEXT,
  phone        TEXT,
  avatar_url   TEXT,
  is_admin     BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── Categories ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.categories (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name         TEXT NOT NULL,
  slug         TEXT NOT NULL UNIQUE,
  description  TEXT,
  image        TEXT,
  is_active    BOOLEAN DEFAULT TRUE,
  sort_order   INT DEFAULT 0,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ── Products ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.products (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name              TEXT NOT NULL,
  slug              TEXT NOT NULL UNIQUE,
  description       TEXT,
  short_description TEXT,
  price             NUMERIC(10,2) NOT NULL,
  compare_at_price  NUMERIC(10,2),
  images            TEXT[] DEFAULT '{}',
  category_id       UUID REFERENCES public.categories(id),
  stock             INT NOT NULL DEFAULT 0,
  sku               TEXT UNIQUE,
  features          TEXT[] DEFAULT '{}',
  specifications    JSONB DEFAULT '{}',
  rating            NUMERIC(3,2) DEFAULT 0,
  review_count      INT DEFAULT 0,
  is_featured       BOOLEAN DEFAULT FALSE,
  is_active         BOOLEAN DEFAULT TRUE,
  weight_grams      INT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ── Addresses ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.addresses (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name      TEXT NOT NULL,
  phone          TEXT NOT NULL,
  address_line_1 TEXT NOT NULL,
  address_line_2 TEXT,
  city           TEXT NOT NULL,
  state          TEXT NOT NULL,
  postal_code    TEXT NOT NULL,
  country        TEXT NOT NULL DEFAULT 'India',
  is_default     BOOLEAN DEFAULT FALSE,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ── Coupons ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.coupons (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code            TEXT NOT NULL UNIQUE,
  description     TEXT,
  discount_type   TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value  NUMERIC(10,2) NOT NULL,
  min_order_value NUMERIC(10,2) DEFAULT 0,
  max_discount    NUMERIC(10,2),
  usage_limit     INT,
  used_count      INT DEFAULT 0,
  is_active       BOOLEAN DEFAULT TRUE,
  starts_at       TIMESTAMPTZ DEFAULT NOW(),
  expires_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ── Orders ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.orders (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_number     TEXT NOT NULL UNIQUE,
  user_id          UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status           TEXT NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','confirmed','processing','shipped','delivered','cancelled','refunded')),
  payment_status   TEXT NOT NULL DEFAULT 'pending'
                     CHECK (payment_status IN ('pending','paid','failed','refunded')),
  payment_method   TEXT,
  payment_ref      TEXT,
  subtotal         NUMERIC(10,2) NOT NULL,
  discount         NUMERIC(10,2) DEFAULT 0,
  shipping         NUMERIC(10,2) DEFAULT 0,
  tax              NUMERIC(10,2) DEFAULT 0,
  total            NUMERIC(10,2) NOT NULL,
  coupon_id        UUID REFERENCES public.coupons(id),
  coupon_code      TEXT,
  shipping_address JSONB NOT NULL,
  tracking_number  TEXT,
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ── Order Items ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.order_items (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id      UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id    UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name  TEXT NOT NULL,
  product_image TEXT,
  product_sku   TEXT,
  quantity      INT NOT NULL,
  price         NUMERIC(10,2) NOT NULL,
  total         NUMERIC(10,2) GENERATED ALWAYS AS (quantity * price) STORED
);

-- ── Reviews ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.reviews (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating     INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title      TEXT,
  comment    TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, user_id)
);

-- ── Wishlist ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.wishlist (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  added_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

-- ── Store Settings ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.store_settings (
  key        TEXT PRIMARY KEY,
  value      JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO public.store_settings (key, value) VALUES
  ('store_name',        '"Waves & Wires"'),
  ('store_email',       '"hello@wavesandwires.com"'),
  ('store_phone',       '"+91 98765 43210"'),
  ('currency',          '"INR"'),
  ('currency_symbol',   '"₹"'),
  ('free_shipping_above', '999'),
  ('tax_rate',           '18'),
  ('order_prefix',       '"WW"')
ON CONFLICT (key) DO NOTHING;

-- ══════════════════════════════════════════════════════════════
-- FUNCTIONS & TRIGGERS
-- ══════════════════════════════════════════════════════════════

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-generate order number
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  prefix TEXT;
  seq    BIGINT;
BEGIN
  SELECT (value #>> '{}') INTO prefix FROM public.store_settings WHERE key = 'order_prefix';
  seq := (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT % 10000000;
  NEW.order_number := COALESCE(prefix, 'WW') || '-' || LPAD(seq::TEXT, 7, '0');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_order_number ON public.orders;
CREATE TRIGGER set_order_number
  BEFORE INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.generate_order_number();

-- Update product rating when review added
CREATE OR REPLACE FUNCTION public.update_product_rating()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.products
  SET rating       = (SELECT ROUND(AVG(rating)::NUMERIC, 2) FROM public.reviews WHERE product_id = NEW.product_id),
      review_count = (SELECT COUNT(*) FROM public.reviews WHERE product_id = NEW.product_id),
      updated_at   = NOW()
  WHERE id = NEW.product_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_review_change ON public.reviews;
CREATE TRIGGER on_review_change
  AFTER INSERT OR UPDATE OR DELETE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_product_rating();

-- Decrement stock on order
CREATE OR REPLACE FUNCTION public.decrement_stock()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.products
  SET stock = stock - NEW.quantity, updated_at = NOW()
  WHERE id = NEW.product_id AND stock >= NEW.quantity;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_order_item_insert ON public.order_items;
CREATE TRIGGER on_order_item_insert
  AFTER INSERT ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public.decrement_stock();

-- updated_at auto-touch
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

CREATE TRIGGER touch_products_updated_at   BEFORE UPDATE ON public.products   FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER touch_orders_updated_at     BEFORE UPDATE ON public.orders     FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER touch_profiles_updated_at   BEFORE UPDATE ON public.profiles   FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ══════════════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ══════════════════════════════════════════════════════════════

ALTER TABLE public.profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlist         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings   ENABLE ROW LEVEL SECURITY;

-- Helper: is current user admin?
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER AS $$
  SELECT COALESCE(is_admin, FALSE)
  FROM public.profiles
  WHERE id = auth.uid();
$$;

-- Profiles
CREATE POLICY "users can view own profile"   ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "admins can view all profiles" ON public.profiles FOR SELECT USING (public.is_admin());

-- Products (public read, admin write)
CREATE POLICY "anyone can view active products" ON public.products FOR SELECT USING (is_active = TRUE OR public.is_admin());
CREATE POLICY "admins can insert products"      ON public.products FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "admins can update products"      ON public.products FOR UPDATE USING (public.is_admin());
CREATE POLICY "admins can delete products"      ON public.products FOR DELETE USING (public.is_admin());

-- Categories (public read, admin write)
CREATE POLICY "anyone can view categories" ON public.categories FOR SELECT USING (TRUE);
CREATE POLICY "admins can manage categories" ON public.categories FOR ALL USING (public.is_admin());

-- Addresses
CREATE POLICY "users can manage own addresses" ON public.addresses FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "admins can view all addresses"  ON public.addresses FOR SELECT USING (public.is_admin());

-- Orders
CREATE POLICY "users can view own orders"  ON public.orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users can create orders"    ON public.orders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "admins can manage orders"   ON public.orders FOR ALL USING (public.is_admin());

-- Order Items
CREATE POLICY "users can view own order items" ON public.order_items FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_items.order_id AND o.user_id = auth.uid()));
CREATE POLICY "users can insert order items"   ON public.order_items FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_items.order_id AND o.user_id = auth.uid()));
CREATE POLICY "admins can manage order items"  ON public.order_items FOR ALL USING (public.is_admin());

-- Reviews
CREATE POLICY "anyone can read reviews"        ON public.reviews FOR SELECT USING (TRUE);
CREATE POLICY "users can manage own reviews"   ON public.reviews FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "admins can manage all reviews"  ON public.reviews FOR ALL USING (public.is_admin());

-- Wishlist
CREATE POLICY "users can manage own wishlist"  ON public.wishlist FOR ALL USING (auth.uid() = user_id);

-- Coupons
CREATE POLICY "anyone can read active coupons" ON public.coupons FOR SELECT USING (is_active = TRUE OR public.is_admin());
CREATE POLICY "admins can manage coupons"      ON public.coupons FOR ALL USING (public.is_admin());

-- Store Settings
CREATE POLICY "anyone can read settings"       ON public.store_settings FOR SELECT USING (TRUE);
CREATE POLICY "admins can manage settings"     ON public.store_settings FOR ALL USING (public.is_admin());

-- ══════════════════════════════════════════════════════════════
-- ANALYTICS VIEWS
-- ══════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW public.admin_dashboard_stats AS
SELECT
  (SELECT COUNT(*) FROM public.orders WHERE status != 'cancelled') AS total_orders,
  (SELECT COUNT(*) FROM public.orders WHERE status = 'pending') AS pending_orders,
  (SELECT COALESCE(SUM(total), 0) FROM public.orders WHERE payment_status = 'paid') AS total_revenue,
  (SELECT COALESCE(SUM(total), 0) FROM public.orders WHERE payment_status = 'paid' AND DATE(created_at) = CURRENT_DATE) AS today_revenue,
  (SELECT COUNT(*) FROM public.profiles WHERE NOT is_admin) AS total_customers,
  (SELECT COUNT(*) FROM public.profiles WHERE NOT is_admin AND created_at >= NOW() - INTERVAL '30 days') AS new_customers_30d,
  (SELECT COUNT(*) FROM public.products WHERE is_active) AS active_products,
  (SELECT COUNT(*) FROM public.products WHERE stock <= 5 AND is_active) AS low_stock_count;

CREATE OR REPLACE VIEW public.admin_revenue_by_day AS
SELECT
  DATE(created_at) AS date,
  COUNT(*) AS order_count,
  SUM(total) AS revenue
FROM public.orders
WHERE payment_status = 'paid' AND created_at >= NOW() - INTERVAL '90 days'
GROUP BY DATE(created_at)
ORDER BY date;

CREATE OR REPLACE VIEW public.admin_top_products AS
SELECT
  p.id, p.name, p.images[1] AS image, p.price, p.stock,
  COALESCE(SUM(oi.quantity), 0) AS units_sold,
  COALESCE(SUM(oi.total), 0) AS revenue
FROM public.products p
LEFT JOIN public.order_items oi ON oi.product_id = p.id
LEFT JOIN public.orders o ON o.id = oi.order_id AND o.payment_status = 'paid'
GROUP BY p.id, p.name, p.images, p.price, p.stock
ORDER BY revenue DESC
LIMIT 10;

-- ══════════════════════════════════════════════════════════════
-- INDEXES
-- ══════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_products_slug        ON public.products(slug);
CREATE INDEX IF NOT EXISTS idx_products_category    ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_is_featured ON public.products(is_featured) WHERE is_featured = TRUE;
CREATE INDEX IF NOT EXISTS idx_orders_user          ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status        ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created       ON public.orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order    ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_reviews_product      ON public.reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_user        ON public.wishlist(user_id);

-- ── Coupon usage increment (called from checkout) ────────────
CREATE OR REPLACE FUNCTION public.increment_coupon_usage(coupon_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.coupons SET used_count = used_count + 1 WHERE id = coupon_id;
END;
$$;
