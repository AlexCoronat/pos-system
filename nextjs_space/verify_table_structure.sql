-- ========================================
-- VERIFICAR ESTRUCTURA DE user_details
-- ========================================
-- Este script verifica qué columnas tienen restricción NOT NULL

SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'user_details'
ORDER BY ordinal_position;

-- Mostrar restricciones NOT NULL problemáticas
DO $$
DECLARE
    col_record record;
    nullable_count integer := 0;
    not_null_count integer := 0;
BEGIN
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'COLUMNAS NOT NULL EN user_details';
    RAISE NOTICE '=========================================';

    FOR col_record IN
        SELECT column_name, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'user_details'
        ORDER BY ordinal_position
    LOOP
        IF col_record.is_nullable = 'NO' AND col_record.column_default IS NULL THEN
            not_null_count := not_null_count + 1;
            RAISE NOTICE '❌ % - NOT NULL sin default', col_record.column_name;
        ELSIF col_record.is_nullable = 'NO' THEN
            RAISE NOTICE '⚠️  % - NOT NULL con default: %', col_record.column_name, col_record.column_default;
        ELSE
            nullable_count := nullable_count + 1;
        END IF;
    END LOOP;

    RAISE NOTICE '=========================================';
    RAISE NOTICE 'Columnas nullable: %', nullable_count;
    RAISE NOTICE 'Columnas NOT NULL: %', not_null_count;
    RAISE NOTICE '=========================================';

    IF not_null_count > 4 THEN  -- id, email, created_at, updated_at son esperables
        RAISE WARNING 'Hay % columnas NOT NULL sin default que pueden causar problemas', not_null_count;
    ELSE
        RAISE NOTICE '✅ La estructura parece correcta';
    END IF;
END $$;
