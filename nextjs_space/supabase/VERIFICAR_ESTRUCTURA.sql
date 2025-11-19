-- =====================================================
-- VERIFICAR ESTRUCTURA DE TABLAS
-- Ejecuta estas queries para ver la estructura real
-- =====================================================

-- 1. Ver todas las columnas de la tabla 'sales'
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'sales'
ORDER BY ordinal_position;

-- 2. Ver todas las columnas de la tabla 'sale_items'
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'sale_items'
ORDER BY ordinal_position;

-- 3. Ver una muestra de datos de la tabla 'sales'
SELECT *
FROM public.sales
LIMIT 1;

-- 4. Ver todas las tablas en el esquema public
SELECT
    table_name,
    table_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;
