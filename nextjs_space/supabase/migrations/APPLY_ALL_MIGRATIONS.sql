-- =====================================================
-- COMPLETE MIGRATION SCRIPT FOR POS SYSTEM
-- Apply this script in Supabase SQL Editor
-- =====================================================

-- This script includes:
-- 1. Product search function
-- 2. Materialized views for analytics
-- 3. Helper functions

-- =====================================================
-- 1. CREATE SEARCH PRODUCTS FUNCTION
-- =====================================================

-- Function to search products with inventory information
-- This is used by the POS product search functionality
CREATE OR REPLACE FUNCTION public.search_products_with_inventory(
  p_search_term TEXT,
  p_location_id INTEGER
)
RETURNS TABLE (
  product JSONB,
  inventory JSONB,
  available_stock INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    -- Product data as JSONB
    jsonb_build_object(
      'id', p.id,
      'sku', p.sku,
      'name', p.name,
      'description', p.description,
      'categoryId', p.category_id,
      'categoryName', c.name,
      'isActive', p.is_active,
      'imageUrl', p.image_url,
      'barcode', p.barcode,
      'unitOfMeasure', p.unit_of_measure,
      'costPrice', p.cost_price,
      'sellingPrice', p.selling_price,
      'taxRate', p.tax_rate,
      'isTaxable', p.is_taxable,
      'hasVariants', p.has_variants,
      'variants', COALESCE(
        (
          SELECT jsonb_agg(
            jsonb_build_object(
              'id', pv.id,
              'productId', pv.product_id,
              'variantName', pv.variant_name,
              'sku', pv.sku,
              'barcode', pv.barcode,
              'costPrice', pv.cost_price,
              'sellingPrice', pv.selling_price,
              'isActive', pv.is_active,
              'attributes', pv.attributes
            )
          )
          FROM public.product_variants pv
          WHERE pv.product_id = p.id
            AND pv.is_active = true
        ),
        '[]'::jsonb
      ),
      'createdAt', p.created_at,
      'updatedAt', p.updated_at
    ) AS product,

    -- Inventory data as JSONB
    jsonb_build_object(
      'id', i.id,
      'productId', i.product_id,
      'locationId', i.location_id,
      'quantityAvailable', COALESCE(i.quantity_available, 0),
      'quantityReserved', COALESCE(i.quantity_reserved, 0),
      'minStockLevel', COALESCE(i.min_stock_level, 0),
      'maxStockLevel', COALESCE(i.max_stock_level, 0),
      'reorderPoint', COALESCE(i.reorder_point, 0),
      'lastRestockDate', i.last_restock_date,
      'lastRestockQuantity', i.last_restock_quantity,
      'isTracked', i.is_tracked
    ) AS inventory,

    -- Available stock as integer
    COALESCE(i.quantity_available, 0)::INTEGER AS available_stock

  FROM public.products p

  -- Join with category
  LEFT JOIN public.categories c
    ON c.id = p.category_id

  -- Join with inventory for the specified location
  LEFT JOIN public.inventory i
    ON i.product_id = p.id
    AND i.location_id = p_location_id

  WHERE
    -- Only active products
    p.is_active = true
    AND (p.deleted_at IS NULL OR p.deleted_at > NOW())

    -- Search by name, SKU or barcode (case-insensitive)
    AND (
      LOWER(p.name) LIKE LOWER('%' || p_search_term || '%')
      OR LOWER(p.sku) LIKE LOWER('%' || p_search_term || '%')
      OR (p.barcode IS NOT NULL AND LOWER(p.barcode) LIKE LOWER('%' || p_search_term || '%'))
    )

  ORDER BY
    -- Prioritize exact matches
    CASE
      WHEN LOWER(p.sku) = LOWER(p_search_term) THEN 1
      WHEN LOWER(p.name) = LOWER(p_search_term) THEN 2
      WHEN p.barcode IS NOT NULL AND LOWER(p.barcode) = LOWER(p_search_term) THEN 3
      WHEN LOWER(p.sku) LIKE LOWER(p_search_term || '%') THEN 4
      WHEN LOWER(p.name) LIKE LOWER(p_search_term || '%') THEN 5
      ELSE 6
    END,
    p.name ASC

  LIMIT 20;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.search_products_with_inventory(TEXT, INTEGER) TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.search_products_with_inventory IS
  'Searches products by name, SKU, or barcode and returns product info with inventory for a specific location. Used in POS sales interface.';

-- =====================================================
-- 2. CREATE MATERIALIZED VIEWS FOR ANALYTICS
-- =====================================================

-- Drop existing materialized views if they exist
DROP MATERIALIZED VIEW IF EXISTS public.mv_daily_sales_by_location CASCADE;
DROP MATERIALIZED VIEW IF EXISTS public.mv_top_selling_products CASCADE;

-- Create materialized view for daily sales by location
CREATE MATERIALIZED VIEW public.mv_daily_sales_by_location AS
SELECT
  s.location_id,
  DATE(s.created_at) AS sale_date,
  COUNT(DISTINCT s.id) AS total_transactions,
  COALESCE(SUM(s.total_amount), 0) AS total_sales,
  COALESCE(SUM(s.subtotal), 0) AS total_subtotal,
  COALESCE(SUM(s.tax_amount), 0) AS total_tax,
  COALESCE(SUM(s.discount_amount), 0) AS total_discount
FROM public.sales s
WHERE s.status = 'completed'
  AND s.deleted_at IS NULL
GROUP BY s.location_id, DATE(s.created_at);

-- Create index for faster queries
CREATE UNIQUE INDEX idx_daily_sales_location_date
  ON public.mv_daily_sales_by_location (location_id, sale_date);

CREATE INDEX idx_daily_sales_date
  ON public.mv_daily_sales_by_location (sale_date);

-- Create materialized view for top selling products
CREATE MATERIALIZED VIEW public.mv_top_selling_products AS
SELECT
  si.product_id,
  p.name AS product_name,
  p.sku AS product_sku,
  s.location_id,
  SUM(si.quantity) AS total_quantity_sold,
  COALESCE(SUM(si.line_total), 0) AS total_revenue,
  COUNT(DISTINCT s.id) AS transaction_count,
  MAX(s.created_at) AS last_sold_at
FROM public.sale_items si
INNER JOIN public.sales s ON s.id = si.sale_id
INNER JOIN public.products p ON p.id = si.product_id
WHERE s.status = 'completed'
  AND s.deleted_at IS NULL
  AND s.created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY si.product_id, p.name, p.sku, s.location_id;

-- Create indexes for faster queries
CREATE INDEX idx_top_products_location
  ON public.mv_top_selling_products (location_id);

CREATE INDEX idx_top_products_quantity
  ON public.mv_top_selling_products (total_quantity_sold DESC);

-- Grant permissions to authenticated users
GRANT SELECT ON public.mv_daily_sales_by_location TO authenticated;
GRANT SELECT ON public.mv_top_selling_products TO authenticated;

-- Add comments
COMMENT ON MATERIALIZED VIEW public.mv_daily_sales_by_location IS
  'Daily sales aggregated by location. Refreshed periodically for dashboard analytics.';

COMMENT ON MATERIALIZED VIEW public.mv_top_selling_products IS
  'Top selling products by location for the last 30 days. Refreshed periodically for dashboard analytics.';

-- =====================================================
-- 3. HELPER FUNCTIONS
-- =====================================================

-- Function to refresh materialized views
CREATE OR REPLACE FUNCTION public.refresh_sales_analytics()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_daily_sales_by_location;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_top_selling_products;
END;
$$;

GRANT EXECUTE ON FUNCTION public.refresh_sales_analytics() TO authenticated;

COMMENT ON FUNCTION public.refresh_sales_analytics IS
  'Refreshes all sales analytics materialized views. Should be called periodically (e.g., hourly) via cron job.';

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Run these queries after applying the migration to verify everything is working:

-- 1. Check if search function exists
-- SELECT proname, pronamespace::regnamespace
-- FROM pg_proc
-- WHERE proname = 'search_products_with_inventory';

-- 2. Check if materialized views exist
-- SELECT schemaname, matviewname
-- FROM pg_matviews
-- WHERE schemaname = 'public'
--   AND matviewname LIKE 'mv_%';

-- 3. Test search function (replace with actual location_id and search term)
-- SELECT * FROM public.search_products_with_inventory('test', 1);

-- 4. Check materialized views data
-- SELECT * FROM public.mv_daily_sales_by_location LIMIT 5;
-- SELECT * FROM public.mv_top_selling_products LIMIT 5;

-- =====================================================
-- END OF MIGRATION
-- =====================================================
