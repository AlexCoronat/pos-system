-- =====================================================
-- FIX: Renombrar line_total a subtotal en quote_items
-- Para que coincida con el esquema definido
-- =====================================================

-- Verificar si existe la columna line_total y renombrarla a subtotal
DO $$
BEGIN
    -- Si existe line_total, renombrarla a subtotal
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'quote_items'
        AND column_name = 'line_total'
    ) THEN
        ALTER TABLE quote_items RENAME COLUMN line_total TO subtotal;
        RAISE NOTICE 'Columna line_total renombrada a subtotal exitosamente';
    END IF;

    -- Si no existe subtotal (por si acaso), agregarla
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'quote_items'
        AND column_name = 'subtotal'
    ) THEN
        ALTER TABLE quote_items ADD COLUMN subtotal DECIMAL(12,2) NOT NULL DEFAULT 0;
        RAISE NOTICE 'Columna subtotal agregada exitosamente';
    END IF;

    -- Asegurar que otras columnas necesarias existan
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'quote_items' AND column_name = 'discount_amount'
    ) THEN
        ALTER TABLE quote_items ADD COLUMN discount_amount DECIMAL(10,2) DEFAULT 0;
        RAISE NOTICE 'Columna discount_amount agregada';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'quote_items' AND column_name = 'tax_rate'
    ) THEN
        ALTER TABLE quote_items ADD COLUMN tax_rate DECIMAL(5,2) DEFAULT 16.00;
        RAISE NOTICE 'Columna tax_rate agregada';
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'quote_items' AND column_name = 'tax_amount'
    ) THEN
        ALTER TABLE quote_items ADD COLUMN tax_amount DECIMAL(10,2) DEFAULT 0;
        RAISE NOTICE 'Columna tax_amount agregada';
    END IF;
END $$;

-- Verificar el resultado
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'quote_items'
ORDER BY ordinal_position;
