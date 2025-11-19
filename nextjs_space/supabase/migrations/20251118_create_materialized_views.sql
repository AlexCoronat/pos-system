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
