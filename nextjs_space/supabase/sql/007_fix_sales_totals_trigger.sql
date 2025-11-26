-- =====================================================
-- FIX: Eliminar/Corregir Trigger que Recalcula Totales Incorrectamente
-- =====================================================
-- Este script elimina el trigger problemático que está
-- recalculando incorrectamente los totales de ventas

-- PASO 1: Buscar y eliminar el trigger existente
-- Primero, busquemos todos los triggers PERSONALIZADOS en sale_items
-- Ignoramos los triggers internos de PostgreSQL (constraints, etc.)
DO $$
DECLARE
    trigger_record RECORD;
    trigger_count INTEGER := 0;
BEGIN
    FOR trigger_record IN
        SELECT
            t.tgname as trigger_name,
            p.proname as function_name,
            n.nspname as schema_name
        FROM pg_trigger t
        JOIN pg_class c ON t.tgrelid = c.oid
        JOIN pg_proc p ON t.tgfoid = p.oid
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE c.relname = 'sale_items'
        AND NOT t.tgisinternal  -- Ignorar triggers internos
        AND t.tgname NOT LIKE 'RI_ConstraintTrigger_%'  -- Ignorar triggers de FK
        AND t.tgname NOT LIKE 'pg_%'  -- Ignorar triggers del sistema
        AND n.nspname NOT IN ('pg_catalog', 'information_schema')  -- Ignorar schemas del sistema
    LOOP
        RAISE NOTICE 'Found custom trigger: % on sale_items, function: % (schema: %)',
            trigger_record.trigger_name, trigger_record.function_name, trigger_record.schema_name;

        -- Eliminar el trigger
        EXECUTE format('DROP TRIGGER IF EXISTS %I ON sale_items', trigger_record.trigger_name);
        RAISE NOTICE 'Dropped trigger: %', trigger_record.trigger_name;
        
        trigger_count := trigger_count + 1;
    END LOOP;

    -- Mensaje si no se encontraron triggers personalizados
    IF trigger_count = 0 THEN
        RAISE NOTICE 'No custom triggers found on sale_items';
    ELSE
        RAISE NOTICE 'Dropped % custom trigger(s) from sale_items', trigger_count;
    END IF;
END $$;

-- PASO 1.5: Buscar y eliminar triggers en la tabla SALES también
DO $$
DECLARE
    trigger_record RECORD;
BEGIN
    FOR trigger_record IN
        SELECT
            t.tgname as trigger_name,
            p.proname as function_name
        FROM pg_trigger t
        JOIN pg_class c ON t.tgrelid = c.oid
        JOIN pg_proc p ON t.tgfoid = p.oid
        WHERE c.relname = 'sales'
        AND NOT t.tgisinternal
        AND t.tgname NOT LIKE 'RI_ConstraintTrigger_%'
        AND t.tgname NOT LIKE 'tr_sales_%'  -- Preservar triggers conocidos (updated_at, business_id)
    LOOP
        RAISE NOTICE 'Found custom trigger: % on sales, function: %',
            trigger_record.trigger_name, trigger_record.function_name;

        -- Solo mostrar, no eliminar automáticamente
        RAISE NOTICE 'Trigger on sales table - review before dropping: %', trigger_record.trigger_name;
    END LOOP;
END $$;

-- PASO 2: Eliminar la función problemática si existe
DROP FUNCTION IF EXISTS update_sale_totals() CASCADE;
DROP FUNCTION IF EXISTS recalcular_totales_venta() CASCADE;
DROP FUNCTION IF EXISTS calculate_sale_totals() CASCADE;

