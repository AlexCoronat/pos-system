-- ========================================
-- VERIFICAR Y CREAR ROLES
-- ========================================
-- Este script verifica que los roles necesarios existan
-- y los crea si no están presentes

BEGIN;

-- Verificar si la tabla roles existe
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'roles') THEN
        RAISE EXCEPTION 'La tabla "roles" no existe. Necesitas crearla primero.';
    END IF;
END $$;

-- Mostrar roles existentes
DO $$
DECLARE
    role_record record;
    role_count integer := 0;
BEGIN
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'ROLES EXISTENTES';
    RAISE NOTICE '=========================================';

    FOR role_record IN
        SELECT id, name
        FROM public.roles
        ORDER BY id
    LOOP
        role_count := role_count + 1;
        RAISE NOTICE 'ID: %, Nombre: %', role_record.id, role_record.name;
    END LOOP;

    IF role_count = 0 THEN
        RAISE NOTICE 'No hay roles en la base de datos';
    END IF;
    RAISE NOTICE '=========================================';
END $$;

-- Insertar roles si no existen
-- NOTA: Ajusta los permisos según tus necesidades

-- Admin (ID: 1)
INSERT INTO public.roles (id, name, permissions, description, created_at, updated_at)
VALUES (
    1,
    'Admin',
    '{
        "sales": ["read", "create", "update", "delete"],
        "inventory": ["read", "create", "update", "delete"],
        "customers": ["read", "create", "update", "delete"],
        "reports": ["read"],
        "settings": ["read", "update"],
        "users": ["read", "create", "update", "delete"],
        "locations": ["read", "create", "update", "delete"]
    }'::jsonb,
    'Full system access',
    NOW(),
    NOW()
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    permissions = EXCLUDED.permissions,
    updated_at = NOW();

-- Manager (ID: 2)
INSERT INTO public.roles (id, name, permissions, description, created_at, updated_at)
VALUES (
    2,
    'Manager',
    '{
        "sales": ["read", "create", "update", "delete"],
        "inventory": ["read", "create", "update"],
        "customers": ["read", "create", "update"],
        "reports": ["read"],
        "settings": ["read"]
    }'::jsonb,
    'Store management access',
    NOW(),
    NOW()
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    permissions = EXCLUDED.permissions,
    updated_at = NOW();

-- Seller (ID: 3) - IMPORTANTE: Este es el rol por defecto
INSERT INTO public.roles (id, name, permissions, description, created_at, updated_at)
VALUES (
    3,
    'Seller',
    '{
        "sales": ["read", "create", "update"],
        "customers": ["read", "create", "update"],
        "inventory": ["read"]
    }'::jsonb,
    'Sales and customer management',
    NOW(),
    NOW()
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    permissions = EXCLUDED.permissions,
    updated_at = NOW();

-- Support (ID: 4)
INSERT INTO public.roles (id, name, permissions, description, created_at, updated_at)
VALUES (
    4,
    'Support',
    '{
        "customers": ["read", "update"],
        "inventory": ["read"],
        "reports": ["read"]
    }'::jsonb,
    'Customer support access',
    NOW(),
    NOW()
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    permissions = EXCLUDED.permissions,
    updated_at = NOW();

-- Inventory Manager (ID: 5)
INSERT INTO public.roles (id, name, permissions, description, created_at, updated_at)
VALUES (
    5,
    'Inventory Manager',
    '{
        "inventory": ["read", "create", "update", "delete"],
        "sales": ["read"],
        "reports": ["read"]
    }'::jsonb,
    'Inventory management access',
    NOW(),
    NOW()
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    permissions = EXCLUDED.permissions,
    updated_at = NOW();

COMMIT;

-- Verificación final
DO $$
DECLARE
    role_record record;
    seller_exists boolean := false;
BEGIN
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'VERIFICACIÓN FINAL';
    RAISE NOTICE '=========================================';

    FOR role_record IN
        SELECT id, name
        FROM public.roles
        ORDER BY id
    LOOP
        RAISE NOTICE '✓ ID: %, Nombre: %', role_record.id, role_record.name;
        IF role_record.id = 3 AND role_record.name = 'Seller' THEN
            seller_exists := true;
        END IF;
    END LOOP;

    IF seller_exists THEN
        RAISE NOTICE '✅ Rol "Seller" (ID: 3) existe correctamente';
    ELSE
        RAISE WARNING '❌ Rol "Seller" (ID: 3) NO existe o tiene nombre incorrecto';
    END IF;
    RAISE NOTICE '=========================================';
END $$;
