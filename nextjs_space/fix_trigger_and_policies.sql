-- ========================================
-- FIX: Trigger automático y políticas RLS
-- ========================================
-- Este script corrige el trigger y las políticas RLS
-- para asegurar que los usuarios se creen automáticamente en user_details

BEGIN;

-- PASO 0: Hacer first_name y last_name opcionales (nullable)
-- Esto es necesario porque el trigger crea el registro antes de tener estos datos
ALTER TABLE public.user_details ALTER COLUMN first_name DROP NOT NULL;
ALTER TABLE public.user_details ALTER COLUMN last_name DROP NOT NULL;

-- PASO 1: Eliminar trigger y función existentes
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_updated ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.sync_user_email() CASCADE;

-- PASO 2: Recrear función con permisos correctos
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
SECURITY DEFINER  -- Se ejecuta con permisos del owner (postgres)
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Intentar insertar el nuevo usuario en user_details
  -- Lee first_name, last_name, phone del user_metadata
  BEGIN
    INSERT INTO public.user_details (
      id,
      email,
      first_name,
      last_name,
      phone,
      role_id,
      is_active,
      email_verified,
      metadata,
      created_at,
      updated_at
    )
    VALUES (
      NEW.id,
      NEW.email,
      NEW.raw_user_meta_data->>'first_name',
      NEW.raw_user_meta_data->>'last_name',
      NEW.raw_user_meta_data->>'phone',
      3, -- role_id 3 = Seller (default)
      true,
      COALESCE(NEW.email_confirmed_at IS NOT NULL, false),
      COALESCE(NEW.raw_user_meta_data, '{}'::jsonb),
      NOW(),
      NOW()
    );

    RAISE NOTICE 'Usuario creado en user_details: % (%, %)',
      NEW.email,
      NEW.raw_user_meta_data->>'first_name',
      NEW.raw_user_meta_data->>'last_name';

  EXCEPTION
    WHEN unique_violation THEN
      -- Si ya existe, actualizar todos los campos
      UPDATE public.user_details
      SET
        email = NEW.email,
        first_name = COALESCE(NEW.raw_user_meta_data->>'first_name', first_name),
        last_name = COALESCE(NEW.raw_user_meta_data->>'last_name', last_name),
        phone = COALESCE(NEW.raw_user_meta_data->>'phone', phone),
        email_verified = COALESCE(NEW.email_confirmed_at IS NOT NULL, false),
        metadata = COALESCE(NEW.raw_user_meta_data, metadata),
        updated_at = NOW()
      WHERE id = NEW.id;

      RAISE NOTICE 'Usuario actualizado en user_details: % (%, %)',
        NEW.email,
        NEW.raw_user_meta_data->>'first_name',
        NEW.raw_user_meta_data->>'last_name';

    WHEN foreign_key_violation THEN
      -- Si el role_id no existe, usar NULL temporalmente
      INSERT INTO public.user_details (
        id,
        email,
        first_name,
        last_name,
        phone,
        role_id,
        is_active,
        email_verified,
        metadata,
        created_at,
        updated_at
      )
      VALUES (
        NEW.id,
        NEW.email,
        NEW.raw_user_meta_data->>'first_name',
        NEW.raw_user_meta_data->>'last_name',
        NEW.raw_user_meta_data->>'phone',
        NULL,
        true,
        COALESCE(NEW.email_confirmed_at IS NOT NULL, false),
        COALESCE(NEW.raw_user_meta_data, '{}'::jsonb),
        NOW(),
        NOW()
      );

      RAISE WARNING 'Usuario creado sin role_id (role 3 no existe): % (%, %)',
        NEW.email,
        NEW.raw_user_meta_data->>'first_name',
        NEW.raw_user_meta_data->>'last_name';

    WHEN OTHERS THEN
      -- Log del error pero NO fallar el signup
      RAISE WARNING 'Error creando user_details para %: % %', NEW.email, SQLERRM, SQLSTATE;
  END;

  RETURN NEW;
END;
$$;

