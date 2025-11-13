-- ========================================
-- DIAGNÓSTICO: Trigger de creación automática
-- ========================================
-- Este script verifica si el trigger existe y funciona correctamente

BEGIN;

-- 1. Verificar si el trigger existe
DO $$
DECLARE
    trigger_count integer;
BEGIN
    SELECT COUNT(*) INTO trigger_count
    FROM pg_trigger
    WHERE tgname = 'on_auth_user_created'
    AND tgrelid = 'auth.users'::regclass;

    RAISE NOTICE '=========================================';
    RAISE NOTICE 'VERIFICACIÓN DE TRIGGER';
    RAISE NOTICE '=========================================';
    IF trigger_count > 0 THEN
        RAISE NOTICE '✅ Trigger on_auth_user_created EXISTE';
    ELSE
        RAISE WARNING '❌ Trigger on_auth_user_created NO EXISTE';
    END IF;
END $$;

-- 2. Verificar si la función existe
DO $$
DECLARE
    function_count integer;
BEGIN
    SELECT COUNT(*) INTO function_count
    FROM pg_proc
    WHERE proname = 'handle_new_user'
    AND pronamespace = 'public'::regnamespace;

    IF function_count > 0 THEN
        RAISE NOTICE '✅ Función handle_new_user() EXISTE';
    ELSE
        RAISE WARNING '❌ Función handle_new_user() NO EXISTE';
    END IF;
END $$;

-- 3. Verificar políticas RLS en user_details
DO $$
DECLARE
    policy_record record;
    policy_count integer := 0;
BEGIN
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'POLÍTICAS RLS EN user_details';
    RAISE NOTICE '=========================================';

    FOR policy_record IN
        SELECT policyname, cmd, qual, with_check
        FROM pg_policies
        WHERE tablename = 'user_details'
        AND schemaname = 'public'
    LOOP
        policy_count := policy_count + 1;
        RAISE NOTICE 'Política: %', policy_record.policyname;
        RAISE NOTICE '  Comando: %', policy_record.cmd;
    END LOOP;

    IF policy_count = 0 THEN
        RAISE WARNING '❌ NO hay políticas RLS en user_details';
    END IF;
END $$;

-- 4. Verificar si RLS está habilitado
DO $$
DECLARE
    rls_enabled boolean;
BEGIN
    SELECT relrowsecurity INTO rls_enabled
    FROM pg_class
    WHERE oid = 'public.user_details'::regclass;

    IF rls_enabled THEN
        RAISE NOTICE '✅ RLS está HABILITADO en user_details';
    ELSE
        RAISE NOTICE '⚠️ RLS está DESHABILITADO en user_details';
    END IF;
END $$;

-- 5. Verificar usuarios recientes en auth.users sin user_details
DO $$
DECLARE
    orphan_count integer;
    orphan_record record;
BEGIN
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'USUARIOS SIN user_details';
    RAISE NOTICE '=========================================';

    SELECT COUNT(*) INTO orphan_count
    FROM auth.users au
    WHERE NOT EXISTS (
        SELECT 1 FROM public.user_details ud WHERE ud.id = au.id
    );

    RAISE NOTICE 'Usuarios en auth.users sin user_details: %', orphan_count;

    IF orphan_count > 0 THEN
        FOR orphan_record IN
            SELECT id, email, created_at
            FROM auth.users au
            WHERE NOT EXISTS (
                SELECT 1 FROM public.user_details ud WHERE ud.id = au.id
            )
            ORDER BY created_at DESC
            LIMIT 5
        LOOP
            RAISE NOTICE '  - Email: %, ID: %, Creado: %',
                orphan_record.email,
                orphan_record.id,
                orphan_record.created_at;
        END LOOP;
    END IF;
END $$;

ROLLBACK;

-- ========================================
-- SIGUIENTE PASO SI HAY PROBLEMAS:
-- Ejecuta: fix_trigger_and_policies.sql
-- ========================================
