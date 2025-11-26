-- =====================================================
-- FIX: Sales to User Details Foreign Key
-- =====================================================
-- Este script verifica y crea la relación foreign key
-- entre sales.sold_by y user_details.id si no existe

-- Primero, verificamos si la constraint existe
DO $$
BEGIN
    -- Si la constraint existe, la eliminamos para recrearla
    IF EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'sales_sold_by_fkey'
        AND table_name = 'sales'
    ) THEN
        ALTER TABLE sales DROP CONSTRAINT sales_sold_by_fkey;
        RAISE NOTICE 'Constraint existente eliminada';
    END IF;
END $$;

-- Verificamos que la columna sold_by existe y tiene el tipo correcto
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'sales'
        AND column_name = 'sold_by'
    ) THEN
        RAISE EXCEPTION 'La columna sold_by no existe en la tabla sales';
    END IF;
END $$;

-- Verificamos que la tabla user_details existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_name = 'user_details'
    ) THEN
        RAISE EXCEPTION 'La tabla user_details no existe';
    END IF;
END $$;

-- Creamos la foreign key constraint
ALTER TABLE sales
ADD CONSTRAINT sales_sold_by_fkey
FOREIGN KEY (sold_by)
REFERENCES user_details(id)
ON DELETE RESTRICT;

-- Verificamos que se creó correctamente
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_name = 'sales_sold_by_fkey'
        AND table_name = 'sales'
    ) THEN
        RAISE NOTICE 'Foreign key constraint creada exitosamente';
    ELSE
        RAISE EXCEPTION 'Error al crear la foreign key constraint';
    END IF;
END $$;

COMMENT ON CONSTRAINT sales_sold_by_fkey ON sales IS 'Relación entre ventas y usuario vendedor';