-- PASO 3: Crear trigger en auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- PASO 4: Función para sincronizar email cuando cambia
CREATE OR REPLACE FUNCTION public.sync_user_email()
RETURNS trigger
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.email != OLD.email THEN
    UPDATE public.user_details
    SET email = NEW.email, updated_at = NOW()
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

-- PASO 5: Trigger para sincronizar email
CREATE TRIGGER on_auth_user_updated
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  WHEN (OLD.email IS DISTINCT FROM NEW.email)
  EXECUTE FUNCTION public.sync_user_email();

-- PASO 6: Actualizar políticas RLS
-- Eliminar TODAS las políticas existentes
DROP POLICY IF EXISTS "Users can read own profile" ON public.user_details;
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_details;
DROP POLICY IF EXISTS "Allow trigger to insert user details" ON public.user_details;
DROP POLICY IF EXISTS "Users can insert their own profile during registration" ON public.user_details;
DROP POLICY IF EXISTS "Allow system to insert user details" ON public.user_details;
DROP POLICY IF EXISTS "Users can read their own profile" ON public.user_details;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.user_details;

-- Asegurar que RLS esté habilitado
ALTER TABLE public.user_details ENABLE ROW LEVEL SECURITY;

-- Política para SELECT
CREATE POLICY "Users can read own profile"
  ON public.user_details
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Política para UPDATE
CREATE POLICY "Users can update own profile"
  ON public.user_details
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Política para INSERT - CLAVE: permite INSERT sin restricción de autenticación
-- Esto permite que el trigger (que se ejecuta como SECURITY DEFINER) pueda insertar
CREATE POLICY "Allow system to insert user details"
  ON public.user_details
  FOR INSERT
  WITH CHECK (true);  -- Sin restricción - el trigger puede insertar

-- PASO 7: Otorgar permisos necesarios
GRANT USAGE ON SCHEMA public TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE ON public.user_details TO authenticated;
GRANT SELECT ON public.user_details TO anon;

-- PASO 8: Sincronizar usuarios existentes de auth.users que no tienen user_details
INSERT INTO public.user_details (id, email, role_id, is_active, email_verified, created_at, updated_at)
SELECT
  au.id,
  au.email,
  3, -- role_id 3 = Seller
  true,
  au.email_confirmed_at IS NOT NULL,
  au.created_at,
  NOW()
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_details ud WHERE ud.id = au.id
)
ON CONFLICT (id) DO NOTHING;

COMMIT;

-- Verificación final
DO $$
DECLARE
    trigger_count integer;
    function_count integer;
    orphan_count integer;
BEGIN
    -- Verificar trigger
    SELECT COUNT(*) INTO trigger_count
    FROM pg_trigger
    WHERE tgname = 'on_auth_user_created';

    -- Verificar función
    SELECT COUNT(*) INTO function_count
    FROM pg_proc
    WHERE proname = 'handle_new_user';

    -- Verificar huérfanos
    SELECT COUNT(*) INTO orphan_count
    FROM auth.users au
    WHERE NOT EXISTS (SELECT 1 FROM public.user_details ud WHERE ud.id = au.id);

    RAISE NOTICE '=========================================';
    RAISE NOTICE 'CORRECCIÓN COMPLETADA';
    RAISE NOTICE '=========================================';
    RAISE NOTICE 'Trigger on_auth_user_created: %', CASE WHEN trigger_count > 0 THEN '✅ Existe' ELSE '❌ No existe' END;
    RAISE NOTICE 'Función handle_new_user: %', CASE WHEN function_count > 0 THEN '✅ Existe' ELSE '❌ No existe' END;
    RAISE NOTICE 'Usuarios sin user_details: %', orphan_count;

    IF orphan_count = 0 AND trigger_count > 0 AND function_count > 0 THEN
        RAISE NOTICE '✅ TODO CORRECTO - Puedes probar el registro';
    ELSE
        RAISE WARNING '⚠️ Todavía hay problemas';
    END IF;
    RAISE NOTICE '=========================================';
END $$;
