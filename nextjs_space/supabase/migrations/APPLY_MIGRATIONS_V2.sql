-- =====================================================
-- MIGRATION SCRIPT V2 - CORREGIDO
-- Para tablas con nomenclatura alternativa
-- =====================================================

-- =====================================================
-- 1. CREATE SEARCH PRODUCTS FUNCTION
-- =====================================================

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
      'unit', p.unit,
      'price', jsonb_build_object(
        'id', pp.id,
        'productId', pp.product_id,
        'costPrice', pp.cost_price,
        'salePrice', pp.sale_price,
        'currency', pp.currency,
        'isActive', pp.is_active
      ),
      'variants', COALESCE(
        (
          SELECT jsonb_agg(
            jsonb_build_object(
              'id', pv.id,
              'productId', pv.product_id,
              'name', pv.name,
              'sku', pv.sku,
              'additionalPrice', pv.additional_price,
              'isActive', pv.is_active
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

    jsonb_build_object(
      'id', i.id,
      'productId', i.product_id,
      'variantId', i.variant_id,
      'locationId', i.location_id,
      'quantity', COALESCE(i.quantity, 0),
      'minStockLevel', COALESCE(i.min_stock_level, 0),
      'reorderPoint', COALESCE(i.reorder_point, 0),
      'lastRestocked', i.last_restocked
    ) AS inventory,

    COALESCE(i.quantity, 0)::INTEGER AS available_stock

  FROM public.products p
  INNER JOIN public.product_prices pp
    ON pp.product_id = p.id
    AND pp.is_active = true
  LEFT JOIN public.categories c
    ON c.id = p.category_id
  LEFT JOIN public.inventory i
    ON i.product_id = p.id
    AND i.location_id = p_location_id
    AND i.variant_id IS NULL

  WHERE
    p.is_active = true
    AND (
      LOWER(p.name) LIKE LOWER('%' || p_search_term || '%')
      OR LOWER(p.sku) LIKE LOWER('%' || p_search_term || '%')
      OR LOWER(p.barcode) LIKE LOWER('%' || p_search_term || '%')
    )

  ORDER BY
    CASE
      WHEN LOWER(p.sku) = LOWER(p_search_term) THEN 1
      WHEN LOWER(p.name) = LOWER(p_search_term) THEN 2
      WHEN LOWER(p.sku) LIKE LOWER(p_search_term || '%') THEN 3
      WHEN LOWER(p.name) LIKE LOWER(p_search_term || '%') THEN 4
      ELSE 5
    END,
    p.name ASC

  LIMIT 20;
END;
$$;

GRANT EXECUTE ON FUNCTION public.search_products_with_inventory(TEXT, INTEGER) TO authenticated;

COMMENT ON FUNCTION public.search_products_with_inventory IS
  'Searches products by name, SKU, or barcode and returns product info with inventory for a specific location.';

-- =====================================================
-- 2. CREATE MATERIALIZED VIEWS (VERSION FLEXIBLE)
-- Intenta con nombres de columnas comunes
-- =====================================================

DROP MATERIALIZED VIEW IF EXISTS public.mv_daily_sales_by_location CASCADE;
DROP MATERIALIZED VIEW IF EXISTS public.mv_top_selling_products CASCADE;

-- Versión 1: Intenta con columnas standard (total, subtotal, etc)
DO $$
BEGIN
  CREATE MATERIALIZED VIEW public.mv_daily_sales_by_location AS
  SELECT
    s.location_id,
    DATE(s.created_at) AS sale_date,
    COUNT(DISTINCT s.id) AS total_transactions,
    COALESCE(SUM(s.total), 0) AS total_sales,
    COALESCE(SUM(s.subtotal), 0) AS total_subtotal,
    COALESCE(SUM(s.tax_amount), 0) AS total_tax,
    COALESCE(SUM(s.discount_amount), 0) AS total_discount
  FROM public.sales s
  WHERE s.status = 'completed'
    AND (s.deleted_at IS NULL OR s.deleted_at > NOW())
  GROUP BY s.location_id, DATE(s.created_at);

EXCEPTION WHEN undefined_column THEN
  -- Si falló, intenta con total_amount en lugar de total
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
    AND (s.deleted_at IS NULL OR s.deleted_at > NOW())
  GROUP BY s.location_id, DATE(s.created_at);
END$$;

-- Crear índices
CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_sales_location_date
  ON public.mv_daily_sales_by_location (location_id, sale_date);

CREATE INDEX IF NOT EXISTS idx_daily_sales_date
  ON public.mv_daily_sales_by_location (sale_date);

-- Vista de productos más vendidos
CREATE MATERIALIZED VIEW public.mv_top_selling_products AS
SELECT
  si.product_id,
  p.name AS product_name,
  p.sku AS product_sku,
  s.location_id,
  SUM(si.quantity) AS total_quantity_sold,
  SUM(si.total) AS total_revenue,
  COUNT(DISTINCT s.id) AS transaction_count,
  MAX(s.created_at) AS last_sold_at
FROM public.sale_items si
INNER JOIN public.sales s ON s.id = si.sale_id
INNER JOIN public.products p ON p.id = si.product_id
WHERE s.status = 'completed'
  AND (s.deleted_at IS NULL OR s.deleted_at > NOW())
  AND (si.deleted_at IS NULL OR si.deleted_at > NOW())
  AND s.created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY si.product_id, p.name, p.sku, s.location_id;

CREATE INDEX IF NOT EXISTS idx_top_products_location
  ON public.mv_top_selling_products (location_id);

CREATE INDEX IF NOT EXISTS idx_top_products_quantity
  ON public.mv_top_selling_products (total_quantity_sold DESC);

-- Permisos
GRANT SELECT ON public.mv_daily_sales_by_location TO authenticated;
GRANT SELECT ON public.mv_top_selling_products TO authenticated;

-- Función para refrescar
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