-- PASO 3: Crear la función CORRECTA para recalcular totales
-- IMPORTANTE: Esta función asume que line_total ya incluye el impuesto
CREATE OR REPLACE FUNCTION update_sale_totals_correct()
RETURNS TRIGGER AS $$
BEGIN
    -- Recalcular totales de la venta CORRECTAMENTE
    -- line_total = precio_sin_impuesto_despues_descuento + impuesto
    UPDATE sales
    SET
        -- El subtotal es la suma de precios SIN impuesto (antes de descuento)
        subtotal = (
            SELECT COALESCE(SUM(
                (unit_price * quantity) / (1 + 16.0 / 100)
            ), 0)
            FROM sale_items
            WHERE sale_id = COALESCE(NEW.sale_id, OLD.sale_id)
        ),
        -- El tax_amount es la suma de los impuestos de cada item
        tax_amount = (
            SELECT COALESCE(SUM(tax_amount), 0)
            FROM sale_items
            WHERE sale_id = COALESCE(NEW.sale_id, OLD.sale_id)
        ),
        -- El total es la suma de los line_total (que ya incluyen impuesto)
        total_amount = (
            SELECT COALESCE(SUM(line_total), 0)
            FROM sale_items
            WHERE sale_id = COALESCE(NEW.sale_id, OLD.sale_id)
        ) - COALESCE((
            SELECT discount_amount
            FROM sales
            WHERE id = COALESCE(NEW.sale_id, OLD.sale_id)
        ), 0)
    WHERE id = COALESCE(NEW.sale_id, OLD.sale_id);

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- PASO 4: NO crear el trigger automáticamente
-- Comentado para que NO se recalculen automáticamente
-- Esto permite que el backend tenga control total sobre los cálculos
/*
CREATE TRIGGER tr_update_sale_totals
    AFTER INSERT OR UPDATE OR DELETE ON sale_items
    FOR EACH ROW
    EXECUTE FUNCTION update_sale_totals_correct();
*/

COMMENT ON FUNCTION update_sale_totals_correct() IS
'Función para recalcular totales de venta CORRECTAMENTE (actualmente sin trigger asociado)';

-- PASO 5: Limpiar datos existentes (OPCIONAL)
-- Este script corrige las ventas existentes que fueron calculadas incorrectamente
-- ADVERTENCIA: Solo ejecutar si estás seguro

/*
DO $$
DECLARE
    sale_record RECORD;
    correct_subtotal NUMERIC;
    correct_tax NUMERIC;
    correct_total NUMERIC;
BEGIN
    FOR sale_record IN
        SELECT id FROM sales WHERE deleted_at IS NULL
    LOOP
        -- Calcular subtotal correcto (precio sin impuesto)
        SELECT COALESCE(SUM(
            (unit_price * quantity) / (1 + 16.0 / 100)
        ), 0)
        INTO correct_subtotal
        FROM sale_items
        WHERE sale_id = sale_record.id;

        -- Calcular tax correcto
        SELECT COALESCE(SUM(tax_amount), 0)
        INTO correct_tax
        FROM sale_items
        WHERE sale_id = sale_record.id;

        -- Calcular total correcto
        SELECT COALESCE(SUM(line_total), 0)
        INTO correct_total
        FROM sale_items
        WHERE sale_id = sale_record.id;

        -- Actualizar la venta
        UPDATE sales
        SET
            subtotal = correct_subtotal,
            tax_amount = correct_tax,
            total_amount = correct_total - COALESCE(discount_amount, 0)
        WHERE id = sale_record.id;

        RAISE NOTICE 'Fixed sale ID: %', sale_record.id;
    END LOOP;
END $$;
*/

-- VERIFICACIÓN: Mostrar información sobre triggers actuales en sale_items
SELECT
    t.tgname as trigger_name,
    p.proname as function_name,
    CASE t.tgtype::integer & 1 WHEN 1 THEN 'ROW' ELSE 'STATEMENT' END as level,
    CASE t.tgtype::integer & 66
        WHEN 2 THEN 'BEFORE'
        WHEN 64 THEN 'INSTEAD OF'
        ELSE 'AFTER'
    END as timing,
    CASE
        WHEN t.tgtype::integer & 4 <> 0 THEN 'INSERT'
        WHEN t.tgtype::integer & 8 <> 0 THEN 'DELETE'
        WHEN t.tgtype::integer & 16 <> 0 THEN 'UPDATE'
    END as event
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE c.relname = 'sale_items'
AND NOT t.tgisinternal;
