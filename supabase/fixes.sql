-- ============================================================
-- FIXES — Run this in Supabase SQL Editor
-- Run this AFTER the main schema.sql if you already ran it.
-- ============================================================

-- Fix 1: decrement_stock needs SECURITY DEFINER to bypass RLS
CREATE OR REPLACE FUNCTION public.decrement_stock()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.products
  SET stock = GREATEST(0, stock - NEW.quantity), updated_at = NOW()
  WHERE id = NEW.product_id;
  RETURN NEW;
END;
$$;

-- Fix 2: Make sure increment_coupon_usage exists
CREATE OR REPLACE FUNCTION public.increment_coupon_usage(coupon_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.coupons SET used_count = used_count + 1 WHERE id = coupon_id;
END;
$$;

-- Fix 3: Admin can see all orders (in case policy is missing)
DROP POLICY IF EXISTS "admins can manage orders" ON public.orders;
CREATE POLICY "admins can manage orders"
  ON public.orders FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Fix 4: Admin can see all order_items
DROP POLICY IF EXISTS "admins can manage order items" ON public.order_items;
CREATE POLICY "admins can manage order items"
  ON public.order_items FOR ALL
  USING (public.is_admin());

-- Fix 5: Users can always insert orders (make sure RLS doesn't block)
DROP POLICY IF EXISTS "users can create orders" ON public.orders;
CREATE POLICY "users can create orders"
  ON public.orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Fix 6: Users can insert order_items for their own orders
DROP POLICY IF EXISTS "users can insert order items" ON public.order_items;
CREATE POLICY "users can insert order items"
  ON public.order_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_items.order_id
        AND o.user_id = auth.uid()
    )
  );

-- Fix 7: Make admin_dashboard_stats view accessible to admins
DROP VIEW IF EXISTS public.admin_dashboard_stats;
CREATE VIEW public.admin_dashboard_stats
WITH (security_invoker = true) AS
SELECT
  (SELECT COUNT(*) FROM public.orders WHERE status != 'cancelled')                         AS total_orders,
  (SELECT COUNT(*) FROM public.orders WHERE status = 'pending')                            AS pending_orders,
  (SELECT COALESCE(SUM(total),0) FROM public.orders WHERE payment_status = 'paid')         AS total_revenue,
  (SELECT COALESCE(SUM(total),0) FROM public.orders WHERE payment_status='paid' AND created_at::date = CURRENT_DATE) AS today_revenue,
  (SELECT COUNT(*) FROM public.profiles WHERE NOT is_admin)                                AS total_customers,
  (SELECT COUNT(*) FROM public.profiles WHERE NOT is_admin AND created_at > NOW()-INTERVAL '30 days') AS new_customers_30d,
  (SELECT COUNT(*) FROM public.products WHERE is_active)                                   AS active_products,
  (SELECT COUNT(*) FROM public.products WHERE stock <= 5 AND is_active)                    AS low_stock_count;

-- Grant access to the views
GRANT SELECT ON public.admin_dashboard_stats TO authenticated;
GRANT SELECT ON public.admin_revenue_by_day TO authenticated;
GRANT SELECT ON public.admin_top_products TO authenticated;

-- Fix 8: Create Supabase Storage bucket for product images
-- (Run this separately or create via Dashboard: Storage → New Bucket → "product-images" → Public)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('product-images', 'product-images', true)
-- ON CONFLICT (id) DO NOTHING;

-- Storage policy for product images
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'product-images') THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES ('product-images', 'product-images', true, 5242880, ARRAY['image/jpeg','image/png','image/webp','image/gif']);
  END IF;
END $$;

-- Allow admins to upload
DROP POLICY IF EXISTS "admins can upload product images" ON storage.objects;
CREATE POLICY "admins can upload product images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'product-images' AND public.is_admin());

DROP POLICY IF EXISTS "anyone can view product images" ON storage.objects;
CREATE POLICY "anyone can view product images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "admins can delete product images" ON storage.objects;
CREATE POLICY "admins can delete product images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'product-images' AND public.is_admin());
