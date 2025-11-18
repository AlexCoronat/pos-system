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

    -- Inventory data as JSONB
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

    -- Available stock as integer
    COALESCE(i.quantity, 0)::INTEGER AS available_stock

  FROM public.products p

  -- Join with active price
  INNER JOIN public.product_prices pp
    ON pp.product_id = p.id
    AND pp.is_active = true

  -- Join with category
  LEFT JOIN public.categories c
    ON c.id = p.category_id

  -- Join with inventory for the specified location
  LEFT JOIN public.inventory i
    ON i.product_id = p.id
    AND i.location_id = p_location_id
    AND i.variant_id IS NULL

  WHERE
    -- Only active products
    p.is_active = true

    -- Search by name or SKU (case-insensitive)
    AND (
      LOWER(p.name) LIKE LOWER('%' || p_search_term || '%')
      OR LOWER(p.sku) LIKE LOWER('%' || p_search_term || '%')
      OR LOWER(p.barcode) LIKE LOWER('%' || p_search_term || '%')
    )

  ORDER BY
    -- Prioritize exact matches
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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.search_products_with_inventory(TEXT, INTEGER) TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.search_products_with_inventory IS
  'Searches products by name, SKU, or barcode and returns product info with inventory for a specific location. Used in POS sales interface.';
