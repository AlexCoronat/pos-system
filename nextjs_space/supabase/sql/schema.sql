


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE SCHEMA IF NOT EXISTS "public";


ALTER SCHEMA "public" OWNER TO "pg_database_owner";


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE OR REPLACE FUNCTION "public"."archive_and_remove_user"("p_user_id" "uuid", "p_removal_reason" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_user_data RECORD;
    v_locations JSONB;
    v_current_user_id UUID;
BEGIN
    -- Get current user
    v_current_user_id := auth.uid();
    
    IF v_current_user_id IS NULL THEN
        RAISE EXCEPTION 'No authenticated user';
    END IF;
    
    -- Get user data
    SELECT * INTO v_user_data
    FROM user_details
    WHERE id = p_user_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'User not found';
    END IF;
    
    -- Verify permission: current user must be from same business
    IF v_user_data.business_id != get_user_business_id() THEN
        RAISE EXCEPTION 'Unauthorized: User from different business';
    END IF;
    
    -- Get assigned locations
    SELECT JSONB_AGG(
        JSONB_BUILD_OBJECT(
            'location_id', ul.location_id,
            'is_primary', ul.is_primary,
            'location_name', l.name
        )
    ) INTO v_locations
    FROM user_locations ul
    LEFT JOIN locations l ON l.id = ul.location_id
    WHERE ul.user_id = p_user_id;
    
    -- Insert into archive
    INSERT INTO user_details_archive (
        id,
        email,
        first_name,
        last_name,
        phone,
        business_id,
        role_id,
        default_location_id,
        is_active,
        last_login_at,
        archived_at,
        archived_by,
        removal_reason,
        original_created_at,
        original_updated_at,
        assigned_locations
    ) VALUES (
        v_user_data.id,
        v_user_data.email,
        v_user_data.first_name,
        v_user_data.last_name,
        v_user_data.phone,
        v_user_data.business_id,
        v_user_data.role_id,
        v_user_data.default_location_id,
        false,
        v_user_data.last_login_at,
        CURRENT_TIMESTAMP,
        v_current_user_id,
        p_removal_reason,
        v_user_data.created_at,
        v_user_data.updated_at,
        v_locations
    );
    
    -- Delete user locations
    DELETE FROM user_locations WHERE user_id = p_user_id;
    
    -- Delete user sessions
    DELETE FROM user_sessions WHERE user_id = p_user_id;
    
    -- Delete from user_details
    DELETE FROM user_details WHERE id = p_user_id;
    
    -- Note: Deleting from auth.users requires service_role
    -- This should be done via an Edge Function or Admin API call
    -- For now, we just mark the user as deleted in our tables
    
    RETURN JSONB_BUILD_OBJECT(
        'success', true,
        'message', 'User archived successfully',
        'archived_user_id', p_user_id
    );
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error archiving user: %', SQLERRM;
END;
$$;


ALTER FUNCTION "public"."archive_and_remove_user"("p_user_id" "uuid", "p_removal_reason" "text") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."archive_and_remove_user"("p_user_id" "uuid", "p_removal_reason" "text") IS 'Archives a user and removes them from active tables';



CREATE OR REPLACE FUNCTION "public"."audit_trigger_func"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    old_data JSONB;
    new_data JSONB;
    changed_fields TEXT[] := ARRAY[]::TEXT[];
BEGIN
    IF TG_OP = 'DELETE' THEN
        old_data := to_jsonb(OLD);
        INSERT INTO public.audit_log (
            table_name, record_id, action, old_data, user_id
        ) VALUES (
            TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
            OLD.id::TEXT,
            TG_OP,
            old_data,
            current_setting('app.current_user_id', TRUE)::UUID
        );
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        old_data := to_jsonb(OLD);
        new_data := to_jsonb(NEW);
        
        -- Detect changed fields
        SELECT array_agg(key) INTO changed_fields
        FROM jsonb_each(old_data)
        WHERE value IS DISTINCT FROM new_data->key;
        
        INSERT INTO public.audit_log (
            table_name, record_id, action, old_data, new_data, changed_fields, user_id
        ) VALUES (
            TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
            NEW.id::TEXT,
            TG_OP,
            old_data,
            new_data,
            changed_fields,
            current_setting('app.current_user_id', TRUE)::UUID
        );
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        new_data := to_jsonb(NEW);
        INSERT INTO public.audit_log (
            table_name, record_id, action, new_data, user_id
        ) VALUES (
            TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
            NEW.id::TEXT,
            TG_OP,
            new_data,
            current_setting('app.current_user_id', TRUE)::UUID
        );
        RETURN NEW;
    END IF;
END;
$$;


ALTER FUNCTION "public"."audit_trigger_func"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."audit_trigger_func"() IS 'Función genérica de auditoría para cambios en tablas críticas';



CREATE OR REPLACE FUNCTION "public"."auto_assign_business_id"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  IF NEW.business_id IS NULL THEN
    NEW.business_id := public.get_user_business_id();
  END IF;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."auto_assign_business_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_low_stock"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Verificar si el stock está por debajo del mínimo
    IF NEW.quantity_available <= NEW.min_stock_level AND NEW.is_tracked = true THEN
        -- Insertar alerta si no existe una activa
        INSERT INTO stock_alerts (
            inventory_id,
            alert_type,
            current_quantity,
            threshold_quantity,
            status
        )
        SELECT 
            NEW.id,
            CASE 
                WHEN NEW.quantity_available = 0 THEN 'out_of_stock'
                WHEN NEW.reorder_point IS NOT NULL AND NEW.quantity_available <= NEW.reorder_point THEN 'reorder_point'
                ELSE 'low_stock'
            END,
            NEW.quantity_available,
            NEW.min_stock_level,
            'active'
        WHERE NOT EXISTS (
            SELECT 1 FROM stock_alerts
            WHERE inventory_id = NEW.id
            AND status = 'active'
        );
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."check_low_stock"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."check_low_stock"() IS 'Genera alertas automáticas cuando el stock está bajo el mínimo';



CREATE OR REPLACE FUNCTION "public"."check_monthly_quote_limit"("p_business_id" integer) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_year_month VARCHAR(7);
    v_usage RECORD;
    v_plan RECORD;
    v_allowed BOOLEAN;
    v_reason TEXT;
BEGIN
    v_year_month := TO_CHAR(CURRENT_DATE, 'YYYY-MM');
    
    -- Obtener plan del negocio
    SELECT sp.* INTO v_plan
    FROM public.businesses b
    JOIN public.subscription_plans sp ON sp.id = b.subscription_plan_id
    WHERE b.id = p_business_id;
    
    -- Si no tiene plan o WhatsApp no está habilitado
    IF NOT FOUND OR NOT v_plan.whatsapp_enabled THEN
        RETURN JSONB_BUILD_OBJECT(
            'allowed', false,
            'reason', 'whatsapp_not_enabled',
            'message', 'Tu plan no incluye WhatsApp. Actualiza tu plan para usar esta función.'
        );
    END IF;
    
    -- Si es ilimitado
    IF v_plan.monthly_quote_limit = -1 THEN
        RETURN JSONB_BUILD_OBJECT(
            'allowed', true,
            'reason', 'unlimited',
            'quotes_used', 0,
            'quotes_limit', -1
        );
    END IF;
    
    -- Obtener o crear registro de uso mensual
    INSERT INTO public.quote_usage_monthly (
        business_id, year_month, quotes_limit, overage_price_per_quote, allow_overage
    ) VALUES (
        p_business_id, v_year_month, v_plan.monthly_quote_limit, 
        v_plan.overage_price_per_quote, v_plan.allow_overage
    )
    ON CONFLICT (business_id, year_month) DO NOTHING;
    
    SELECT * INTO v_usage
    FROM public.quote_usage_monthly
    WHERE business_id = p_business_id AND year_month = v_year_month;
    
    -- Verificar límite
    IF v_usage.quotes_used < v_usage.quotes_limit THEN
        v_allowed := true;
        v_reason := 'within_limit';
    ELSIF v_usage.allow_overage THEN
        v_allowed := true;
        v_reason := 'overage_allowed';
    ELSE
        v_allowed := false;
        v_reason := 'limit_reached';
    END IF;
    
    RETURN JSONB_BUILD_OBJECT(
        'allowed', v_allowed,
        'reason', v_reason,
        'quotes_used', v_usage.quotes_used,
        'quotes_limit', v_usage.quotes_limit,
        'overage_quotes', v_usage.overage_quotes,
        'overage_amount', v_usage.overage_amount,
        'allow_overage', v_usage.allow_overage,
        'overage_price', v_usage.overage_price_per_quote,
        'message', CASE 
            WHEN v_reason = 'limit_reached' THEN 
                'Has alcanzado tu límite mensual de cotizaciones. Activa los excedentes o actualiza tu plan.'
            WHEN v_reason = 'overage_allowed' THEN
                'Has excedido tu límite. Se aplicará un cargo adicional por esta cotización.'
            ELSE NULL
        END
    );
END;
$$;


ALTER FUNCTION "public"."check_monthly_quote_limit"("p_business_id" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."check_monthly_quote_limit"("p_business_id" integer) IS 'Verifica si un negocio puede crear más cotizaciones este mes';



CREATE OR REPLACE FUNCTION "public"."check_plan_limit"("p_business_id" integer, "p_resource_type" character varying, "p_current_count" integer DEFAULT NULL::integer) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  v_limit INTEGER;
  v_count INTEGER;
BEGIN
  -- Get limit based on plan
  SELECT
    CASE p_resource_type
      WHEN 'users' THEN sp.max_users
      WHEN 'locations' THEN sp.max_locations
      WHEN 'products' THEN sp.max_products
      ELSE -1
    END INTO v_limit
  FROM public.businesses b
  JOIN public.subscription_plans sp ON sp.id = b.plan_id
  WHERE b.id = p_business_id;

  -- -1 means unlimited
  IF v_limit = -1 THEN
    RETURN true;
  END IF;

  -- Get current count if not provided
  IF p_current_count IS NULL THEN
    CASE p_resource_type
      WHEN 'users' THEN
        SELECT COUNT(*) INTO v_count FROM public.user_details WHERE business_id = p_business_id;
      WHEN 'locations' THEN
        SELECT COUNT(*) INTO v_count FROM public.locations WHERE business_id = p_business_id AND deleted_at IS NULL;
      WHEN 'products' THEN
        SELECT COUNT(*) INTO v_count FROM public.products WHERE business_id = p_business_id AND deleted_at IS NULL;
      ELSE
        v_count := 0;
    END CASE;
  ELSE
    v_count := p_current_count;
  END IF;

  RETURN v_count < v_limit;
END;
$$;


ALTER FUNCTION "public"."check_plan_limit"("p_business_id" integer, "p_resource_type" character varying, "p_current_count" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_quote_automation_limit"("p_business_id" integer, "p_customer_phone" character varying DEFAULT NULL::character varying, "p_customer_email" character varying DEFAULT NULL::character varying) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_limit INTEGER;
    v_count INTEGER;
    v_allowed BOOLEAN;
BEGIN
    -- Get the daily limit for this business
    SELECT COALESCE(daily_quote_limit, 3) INTO v_limit
    FROM public.quote_automation_settings
    WHERE business_id = p_business_id;
    
    IF v_limit IS NULL THEN
        v_limit := 3; -- Default limit
    END IF;
    
    -- Count quotes created today for this customer
    SELECT COUNT(*) INTO v_count
    FROM public.quote_conversation_sessions
    WHERE business_id = p_business_id
        AND status = 'completed'
        AND quote_id IS NOT NULL
        AND created_at >= CURRENT_DATE
        AND (
            (p_customer_phone IS NOT NULL AND customer_phone = p_customer_phone)
            OR (p_customer_email IS NOT NULL AND customer_email = p_customer_email)
        );
    
    v_allowed := v_count < v_limit;
    
    RETURN JSONB_BUILD_OBJECT(
        'allowed', v_allowed,
        'current_count', v_count,
        'daily_limit', v_limit,
        'remaining', GREATEST(0, v_limit - v_count)
    );
END;
$$;


ALTER FUNCTION "public"."check_quote_automation_limit"("p_business_id" integer, "p_customer_phone" character varying, "p_customer_email" character varying) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."check_quote_automation_limit"("p_business_id" integer, "p_customer_phone" character varying, "p_customer_email" character varying) IS 'Checks if a customer has exceeded their daily quote limit';



CREATE OR REPLACE FUNCTION "public"."cleanup_expired_quote_sessions"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_count INTEGER;
BEGIN
    UPDATE public.quote_conversation_sessions
    SET status = 'expired',
        updated_at = NOW()
    WHERE status = 'active'
        AND expires_at < NOW();
    
    GET DIAGNOSTICS v_count = ROW_COUNT;
    RETURN v_count;
END;
$$;


ALTER FUNCTION "public"."cleanup_expired_quote_sessions"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."cleanup_expired_quote_sessions"() IS 'Marks expired conversation sessions as expired';



CREATE OR REPLACE FUNCTION "public"."cleanup_orphan_auth_users"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
  rec RECORD;
  v_exists boolean;
BEGIN
  FOR rec IN SELECT id FROM public.user_details_archive LOOP
    -- check existence in active details
    SELECT EXISTS(SELECT 1 FROM public.user_details ud WHERE ud.id = rec.id) INTO v_exists;
    IF NOT v_exists THEN
      -- attempt delete from auth.users
      BEGIN
        DELETE FROM auth.users u WHERE u.id = rec.id;
        IF FOUND THEN
          INSERT INTO public.user_cleanup_audit(user_id, details) VALUES (rec.id, jsonb_build_object('source','user_details_archive'));
        END IF;
      EXCEPTION WHEN OTHERS THEN
        -- log failure in audit table
        INSERT INTO public.user_cleanup_audit(user_id, details) VALUES (rec.id, jsonb_build_object('error', SQLERRM));
      END;
    END IF;
  END LOOP;
END;
$$;


ALTER FUNCTION "public"."cleanup_orphan_auth_users"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."delete_expired_notifications"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.notifications
    WHERE expires_at IS NOT NULL 
    AND expires_at < CURRENT_TIMESTAMP;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;


ALTER FUNCTION "public"."delete_expired_notifications"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."delete_expired_notifications"() IS 'Deletes notifications that have passed their expiration date';



CREATE OR REPLACE FUNCTION "public"."ensure_single_main_location"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- If setting a location as main (main_location = 1)
    IF NEW.main_location = 1 THEN
        -- Set all other locations for this business to NULL
        UPDATE public.locations
        SET main_location = NULL
        WHERE business_id = NEW.business_id
          AND id != NEW.id
          AND main_location = 1;
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."ensure_single_main_location"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."find_customer_by_phone"("p_business_id" integer, "p_phone" character varying) RETURNS TABLE("id" integer, "customer_number" character varying, "first_name" character varying, "last_name" character varying, "business_name" character varying, "email" character varying, "phone" character varying)
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
    SELECT 
        c.id,
        c.customer_number,
        c.first_name,
        c.last_name,
        c.business_name,
        c.email,
        c.phone
    FROM public.customers c
    WHERE c.business_id = p_business_id
        AND c.is_active = true
        AND c.deleted_at IS NULL
        AND (
            c.phone = p_phone 
            OR c.mobile = p_phone
            OR c.phone = REPLACE(REPLACE(REPLACE(p_phone, '+', ''), '-', ''), ' ', '')
            OR c.mobile = REPLACE(REPLACE(REPLACE(p_phone, '+', ''), '-', ''), ' ', '')
        )
    LIMIT 1;
$$;


ALTER FUNCTION "public"."find_customer_by_phone"("p_business_id" integer, "p_phone" character varying) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."find_customer_by_phone"("p_business_id" integer, "p_phone" character varying) IS 'Finds an existing customer by phone number';



CREATE OR REPLACE FUNCTION "public"."generate_shift_number"("p_cash_register_id" bigint) RETURNS character varying
    LANGUAGE "plpgsql"
    AS $_$
DECLARE
    v_code VARCHAR(20);
    v_date VARCHAR(8);
    v_sequence INT;
    v_shift_number VARCHAR(30);
BEGIN
    -- Get cash register code
    SELECT code INTO v_code
    FROM public.cash_registers
    WHERE id = p_cash_register_id;
    
    -- Get current date in YYYYMMDD format
    v_date := TO_CHAR(CURRENT_DATE, 'YYYYMMDD');
    
    -- Get next sequence number for this register and date
    SELECT COALESCE(MAX(
        CAST(SUBSTRING(shift_number FROM '[0-9]+$') AS INT)
    ), 0) + 1
    INTO v_sequence
    FROM public.cash_register_shifts
    WHERE cash_register_id = p_cash_register_id
    AND shift_number LIKE v_code || '-' || v_date || '%';
    
    -- Format: CAJA-20231127-001
    v_shift_number := v_code || '-' || v_date || '-' || LPAD(v_sequence::TEXT, 3, '0');
    
    RETURN v_shift_number;
END;
$_$;


ALTER FUNCTION "public"."generate_shift_number"("p_cash_register_id" bigint) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."generate_transfer_number"("p_business_id" integer) RETURNS character varying
    LANGUAGE "plpgsql"
    AS $_$
DECLARE
    v_date VARCHAR(8);
    v_sequence INT;
    v_transfer_number VARCHAR(20);
BEGIN
    -- Get current date in YYYYMMDD format
    v_date := TO_CHAR(CURRENT_DATE, 'YYYYMMDD');
    
    -- Get next sequence number for this business and date
    SELECT COALESCE(MAX(
        CAST(SUBSTRING(transfer_number FROM '[0-9]+$') AS INT)
    ), 0) + 1
    INTO v_sequence
    FROM public.inventory_transfers
    WHERE business_id = p_business_id
    AND transfer_number LIKE 'TRF-' || v_date || '%';
    
    -- Format: TRF-20231127-001
    v_transfer_number := 'TRF-' || v_date || '-' || LPAD(v_sequence::TEXT, 3, '0');
    
    RETURN v_transfer_number;
END;
$_$;


ALTER FUNCTION "public"."generate_transfer_number"("p_business_id" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."generate_transfer_number"("p_business_id" integer) IS 'Generates unique transfer number in format TRF-YYYYMMDD-NNN';



CREATE OR REPLACE FUNCTION "public"."get_archived_users"("p_business_id" integer DEFAULT NULL::integer) RETURNS TABLE("id" "uuid", "email" character varying, "first_name" character varying, "last_name" character varying, "phone" character varying, "role_name" character varying, "archived_at" timestamp with time zone, "archived_by_email" character varying, "removal_reason" "text", "assigned_locations" "jsonb", "original_created_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        a.id,
        a.email,
        a.first_name,
        a.last_name,
        a.phone,
        r.name as role_name,
        a.archived_at,
        u.email as archived_by_email,
        a.removal_reason,
        a.assigned_locations,
        a.original_created_at
    FROM user_details_archive a
    LEFT JOIN roles r ON r.id = a.role_id
    LEFT JOIN user_details u ON u.id = a.archived_by
    WHERE a.business_id = COALESCE(p_business_id, get_user_business_id())
    ORDER BY a.archived_at DESC;
END;
$$;


ALTER FUNCTION "public"."get_archived_users"("p_business_id" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_archived_users"("p_business_id" integer) IS 'Retrieves archived users for a business';



CREATE OR REPLACE FUNCTION "public"."get_business_by_evolution_instance"("p_instance_name" "text") RETURNS TABLE("business_id" integer, "business_name" "text", "subscription_plan_id" integer, "plan_name" "text", "whatsapp_enabled" boolean, "monthly_quote_limit" integer, "ai_provider" "text", "ai_model" "text", "ai_temperature" numeric, "system_prompt" "text", "greeting_message" "text", "is_enabled" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        b.id::INTEGER as business_id,
        b.name::TEXT as business_name,
        sp.id::INTEGER as subscription_plan_id,
        sp.name::TEXT as plan_name,
        COALESCE(sp.whatsapp_enabled, false) as whatsapp_enabled,
        COALESCE(sp.monthly_quote_limit, 0)::INTEGER as monthly_quote_limit,
        COALESCE(qas.ai_provider, 'openai')::TEXT as ai_provider,
        COALESCE(qas.ai_model, 'gpt-4-turbo')::TEXT as ai_model,
        COALESCE(qas.ai_temperature, 0.7) as ai_temperature,
        qas.system_prompt::TEXT as system_prompt,
        COALESCE(qas.greeting_message, 'Hola! ¿En qué puedo ayudarte?')::TEXT as greeting_message,
        COALESCE(qas.is_enabled, false) as is_enabled
    FROM whatsapp_numbers wn
    JOIN businesses b ON b.id = wn.business_id
    JOIN subscription_plans sp ON sp.id = b.subscription_plan_id
    LEFT JOIN quote_automation_settings qas ON qas.business_id = b.id
    WHERE wn.evolution_instance_name = p_instance_name
      AND wn.is_active = true
    LIMIT 1;
END;
$$;


ALTER FUNCTION "public"."get_business_by_evolution_instance"("p_instance_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_business_by_whatsapp_number"("p_whatsapp_number" "text") RETURNS TABLE("business_id" integer, "business_name" "text", "subscription_plan_id" integer, "plan_name" "text", "whatsapp_enabled" boolean, "monthly_quote_limit" integer, "ai_provider" "text", "ai_model" "text", "ai_temperature" numeric, "system_prompt" "text", "greeting_message" "text", "is_enabled" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        b.id::INTEGER as business_id,
        b.name::TEXT as business_name,
        sp.id::INTEGER as subscription_plan_id,
        sp.name::TEXT as plan_name,
        COALESCE(sp.whatsapp_enabled, false) as whatsapp_enabled,
        COALESCE(sp.monthly_quote_limit, 0)::INTEGER as monthly_quote_limit,
        COALESCE(qas.ai_provider, 'openai')::TEXT as ai_provider,
        COALESCE(qas.ai_model, 'gpt-4-turbo')::TEXT as ai_model,
        COALESCE(qas.ai_temperature, 0.7) as ai_temperature,
        qas.system_prompt::TEXT as system_prompt,
        COALESCE(qas.greeting_message, 'Hola! ¿En qué puedo ayudarte?')::TEXT as greeting_message,
        COALESCE(qas.is_enabled, false) as is_enabled
    FROM whatsapp_numbers wn
    JOIN businesses b ON b.id = wn.business_id
    JOIN subscription_plans sp ON sp.id = b.subscription_plan_id
    LEFT JOIN quote_automation_settings qas ON qas.business_id = b.id
    WHERE wn.phone_number = p_whatsapp_number
      AND wn.is_active = true
    LIMIT 1;
END;
$$;


ALTER FUNCTION "public"."get_business_by_whatsapp_number"("p_whatsapp_number" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_business_by_whatsapp_number"("p_whatsapp_number" character varying) RETURNS TABLE("business_id" integer, "business_name" character varying, "subscription_plan_id" integer, "plan_name" character varying, "whatsapp_enabled" boolean, "monthly_quote_limit" integer, "ai_provider" character varying, "ai_model" character varying, "ai_temperature" numeric, "system_prompt" "text", "greeting_message" "text", "is_enabled" boolean)
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
    SELECT 
        b.id as business_id,
        b.name as business_name,
        b.subscription_plan_id,
        sp.name as plan_name,
        sp.whatsapp_enabled,
        sp.monthly_quote_limit,
        COALESCE(s.ai_provider, 'claude') as ai_provider,
        COALESCE(s.ai_model, 'claude-3-sonnet-20240229') as ai_model,
        COALESCE(s.ai_temperature, 0.7) as ai_temperature,
        s.system_prompt,
        COALESCE(s.greeting_message, 'Hola! Soy tu asistente de cotizaciones.') as greeting_message,
        COALESCE(s.is_enabled, false) as is_enabled
    FROM public.whatsapp_numbers w
    JOIN public.businesses b ON b.id = w.business_id
    JOIN public.subscription_plans sp ON sp.id = b.subscription_plan_id
    LEFT JOIN public.quote_automation_settings s ON s.business_id = b.id
    WHERE w.phone_number = p_whatsapp_number
        AND w.is_active = true
        AND w.is_verified = true
        AND sp.whatsapp_enabled = true
    LIMIT 1;
$$;


ALTER FUNCTION "public"."get_business_by_whatsapp_number"("p_whatsapp_number" character varying) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_business_by_whatsapp_number"("p_whatsapp_number" character varying) IS 'Identifica qué negocio corresponde a un número de WhatsApp entrante';



CREATE OR REPLACE FUNCTION "public"."get_business_whatsapp_number"("p_business_id" integer) RETURNS TABLE("phone_number" character varying, "is_verified" boolean)
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
    SELECT phone_number, is_verified
    FROM public.whatsapp_numbers
    WHERE business_id = p_business_id
        AND is_active = true
    LIMIT 1;
$$;


ALTER FUNCTION "public"."get_business_whatsapp_number"("p_business_id" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_business_whatsapp_number"("p_business_id" integer) IS 'Obtiene el número WhatsApp asignado a un negocio';



CREATE OR REPLACE FUNCTION "public"."get_enabled_payment_methods"("p_business_id" integer) RETURNS TABLE("method_id" integer, "method_code" character varying, "method_name" character varying, "method_type" character varying, "config" "jsonb", "display_order" integer)
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  SELECT 
    pm.id AS method_id,
    pm.code AS method_code,
    pm.name AS method_name,
    pm.type AS method_type,
    bps.config,
    bps.display_order
  FROM public.payment_methods pm
  INNER JOIN public.business_payment_settings bps 
    ON bps.payment_method_id = pm.id
  WHERE bps.business_id = p_business_id
    AND bps.is_enabled = true
    AND pm.is_active = true
  ORDER BY bps.display_order, pm.name;
$$;


ALTER FUNCTION "public"."get_enabled_payment_methods"("p_business_id" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_enabled_payment_methods"("p_business_id" integer) IS 'Returns enabled payment methods for a business with their configuration';



CREATE OR REPLACE FUNCTION "public"."get_main_location"("p_business_id" integer) RETURNS TABLE("id" integer, "code" character varying, "name" character varying, "address" "text", "city" character varying, "state" character varying, "postal_code" character varying, "country" character varying, "phone" character varying, "email" character varying)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        l.id,
        l.code,
        l.name,
        l.address,
        l.city,
        l.state,
        l.postal_code,
        l.country,
        l.phone,
        l.email
    FROM public.locations l
    WHERE l.business_id = p_business_id
      AND l.main_location = 1
      AND l.deleted_at IS NULL
    LIMIT 1;
END;
$$;


ALTER FUNCTION "public"."get_main_location"("p_business_id" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_main_location"("p_business_id" integer) IS 'Returns the main/primary location for a business';



CREATE OR REPLACE FUNCTION "public"."get_notification_preferences"("p_user_id" "uuid") RETURNS TABLE("channels" "jsonb", "events" "jsonb")
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
  -- Try to get user-specific settings first
  SELECT channels, events
  FROM public.notification_settings
  WHERE business_id = public.get_user_business_id()
    AND user_id = p_user_id
  
  UNION ALL
  
  -- Fall back to business defaults if no user-specific settings
  SELECT channels, events
  FROM public.notification_settings
  WHERE business_id = public.get_user_business_id()
    AND user_id IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM public.notification_settings
      WHERE business_id = public.get_user_business_id()
        AND user_id = p_user_id
    )
  
  LIMIT 1;
$$;


ALTER FUNCTION "public"."get_notification_preferences"("p_user_id" "uuid") OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_notification_preferences"("p_user_id" "uuid") IS 'Gets user notification preferences or business defaults';



CREATE OR REPLACE FUNCTION "public"."get_twilio_webhook_url"("p_business_id" integer) RETURNS "text"
    LANGUAGE "sql" SECURITY DEFINER
    AS $$
    SELECT twilio_webhook_url
    FROM public.quote_automation_settings
    WHERE business_id = p_business_id;
$$;


ALTER FUNCTION "public"."get_twilio_webhook_url"("p_business_id" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."get_twilio_webhook_url"("p_business_id" integer) IS 'Returns the webhook URL for Twilio configuration';



CREATE OR REPLACE FUNCTION "public"."get_user_business_id"() RETURNS integer
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    AS $$
DECLARE
  v_business_id INTEGER;
BEGIN
  SELECT business_id INTO v_business_id
  FROM public.user_details
  WHERE id = auth.uid();

  RETURN v_business_id;
END;
$$;


ALTER FUNCTION "public"."get_user_business_id"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."handle_new_user"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."handle_new_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."increment_product_sale_frequency"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.products
        SET sale_frequency = sale_frequency + NEW.quantity
        WHERE id = NEW.product_id;
    END IF;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."increment_product_sale_frequency"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."increment_product_sale_frequency"() IS 'Increments product sale frequency counter when sold';



CREATE OR REPLACE FUNCTION "public"."increment_quote_usage"("p_business_id" integer) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_year_month VARCHAR(7);
    v_usage RECORD;
    v_is_overage BOOLEAN;
BEGIN
    v_year_month := TO_CHAR(CURRENT_DATE, 'YYYY-MM');
    
    -- Actualizar contador
    UPDATE public.quote_usage_monthly
    SET 
        quotes_used = quotes_used + 1,
        overage_quotes = CASE 
            WHEN quotes_used >= quotes_limit AND quotes_limit > 0 
            THEN overage_quotes + 1 
            ELSE overage_quotes 
        END,
        overage_amount = CASE 
            WHEN quotes_used >= quotes_limit AND quotes_limit > 0 
            THEN overage_amount + overage_price_per_quote
            ELSE overage_amount 
        END,
        updated_at = NOW()
    WHERE business_id = p_business_id AND year_month = v_year_month
    RETURNING * INTO v_usage;
    
    v_is_overage := v_usage.quotes_used > v_usage.quotes_limit AND v_usage.quotes_limit > 0;
    
    RETURN JSONB_BUILD_OBJECT(
        'success', true,
        'quotes_used', v_usage.quotes_used,
        'quotes_limit', v_usage.quotes_limit,
        'is_overage', v_is_overage,
        'overage_quotes', v_usage.overage_quotes,
        'overage_amount', v_usage.overage_amount
    );
END;
$$;


ALTER FUNCTION "public"."increment_quote_usage"("p_business_id" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."increment_quote_usage"("p_business_id" integer) IS 'Incrementa el contador de cotizaciones usadas';



CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM user_details
    WHERE id = auth.uid()
      AND role_id IN (
        SELECT id FROM roles WHERE name IN ('Admin', 'Owner')
      )
  );
END;
$$;


ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_inventory_movement"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Solo registrar si cambió la cantidad disponible
    IF TG_OP = 'UPDATE' AND OLD.quantity_available != NEW.quantity_available THEN
        INSERT INTO inventory_movements (
            inventory_id,
            movement_type,
            quantity,
            quantity_before,
            quantity_after,
            notes
        ) VALUES (
            NEW.id,
            'adjustment', -- Tipo genérico, puede ser actualizado por la aplicación
            NEW.quantity_available - OLD.quantity_available,
            OLD.quantity_available,
            NEW.quantity_available,
            'Automatic inventory update'
        );
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."log_inventory_movement"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."log_inventory_movement"() IS 'Registra movimientos de inventario automáticamente';



CREATE OR REPLACE FUNCTION "public"."refresh_all_materialized_views"() RETURNS "void"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_sales_by_location;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_top_selling_products;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_inventory_valuation;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_seller_performance;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_customer_analysis;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_quote_conversion_rate;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_ticket_metrics;
END;
$$;


ALTER FUNCTION "public"."refresh_all_materialized_views"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."refresh_all_materialized_views"() IS 'Refresca todas las vistas materializadas del sistema';



CREATE OR REPLACE FUNCTION "public"."refresh_sales_analytics"() RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_daily_sales_by_location;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_top_selling_products;
END;
$$;


ALTER FUNCTION "public"."refresh_sales_analytics"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."refresh_sales_analytics"() IS 'Refreshes all sales analytics materialized views. Should be called periodically (e.g., hourly) via cron job.';



CREATE OR REPLACE FUNCTION "public"."search_products_with_inventory"("p_search_term" "text", "p_location_id" integer) RETURNS TABLE("product_id" integer, "product_name" character varying, "product_sku" character varying, "product_barcode" character varying, "product_description" "text", "category_id" integer, "category_name" character varying, "selling_price" numeric, "cost_price" numeric, "tax_rate" numeric, "is_taxable" boolean, "image_url" "text", "unit_of_measure" character varying, "available_stock" numeric, "inventory_id" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
  DECLARE
      v_business_id INTEGER;
  BEGIN
      v_business_id := get_user_business_id();

      RETURN QUERY
      SELECT
          p.id AS product_id,
          p.name AS product_name,
          p.sku AS product_sku,
          p.barcode AS product_barcode,
          p.description AS product_description,
          p.category_id,
          c.name AS category_name,
          p.selling_price,
          p.cost_price,
          p.tax_rate,
          p.is_taxable,
          p.image_url,
          p.unit_of_measure,
          COALESCE(i.quantity_available, 0) AS available_stock,
          i.id AS inventory_id
      FROM products p
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN inventory i ON i.product_id = p.id AND i.location_id = p_location_id
      WHERE p.business_id = v_business_id
        AND p.is_active = true
        AND p.deleted_at IS NULL
        AND (
            p.name ILIKE '%' || p_search_term || '%'
            OR p.sku ILIKE '%' || p_search_term || '%'
            OR p.barcode ILIKE '%' || p_search_term || '%'
        )
      ORDER BY
          CASE
              WHEN p.sku ILIKE p_search_term THEN 1
              WHEN p.barcode ILIKE p_search_term THEN 2
              WHEN p.name ILIKE p_search_term || '%' THEN 3
              ELSE 4
          END,
          p.name
      LIMIT 20;
  END;
  $$;


ALTER FUNCTION "public"."search_products_with_inventory"("p_search_term" "text", "p_location_id" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_user_email"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
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


ALTER FUNCTION "public"."sync_user_email"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_inventory_on_sale"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    -- Actualizar inventario cuando se inserta un item de venta
    IF TG_OP = 'INSERT' THEN
        UPDATE inventory
        SET quantity_available = quantity_available - NEW.quantity
        WHERE product_id = NEW.product_id
        AND location_id = (
            SELECT location_id FROM sales WHERE id = NEW.sale_id
        );
        
        -- Registrar movimiento
        INSERT INTO inventory_movements (
            inventory_id,
            movement_type,
            quantity,
            quantity_before,
            quantity_after,
            reference_type,
            reference_id
        )
        SELECT 
            i.id,
            'sale',
            -NEW.quantity,
            i.quantity_available + NEW.quantity,
            i.quantity_available,
            'sale',
            NEW.sale_id
        FROM inventory i
        WHERE i.product_id = NEW.product_id
        AND i.location_id = (SELECT location_id FROM sales WHERE id = NEW.sale_id);
    END IF;
    
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_inventory_on_sale"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_inventory_on_sale"() IS 'Actualiza inventario automáticamente al registrar una venta';



CREATE OR REPLACE FUNCTION "public"."update_notification_preferences_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_notification_preferences_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_purchase_order_totals"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    UPDATE purchase_orders
    SET 
        subtotal = (
            SELECT COALESCE(SUM(line_total), 0)
            FROM purchase_order_items
            WHERE purchase_order_id = COALESCE(NEW.purchase_order_id, OLD.purchase_order_id)
        ),
        tax_amount = (
            SELECT COALESCE(SUM(line_total * tax_rate / 100), 0)
            FROM purchase_order_items
            WHERE purchase_order_id = COALESCE(NEW.purchase_order_id, OLD.purchase_order_id)
        ),
        total_amount = (
            SELECT COALESCE(SUM(line_total * (1 + tax_rate / 100)), 0)
            FROM purchase_order_items
            WHERE purchase_order_id = COALESCE(NEW.purchase_order_id, OLD.purchase_order_id)
        ) + COALESCE((SELECT shipping_cost FROM purchase_orders WHERE id = COALESCE(NEW.purchase_order_id, OLD.purchase_order_id)), 0)
    WHERE id = COALESCE(NEW.purchase_order_id, OLD.purchase_order_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$;


ALTER FUNCTION "public"."update_purchase_order_totals"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_purchase_order_totals"() IS 'Actualiza totales de orden de compra automáticamente';



CREATE OR REPLACE FUNCTION "public"."update_quote_totals"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
  BEGIN
      UPDATE quotes
      SET
          subtotal = (
              SELECT COALESCE(SUM(subtotal), 0)
              FROM quote_items
              WHERE quote_id = COALESCE(NEW.quote_id, OLD.quote_id)
          ),
          discount_amount = (
              SELECT COALESCE(SUM(discount_amount), 0)
              FROM quote_items
              WHERE quote_id = COALESCE(NEW.quote_id, OLD.quote_id)
          ),
          tax_amount = (
              SELECT COALESCE(SUM(tax_amount), 0)
              FROM quote_items
              WHERE quote_id = COALESCE(NEW.quote_id, OLD.quote_id)
          ),
          total_amount = (
              SELECT COALESCE(SUM(subtotal - discount_amount + tax_amount), 0)
              FROM quote_items
              WHERE quote_id = COALESCE(NEW.quote_id, OLD.quote_id)
          ),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = COALESCE(NEW.quote_id, OLD.quote_id);

      RETURN COALESCE(NEW, OLD);
  END;
  $$;


ALTER FUNCTION "public"."update_quote_totals"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_quote_totals"() IS 'Actualiza totales de cotización automáticamente';



CREATE OR REPLACE FUNCTION "public"."update_sale_totals_correct"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
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
$$;


ALTER FUNCTION "public"."update_sale_totals_correct"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_sale_totals_correct"() IS 'Función para recalcular totales de venta CORRECTAMENTE (actualmente sin trigger asociado)';



CREATE OR REPLACE FUNCTION "public"."update_transfer_timestamp"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_transfer_timestamp"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";


COMMENT ON FUNCTION "public"."update_updated_at_column"() IS 'Actualiza automáticamente el campo updated_at';



CREATE OR REPLACE FUNCTION "public"."user_belongs_to_business"("p_business_id" integer) RETURNS boolean
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_details
    WHERE id = auth.uid()
    AND business_id = p_business_id
  );
END;
$$;


ALTER FUNCTION "public"."user_belongs_to_business"("p_business_id" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."verify_twilio_whatsapp"("p_business_id" integer) RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    UPDATE public.quote_automation_settings
    SET 
        twilio_verified = true,
        twilio_verified_at = NOW(),
        updated_at = NOW()
    WHERE business_id = p_business_id
        AND twilio_account_sid IS NOT NULL
        AND twilio_auth_token_encrypted IS NOT NULL
        AND twilio_whatsapp_number IS NOT NULL;
    
    RETURN FOUND;
END;
$$;


ALTER FUNCTION "public"."verify_twilio_whatsapp"("p_business_id" integer) OWNER TO "postgres";


COMMENT ON FUNCTION "public"."verify_twilio_whatsapp"("p_business_id" integer) IS 'Marks Twilio configuration as verified after successful test';


SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."audit_log" (
    "id" bigint NOT NULL,
    "table_name" character varying(100) NOT NULL,
    "record_id" character varying(100) NOT NULL,
    "action" character varying(20) NOT NULL,
    "old_data" "jsonb",
    "new_data" "jsonb",
    "changed_fields" "text"[],
    "user_id" "uuid",
    "user_ip" "inet",
    "session_id" "uuid",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."audit_log" OWNER TO "postgres";


COMMENT ON TABLE "public"."audit_log" IS 'Auditoría general de cambios en tablas críticas';



COMMENT ON COLUMN "public"."audit_log"."action" IS 'Tipo de acción: INSERT, UPDATE, DELETE';



CREATE SEQUENCE IF NOT EXISTS "public"."audit_log_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."audit_log_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."audit_log_id_seq" OWNED BY "public"."audit_log"."id";



CREATE TABLE IF NOT EXISTS "public"."business_payment_settings" (
    "id" integer NOT NULL,
    "business_id" integer NOT NULL,
    "payment_method_id" integer NOT NULL,
    "is_enabled" boolean DEFAULT false NOT NULL,
    "config" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "display_order" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."business_payment_settings" OWNER TO "postgres";


COMMENT ON TABLE "public"."business_payment_settings" IS 'Per-business configuration of payment methods';



COMMENT ON COLUMN "public"."business_payment_settings"."config" IS 'Method-specific settings in JSONB: processor details, fees, terminal config, etc.';



COMMENT ON COLUMN "public"."business_payment_settings"."display_order" IS 'Order to display payment methods in UI';



CREATE SEQUENCE IF NOT EXISTS "public"."business_payment_settings_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."business_payment_settings_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."business_payment_settings_id_seq" OWNED BY "public"."business_payment_settings"."id";



CREATE TABLE IF NOT EXISTS "public"."businesses" (
    "id" integer NOT NULL,
    "name" character varying(255) NOT NULL,
    "legal_name" character varying(255),
    "tax_id" character varying(50),
    "owner_id" "uuid" NOT NULL,
    "plan_id" integer DEFAULT 1,
    "business_type" character varying(100),
    "logo_url" "text",
    "website" character varying(255),
    "currency" character varying(3) DEFAULT 'MXN'::character varying,
    "is_active" boolean DEFAULT true,
    "trial_ends_at" timestamp with time zone,
    "subscription_starts_at" timestamp with time zone,
    "subscription_ends_at" timestamp with time zone,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "deleted_at" timestamp with time zone,
    "subscription_plan_id" integer
);


ALTER TABLE "public"."businesses" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."businesses_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."businesses_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."businesses_id_seq" OWNED BY "public"."businesses"."id";



CREATE TABLE IF NOT EXISTS "public"."cash_register_movements" (
    "id" bigint NOT NULL,
    "shift_id" bigint NOT NULL,
    "user_id" "uuid" NOT NULL,
    "movement_type" character varying(30) NOT NULL,
    "amount" numeric(12,2) NOT NULL,
    "payment_method_id" integer,
    "sale_id" bigint,
    "description" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT "cash_register_movements_movement_type_check" CHECK ((("movement_type")::"text" = ANY ((ARRAY['opening'::character varying, 'sale'::character varying, 'refund'::character varying, 'deposit'::character varying, 'withdrawal'::character varying, 'closing'::character varying])::"text"[])))
);


ALTER TABLE "public"."cash_register_movements" OWNER TO "postgres";


COMMENT ON TABLE "public"."cash_register_movements" IS 'Logs all cash movements during cash register shifts';



CREATE SEQUENCE IF NOT EXISTS "public"."cash_register_movements_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."cash_register_movements_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."cash_register_movements_id_seq" OWNED BY "public"."cash_register_movements"."id";



CREATE TABLE IF NOT EXISTS "public"."cash_register_shifts" (
    "id" bigint NOT NULL,
    "cash_register_id" bigint NOT NULL,
    "user_id" "uuid" NOT NULL,
    "shift_number" character varying(30) NOT NULL,
    "status" character varying(20) DEFAULT 'open'::character varying NOT NULL,
    "opening_amount" numeric(12,2) DEFAULT 0.00 NOT NULL,
    "expected_amount" numeric(12,2),
    "actual_amount" numeric(12,2),
    "difference" numeric(12,2),
    "opened_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "closed_at" timestamp with time zone,
    "opening_notes" "text",
    "closing_notes" "text",
    "summary" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT "cash_register_shifts_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['open'::character varying, 'suspended'::character varying, 'closed'::character varying])::"text"[])))
);


ALTER TABLE "public"."cash_register_shifts" OWNER TO "postgres";


COMMENT ON TABLE "public"."cash_register_shifts" IS 'Tracks cash register shift sessions with opening/closing amounts';



CREATE SEQUENCE IF NOT EXISTS "public"."cash_register_shifts_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."cash_register_shifts_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."cash_register_shifts_id_seq" OWNED BY "public"."cash_register_shifts"."id";



CREATE TABLE IF NOT EXISTS "public"."cash_registers" (
    "id" bigint NOT NULL,
    "business_id" integer NOT NULL,
    "location_id" bigint,
    "name" character varying(100) NOT NULL,
    "code" character varying(20) NOT NULL,
    "description" "text",
    "is_active" boolean DEFAULT true NOT NULL,
    "is_main" boolean DEFAULT false NOT NULL,
    "hardware_config" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE "public"."cash_registers" OWNER TO "postgres";


COMMENT ON TABLE "public"."cash_registers" IS 'Defines cash registers/terminals per business location';



CREATE SEQUENCE IF NOT EXISTS "public"."cash_registers_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."cash_registers_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."cash_registers_id_seq" OWNED BY "public"."cash_registers"."id";



CREATE TABLE IF NOT EXISTS "public"."categories" (
    "id" integer NOT NULL,
    "name" character varying(100) NOT NULL,
    "description" "text",
    "parent_id" integer,
    "icon" character varying(50),
    "display_order" integer DEFAULT 0,
    "is_active" boolean DEFAULT true,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" timestamp with time zone,
    "business_id" integer
);


ALTER TABLE "public"."categories" OWNER TO "postgres";


COMMENT ON TABLE "public"."categories" IS 'Categorías jerárquicas de productos';



COMMENT ON COLUMN "public"."categories"."parent_id" IS 'ID de categoría padre para jerarquía';



CREATE SEQUENCE IF NOT EXISTS "public"."categories_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."categories_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."categories_id_seq" OWNED BY "public"."categories"."id";



CREATE TABLE IF NOT EXISTS "public"."roles" (
    "id" integer NOT NULL,
    "business_id" integer,
    "name" character varying(100) NOT NULL,
    "description" "text",
    "permissions" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "is_system" boolean DEFAULT false,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."roles" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."custom_roles_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."custom_roles_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."custom_roles_id_seq" OWNED BY "public"."roles"."id";



CREATE TABLE IF NOT EXISTS "public"."customer_addresses" (
    "id" integer NOT NULL,
    "customer_id" integer NOT NULL,
    "address_type" character varying(20) DEFAULT 'shipping'::character varying,
    "address_line1" "text" NOT NULL,
    "address_line2" "text",
    "city" character varying(100),
    "state" character varying(100),
    "postal_code" character varying(20),
    "country" character varying(50) DEFAULT 'México'::character varying,
    "is_default" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."customer_addresses" OWNER TO "postgres";


COMMENT ON TABLE "public"."customer_addresses" IS 'Múltiples direcciones por cliente';



CREATE SEQUENCE IF NOT EXISTS "public"."customer_addresses_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."customer_addresses_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."customer_addresses_id_seq" OWNED BY "public"."customer_addresses"."id";



CREATE TABLE IF NOT EXISTS "public"."customer_credit_history" (
    "id" bigint NOT NULL,
    "customer_id" integer NOT NULL,
    "transaction_type" character varying(30) NOT NULL,
    "amount" numeric(12,2) NOT NULL,
    "balance_before" numeric(12,2) NOT NULL,
    "balance_after" numeric(12,2) NOT NULL,
    "reference_type" character varying(50),
    "reference_id" integer,
    "notes" "text",
    "performed_by" "uuid",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."customer_credit_history" OWNER TO "postgres";


COMMENT ON TABLE "public"."customer_credit_history" IS 'Historial de movimientos de crédito de clientes';



CREATE SEQUENCE IF NOT EXISTS "public"."customer_credit_history_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."customer_credit_history_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."customer_credit_history_id_seq" OWNED BY "public"."customer_credit_history"."id";



CREATE TABLE IF NOT EXISTS "public"."customers" (
    "id" integer NOT NULL,
    "customer_number" character varying(50),
    "type" character varying(20) DEFAULT 'individual'::character varying,
    "first_name" character varying(100),
    "last_name" character varying(100),
    "business_name" character varying(200),
    "tax_id" character varying(50),
    "email" character varying(100),
    "phone" character varying(20),
    "mobile" character varying(20),
    "address" "text",
    "city" character varying(100),
    "state" character varying(100),
    "postal_code" character varying(20),
    "country" character varying(50) DEFAULT 'México'::character varying,
    "birth_date" "date",
    "credit_limit" numeric(12,2) DEFAULT 0,
    "current_balance" numeric(12,2) DEFAULT 0,
    "loyalty_points" integer DEFAULT 0,
    "preferred_location_id" integer,
    "is_active" boolean DEFAULT true,
    "notes" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" timestamp with time zone,
    "business_id" integer,
    CONSTRAINT "valid_balance" CHECK (("current_balance" >= (0)::numeric))
);


ALTER TABLE "public"."customers" OWNER TO "postgres";


COMMENT ON TABLE "public"."customers" IS 'Clientes registrados del sistema';



COMMENT ON COLUMN "public"."customers"."customer_number" IS 'Número único de cliente';



COMMENT ON COLUMN "public"."customers"."type" IS 'Tipo de cliente: individual o business';



COMMENT ON COLUMN "public"."customers"."current_balance" IS 'Balance de crédito pendiente';



COMMENT ON COLUMN "public"."customers"."loyalty_points" IS 'Puntos de lealtad acumulados';



CREATE SEQUENCE IF NOT EXISTS "public"."customers_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."customers_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."customers_id_seq" OWNED BY "public"."customers"."id";



CREATE TABLE IF NOT EXISTS "public"."email_templates" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "business_id" integer NOT NULL,
    "event_type" character varying(50) NOT NULL,
    "subject" "text" NOT NULL,
    "body" "text" NOT NULL,
    "variables" "text"[] DEFAULT ARRAY[]::"text"[],
    "is_active" boolean DEFAULT true NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."email_templates" OWNER TO "postgres";


COMMENT ON TABLE "public"."email_templates" IS 'Customizable email templates per event type';



COMMENT ON COLUMN "public"."email_templates"."event_type" IS 'Event identifier: sale.created, inventory.low_stock, etc.';



COMMENT ON COLUMN "public"."email_templates"."body" IS 'Template body in Markdown with {variable} placeholders';



COMMENT ON COLUMN "public"."email_templates"."variables" IS 'List of available variables for this template';



CREATE TABLE IF NOT EXISTS "public"."inventory" (
    "id" integer NOT NULL,
    "product_id" integer NOT NULL,
    "location_id" integer NOT NULL,
    "quantity_available" numeric(10,2) DEFAULT 0,
    "quantity_reserved" numeric(10,2) DEFAULT 0,
    "min_stock_level" numeric(10,2) DEFAULT 0,
    "max_stock_level" numeric(10,2),
    "reorder_point" numeric(10,2),
    "last_restock_date" timestamp with time zone,
    "last_restock_quantity" numeric(10,2),
    "is_tracked" boolean DEFAULT true,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "business_id" integer,
    "variant_id" integer,
    CONSTRAINT "positive_quantities" CHECK ((("quantity_available" >= (0)::numeric) AND ("quantity_reserved" >= (0)::numeric) AND ("min_stock_level" >= (0)::numeric)))
);


ALTER TABLE "public"."inventory" OWNER TO "postgres";


COMMENT ON TABLE "public"."inventory" IS 'Inventario de productos por ubicación';



COMMENT ON COLUMN "public"."inventory"."quantity_available" IS 'Cantidad disponible para venta';



COMMENT ON COLUMN "public"."inventory"."quantity_reserved" IS 'Cantidad reservada en cotizaciones';



COMMENT ON COLUMN "public"."inventory"."min_stock_level" IS 'Stock mínimo antes de alerta';



COMMENT ON COLUMN "public"."inventory"."reorder_point" IS 'Punto de reorden automático';



COMMENT ON COLUMN "public"."inventory"."variant_id" IS 'Optional FK to product_variants. NULL for simple products, populated for variant-based inventory';



CREATE SEQUENCE IF NOT EXISTS "public"."inventory_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."inventory_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."inventory_id_seq" OWNED BY "public"."inventory"."id";



CREATE TABLE IF NOT EXISTS "public"."inventory_movements" (
    "id" bigint NOT NULL,
    "inventory_id" integer NOT NULL,
    "movement_type" character varying(30) NOT NULL,
    "quantity" numeric(10,2) NOT NULL,
    "quantity_before" numeric(10,2) NOT NULL,
    "quantity_after" numeric(10,2) NOT NULL,
    "reference_type" character varying(50),
    "reference_id" integer,
    "notes" "text",
    "performed_by" "uuid",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "business_id" integer
);


ALTER TABLE "public"."inventory_movements" OWNER TO "postgres";


COMMENT ON TABLE "public"."inventory_movements" IS 'Historial de movimientos de inventario para auditoría';



COMMENT ON COLUMN "public"."inventory_movements"."movement_type" IS 'Tipo de movimiento: sale, purchase, adjustment, transfer, return';



CREATE SEQUENCE IF NOT EXISTS "public"."inventory_movements_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."inventory_movements_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."inventory_movements_id_seq" OWNED BY "public"."inventory_movements"."id";



CREATE TABLE IF NOT EXISTS "public"."inventory_transfer_items" (
    "id" bigint NOT NULL,
    "transfer_id" integer NOT NULL,
    "product_id" integer NOT NULL,
    "variant_id" integer,
    "quantity_requested" integer NOT NULL,
    "quantity_approved" integer DEFAULT 0,
    "quantity_shipped" integer DEFAULT 0,
    "quantity_received" integer DEFAULT 0,
    "notes" "text"
);


ALTER TABLE "public"."inventory_transfer_items" OWNER TO "postgres";


COMMENT ON TABLE "public"."inventory_transfer_items" IS 'Line items for inventory transfers';



COMMENT ON COLUMN "public"."inventory_transfer_items"."quantity_requested" IS 'Original quantity requested';



COMMENT ON COLUMN "public"."inventory_transfer_items"."quantity_approved" IS 'Quantity approved by source location';



COMMENT ON COLUMN "public"."inventory_transfer_items"."quantity_shipped" IS 'Quantity actually shipped';



COMMENT ON COLUMN "public"."inventory_transfer_items"."quantity_received" IS 'Quantity confirmed received at destination';



CREATE SEQUENCE IF NOT EXISTS "public"."inventory_transfer_items_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."inventory_transfer_items_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."inventory_transfer_items_id_seq" OWNED BY "public"."inventory_transfer_items"."id";



CREATE TABLE IF NOT EXISTS "public"."inventory_transfers" (
    "id" integer NOT NULL,
    "transfer_number" character varying(20) NOT NULL,
    "from_location_id" integer NOT NULL,
    "to_location_id" integer NOT NULL,
    "transfer_type" character varying(20) DEFAULT 'manual'::character varying NOT NULL,
    "priority" character varying(10) DEFAULT 'normal'::character varying,
    "origin_sale_id" integer,
    "status" character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    "requested_by" "uuid" NOT NULL,
    "approved_by" "uuid",
    "rejected_by" "uuid",
    "shipped_by" "uuid",
    "received_by" "uuid",
    "requested_at" timestamp with time zone DEFAULT "now"(),
    "expires_at" timestamp with time zone,
    "approved_at" timestamp with time zone,
    "rejected_at" timestamp with time zone,
    "shipped_at" timestamp with time zone,
    "received_at" timestamp with time zone,
    "request_notes" "text",
    "rejection_reason" "text",
    "shipping_notes" "text",
    "receiving_notes" "text",
    "business_id" integer NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."inventory_transfers" OWNER TO "postgres";


COMMENT ON TABLE "public"."inventory_transfers" IS 'Inter-branch inventory transfer requests and tracking';



COMMENT ON COLUMN "public"."inventory_transfers"."transfer_type" IS 'Type: manual (admin initiated) or pos_request (from POS sale)';



COMMENT ON COLUMN "public"."inventory_transfers"."priority" IS 'Priority level: normal or urgent';



COMMENT ON COLUMN "public"."inventory_transfers"."origin_sale_id" IS 'Reference to pending sale if transfer originated from POS';



COMMENT ON COLUMN "public"."inventory_transfers"."status" IS 'Transfer status: pending, approved, rejected, in_transit, received, partially_received, cancelled, expired';



CREATE SEQUENCE IF NOT EXISTS "public"."inventory_transfers_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."inventory_transfers_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."inventory_transfers_id_seq" OWNED BY "public"."inventory_transfers"."id";



CREATE TABLE IF NOT EXISTS "public"."locations" (
    "id" integer NOT NULL,
    "code" character varying(20) NOT NULL,
    "name" character varying(100) NOT NULL,
    "address" "text",
    "city" character varying(100),
    "state" character varying(100),
    "postal_code" character varying(20),
    "country" character varying(50) DEFAULT 'México'::character varying,
    "phone" character varying(20),
    "email" character varying(100),
    "manager_name" character varying(100),
    "is_active" boolean DEFAULT true,
    "timezone" character varying(50) DEFAULT 'America/Mexico_City'::character varying,
    "opening_hours" "jsonb",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" timestamp with time zone,
    "business_id" integer,
    "main_location" integer
);


ALTER TABLE "public"."locations" OWNER TO "postgres";


COMMENT ON TABLE "public"."locations" IS 'Sucursales o ubicaciones de la empresa';



COMMENT ON COLUMN "public"."locations"."code" IS 'Código único identificador de la sucursal';



COMMENT ON COLUMN "public"."locations"."opening_hours" IS 'Horarios de apertura por día de la semana';



COMMENT ON COLUMN "public"."locations"."main_location" IS 'Marks the main/primary location of the business. 1 = main location, NULL = secondary location. Only one location per business should have value 1.';



CREATE SEQUENCE IF NOT EXISTS "public"."locations_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."locations_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."locations_id_seq" OWNED BY "public"."locations"."id";



CREATE TABLE IF NOT EXISTS "public"."sales" (
    "id" bigint NOT NULL,
    "sale_number" character varying(50) NOT NULL,
    "customer_id" integer,
    "location_id" integer NOT NULL,
    "quote_id" integer,
    "sale_date" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "sale_type" character varying(20) DEFAULT 'regular'::character varying,
    "status" character varying(30) DEFAULT 'completed'::character varying,
    "subtotal" numeric(12,2) DEFAULT 0,
    "tax_amount" numeric(12,2) DEFAULT 0,
    "discount_amount" numeric(12,2) DEFAULT 0,
    "total_amount" numeric(12,2) DEFAULT 0,
    "amount_paid" numeric(12,2) DEFAULT 0,
    "change_amount" numeric(12,2) DEFAULT 0,
    "currency" character varying(3) DEFAULT 'MXN'::character varying,
    "notes" "text",
    "invoice_number" character varying(50),
    "invoice_required" boolean DEFAULT false,
    "sold_by" "uuid" NOT NULL,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" timestamp with time zone,
    "business_id" integer,
    "shift_id" bigint,
    "is_offline" boolean DEFAULT false,
    "offline_id" character varying(100),
    CONSTRAINT "positive_amounts" CHECK ((("subtotal" >= (0)::numeric) AND ("tax_amount" >= (0)::numeric) AND ("discount_amount" >= (0)::numeric) AND ("total_amount" >= (0)::numeric) AND ("amount_paid" >= (0)::numeric) AND ("change_amount" >= (0)::numeric)))
);


ALTER TABLE "public"."sales" OWNER TO "postgres";


COMMENT ON TABLE "public"."sales" IS 'Ventas realizadas (incluye ventas anónimas)';



COMMENT ON COLUMN "public"."sales"."customer_id" IS 'ID del cliente (NULL para ventas anónimas)';



COMMENT ON COLUMN "public"."sales"."quote_id" IS 'ID de cotización origen si aplica';



COMMENT ON COLUMN "public"."sales"."sale_type" IS 'Tipo: regular, return, exchange';



COMMENT ON COLUMN "public"."sales"."shift_id" IS 'Reference to cash register shift';



COMMENT ON COLUMN "public"."sales"."is_offline" IS 'Indicates if sale was created offline';



COMMENT ON COLUMN "public"."sales"."offline_id" IS 'Temporary ID used when created offline';



CREATE MATERIALIZED VIEW "public"."mv_customer_analysis" AS
 SELECT "c"."id" AS "customer_id",
    "c"."customer_number",
    "c"."first_name",
    "c"."last_name",
    "c"."business_name",
    "c"."type",
    "count"("s"."id") AS "total_purchases",
    "sum"("s"."total_amount") AS "lifetime_value",
    "avg"("s"."total_amount") AS "avg_purchase_amount",
    "min"("s"."sale_date") AS "first_purchase_date",
    "max"("s"."sale_date") AS "last_purchase_date",
    "date_part"('day'::"text", ("now"() - "max"("s"."sale_date"))) AS "days_since_last_purchase",
    "c"."loyalty_points",
    "c"."current_balance",
        CASE
            WHEN ("date_part"('day'::"text", ("now"() - "max"("s"."sale_date"))) <= (30)::double precision) THEN 'active'::"text"
            WHEN ("date_part"('day'::"text", ("now"() - "max"("s"."sale_date"))) <= (90)::double precision) THEN 'at_risk'::"text"
            WHEN ("date_part"('day'::"text", ("now"() - "max"("s"."sale_date"))) <= (180)::double precision) THEN 'inactive'::"text"
            ELSE 'churned'::"text"
        END AS "customer_status"
   FROM ("public"."customers" "c"
     LEFT JOIN "public"."sales" "s" ON ((("c"."id" = "s"."customer_id") AND (("s"."status")::"text" = 'completed'::"text"))))
  WHERE ("c"."deleted_at" IS NULL)
  GROUP BY "c"."id", "c"."customer_number", "c"."first_name", "c"."last_name", "c"."business_name", "c"."type", "c"."loyalty_points", "c"."current_balance"
  WITH NO DATA;


ALTER MATERIALIZED VIEW "public"."mv_customer_analysis" OWNER TO "postgres";


COMMENT ON MATERIALIZED VIEW "public"."mv_customer_analysis" IS 'Análisis de comportamiento y valor de clientes';



CREATE MATERIALIZED VIEW "public"."mv_daily_sales_by_location" AS
 SELECT "location_id",
    "date"("created_at") AS "sale_date",
    "count"(DISTINCT "id") AS "total_transactions",
    COALESCE("sum"("total_amount"), (0)::numeric) AS "total_sales",
    COALESCE("sum"("subtotal"), (0)::numeric) AS "total_subtotal",
    COALESCE("sum"("tax_amount"), (0)::numeric) AS "total_tax",
    COALESCE("sum"("discount_amount"), (0)::numeric) AS "total_discount"
   FROM "public"."sales" "s"
  WHERE ((("status")::"text" = 'completed'::"text") AND ("deleted_at" IS NULL))
  GROUP BY "location_id", ("date"("created_at"))
  WITH NO DATA;


ALTER MATERIALIZED VIEW "public"."mv_daily_sales_by_location" OWNER TO "postgres";


COMMENT ON MATERIALIZED VIEW "public"."mv_daily_sales_by_location" IS 'Daily sales aggregated by location. Refreshed periodically for dashboard analytics.';



CREATE TABLE IF NOT EXISTS "public"."products" (
    "id" integer NOT NULL,
    "sku" character varying(50) NOT NULL,
    "barcode" character varying(50),
    "name" character varying(200) NOT NULL,
    "description" "text",
    "category_id" integer,
    "unit_of_measure" character varying(20) DEFAULT 'pieza'::character varying,
    "cost_price" numeric(10,2) DEFAULT 0,
    "selling_price" numeric(10,2) NOT NULL,
    "tax_rate" numeric(5,2) DEFAULT 16.00,
    "is_taxable" boolean DEFAULT true,
    "is_active" boolean DEFAULT true,
    "has_variants" boolean DEFAULT false,
    "image_url" "text",
    "weight" numeric(10,3),
    "dimensions" "jsonb",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" timestamp with time zone,
    "business_id" integer,
    "sale_frequency" integer DEFAULT 0 NOT NULL,
    "is_favorite" boolean DEFAULT false,
    "is_service" boolean DEFAULT false,
    "duration_minutes" integer,
    "requires_appointment" boolean DEFAULT false,
    CONSTRAINT "positive_prices" CHECK ((("selling_price" >= (0)::numeric) AND ("cost_price" >= (0)::numeric))),
    CONSTRAINT "valid_tax_rate" CHECK ((("tax_rate" >= (0)::numeric) AND ("tax_rate" <= (100)::numeric)))
);


ALTER TABLE "public"."products" OWNER TO "postgres";


COMMENT ON TABLE "public"."products" IS 'Catálogo de productos';



COMMENT ON COLUMN "public"."products"."sku" IS 'Código único de producto (Stock Keeping Unit)';



COMMENT ON COLUMN "public"."products"."barcode" IS 'Código de barras del producto';



COMMENT ON COLUMN "public"."products"."cost_price" IS 'Precio de costo del proveedor';



COMMENT ON COLUMN "public"."products"."selling_price" IS 'Precio de venta al cliente';



COMMENT ON COLUMN "public"."products"."sale_frequency" IS 'Counter for how many times product has been sold';



COMMENT ON COLUMN "public"."products"."is_favorite" IS 'Marks product as favorite for quick access';



CREATE MATERIALIZED VIEW "public"."mv_inventory_valuation" AS
 SELECT "l"."id" AS "location_id",
    "l"."name" AS "location_name",
    "p"."id" AS "product_id",
    "p"."sku",
    "p"."name" AS "product_name",
    "c"."name" AS "category_name",
    "i"."quantity_available",
    "i"."quantity_reserved",
    "i"."min_stock_level",
        CASE
            WHEN ("i"."quantity_available" <= "i"."min_stock_level") THEN 'low_stock'::"text"
            WHEN ("i"."quantity_available" = (0)::numeric) THEN 'out_of_stock'::"text"
            ELSE 'in_stock'::"text"
        END AS "stock_status",
    "p"."cost_price",
    "p"."selling_price",
    ("i"."quantity_available" * "p"."cost_price") AS "inventory_value_cost",
    ("i"."quantity_available" * "p"."selling_price") AS "inventory_value_selling",
    ((("p"."selling_price" - "p"."cost_price") / NULLIF("p"."selling_price", (0)::numeric)) * (100)::numeric) AS "margin_percentage",
    "i"."last_restock_date",
    "i"."updated_at" AS "last_movement"
   FROM ((("public"."inventory" "i"
     JOIN "public"."products" "p" ON (("i"."product_id" = "p"."id")))
     JOIN "public"."locations" "l" ON (("i"."location_id" = "l"."id")))
     LEFT JOIN "public"."categories" "c" ON (("p"."category_id" = "c"."id")))
  WHERE (("p"."deleted_at" IS NULL) AND ("l"."deleted_at" IS NULL) AND ("i"."is_tracked" = true))
  WITH NO DATA;


ALTER MATERIALIZED VIEW "public"."mv_inventory_valuation" OWNER TO "postgres";


COMMENT ON MATERIALIZED VIEW "public"."mv_inventory_valuation" IS 'Inventario actual con valorización y estado de stock';



CREATE TABLE IF NOT EXISTS "public"."quotes" (
    "id" integer NOT NULL,
    "quote_number" character varying(50) NOT NULL,
    "customer_id" integer,
    "location_id" integer NOT NULL,
    "quote_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "expiry_date" "date",
    "status" character varying(30) DEFAULT 'pending'::character varying,
    "subtotal" numeric(12,2) DEFAULT 0,
    "tax_amount" numeric(12,2) DEFAULT 0,
    "discount_amount" numeric(12,2) DEFAULT 0,
    "total_amount" numeric(12,2) DEFAULT 0,
    "currency" character varying(3) DEFAULT 'MXN'::character varying,
    "notes" "text",
    "internal_notes" "text",
    "terms_and_conditions" "text",
    "converted_to_sale_id" integer,
    "converted_at" timestamp with time zone,
    "created_by" "uuid" NOT NULL,
    "approved_by" "uuid",
    "approved_at" timestamp with time zone,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" timestamp with time zone,
    "business_id" bigint,
    "delivery_time" character varying(100),
    "payment_method" character varying(50),
    CONSTRAINT "positive_amounts" CHECK ((("subtotal" >= (0)::numeric) AND ("tax_amount" >= (0)::numeric) AND ("discount_amount" >= (0)::numeric) AND ("total_amount" >= (0)::numeric)))
);


ALTER TABLE "public"."quotes" OWNER TO "postgres";


COMMENT ON TABLE "public"."quotes" IS 'Cotizaciones para clientes';



COMMENT ON COLUMN "public"."quotes"."location_id" IS 'Ubicación donde se genera la cotización (requerido)';



COMMENT ON COLUMN "public"."quotes"."status" IS 'Estado: pending, sent, approved, rejected, expired, converted';



COMMENT ON COLUMN "public"."quotes"."converted_to_sale_id" IS 'ID de venta si la cotización fue convertida';



COMMENT ON COLUMN "public"."quotes"."created_by" IS 'Usuario que creó la cotización (requerido)';



COMMENT ON COLUMN "public"."quotes"."metadata" IS 'Metadatos para integración con agente de IA';



CREATE MATERIALIZED VIEW "public"."mv_quote_conversion_rate" AS
 SELECT "l"."id" AS "location_id",
    "l"."name" AS "location_name",
    "date_trunc"('month'::"text", ("q"."quote_date")::timestamp with time zone) AS "month",
    "count"("q"."id") AS "total_quotes",
    "count"(
        CASE
            WHEN (("q"."status")::"text" = 'converted'::"text") THEN 1
            ELSE NULL::integer
        END) AS "converted_quotes",
    "count"(
        CASE
            WHEN (("q"."status")::"text" = 'rejected'::"text") THEN 1
            ELSE NULL::integer
        END) AS "rejected_quotes",
    "count"(
        CASE
            WHEN (("q"."status")::"text" = 'expired'::"text") THEN 1
            ELSE NULL::integer
        END) AS "expired_quotes",
    "count"(
        CASE
            WHEN (("q"."status")::"text" = ANY ((ARRAY['pending'::character varying, 'sent'::character varying])::"text"[])) THEN 1
            ELSE NULL::integer
        END) AS "pending_quotes",
    ((("count"(
        CASE
            WHEN (("q"."status")::"text" = 'converted'::"text") THEN 1
            ELSE NULL::integer
        END))::double precision / (NULLIF("count"("q"."id"), 0))::double precision) * (100)::double precision) AS "conversion_rate",
    "sum"("q"."total_amount") AS "total_quoted_amount",
    "sum"(
        CASE
            WHEN (("q"."status")::"text" = 'converted'::"text") THEN "q"."total_amount"
            ELSE (0)::numeric
        END) AS "total_converted_amount",
    "avg"("q"."total_amount") AS "avg_quote_amount",
    "avg"(
        CASE
            WHEN ("q"."converted_at" IS NOT NULL) THEN (EXTRACT(epoch FROM ("q"."converted_at" - "q"."created_at")) / (86400)::numeric)
            ELSE NULL::numeric
        END) AS "avg_days_to_conversion"
   FROM ("public"."quotes" "q"
     JOIN "public"."locations" "l" ON (("q"."location_id" = "l"."id")))
  WHERE ("q"."deleted_at" IS NULL)
  GROUP BY "l"."id", "l"."name", ("date_trunc"('month'::"text", ("q"."quote_date")::timestamp with time zone))
  WITH NO DATA;


ALTER MATERIALIZED VIEW "public"."mv_quote_conversion_rate" OWNER TO "postgres";


COMMENT ON MATERIALIZED VIEW "public"."mv_quote_conversion_rate" IS 'Tasa de conversión y análisis de cotizaciones';



CREATE TABLE IF NOT EXISTS "public"."user_details" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" character varying(255) NOT NULL,
    "first_name" character varying(100),
    "last_name" character varying(100),
    "phone" character varying(20),
    "default_location_id" integer,
    "is_active" boolean DEFAULT true,
    "last_login_at" timestamp with time zone,
    "email_verified" boolean DEFAULT false,
    "avatar_url" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" timestamp with time zone,
    "business_id" integer,
    "role_id" integer,
    "username" character varying(50),
    "temporary_password_hash" "text",
    "force_password_change" boolean DEFAULT false,
    "password_changed_at" timestamp with time zone,
    "preferred_view" character varying(20),
    "default_cash_register_id" bigint,
    CONSTRAINT "user_details_preferred_view_check" CHECK ((("preferred_view")::"text" = ANY ((ARRAY['auto'::character varying, 'admin'::character varying, 'seller'::character varying])::"text"[]))),
    CONSTRAINT "username_format_check" CHECK ((("username" IS NULL) OR (("username")::"text" ~ '^[a-zA-Z0-9_-]{3,50}$'::"text")))
);


ALTER TABLE "public"."user_details" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_details" IS 'Usuarios del sistema con autenticación';



COMMENT ON COLUMN "public"."user_details"."default_location_id" IS 'Sucursal predeterminada del usuario';



COMMENT ON COLUMN "public"."user_details"."username" IS 'Optional username for login (alternative to email). Must be unique.';



COMMENT ON COLUMN "public"."user_details"."temporary_password_hash" IS 'Encrypted temporary password for admin recovery. Cleared after password change.';



COMMENT ON COLUMN "public"."user_details"."force_password_change" IS 'Set to true to force password change on next login (first login or password recovery).';



COMMENT ON COLUMN "public"."user_details"."password_changed_at" IS 'Timestamp of last password change by user.';



COMMENT ON COLUMN "public"."user_details"."preferred_view" IS 'User preferred view mode';



COMMENT ON COLUMN "public"."user_details"."default_cash_register_id" IS 'Default cash register assigned to user';



CREATE MATERIALIZED VIEW "public"."mv_seller_performance" AS
 SELECT "u"."id" AS "user_id",
    ((("u"."first_name")::"text" || ' '::"text") || ("u"."last_name")::"text") AS "seller_name",
    "l"."id" AS "location_id",
    "l"."name" AS "location_name",
    "date_trunc"('month'::"text", "s"."sale_date") AS "month",
    "count"("s"."id") AS "total_sales",
    "sum"("s"."total_amount") AS "total_revenue",
    "avg"("s"."total_amount") AS "avg_sale_amount",
    ("sum"("s"."total_amount") / (NULLIF("count"(DISTINCT "date"("s"."sale_date")), 0))::numeric) AS "avg_daily_revenue",
    "count"(DISTINCT "s"."customer_id") AS "unique_customers",
    "max"("s"."sale_date") AS "last_sale_date"
   FROM (("public"."user_details" "u"
     JOIN "public"."sales" "s" ON (("u"."id" = "s"."sold_by")))
     JOIN "public"."locations" "l" ON (("s"."location_id" = "l"."id")))
  WHERE ((("s"."status")::"text" = 'completed'::"text") AND ("s"."deleted_at" IS NULL))
  GROUP BY "u"."id", "u"."first_name", "u"."last_name", "l"."id", "l"."name", ("date_trunc"('month'::"text", "s"."sale_date"))
  WITH NO DATA;


ALTER MATERIALIZED VIEW "public"."mv_seller_performance" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."ticket_categories" (
    "id" integer NOT NULL,
    "name" character varying(100) NOT NULL,
    "description" "text",
    "parent_id" integer,
    "sla_response_hours" integer,
    "sla_resolution_hours" integer,
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."ticket_categories" OWNER TO "postgres";


COMMENT ON TABLE "public"."ticket_categories" IS 'Categorías de tickets de soporte';



COMMENT ON COLUMN "public"."ticket_categories"."sla_response_hours" IS 'Horas de SLA para primera respuesta';



CREATE TABLE IF NOT EXISTS "public"."tickets" (
    "id" integer NOT NULL,
    "ticket_number" character varying(50) NOT NULL,
    "title" character varying(200) NOT NULL,
    "description" "text" NOT NULL,
    "category_id" integer,
    "priority" character varying(20) DEFAULT 'medium'::character varying,
    "status" character varying(30) DEFAULT 'open'::character varying,
    "created_by" "uuid" NOT NULL,
    "assigned_to" "uuid",
    "location_id" integer,
    "related_entity_type" character varying(50),
    "related_entity_id" integer,
    "first_response_at" timestamp with time zone,
    "resolved_at" timestamp with time zone,
    "closed_at" timestamp with time zone,
    "due_date" timestamp with time zone,
    "satisfaction_rating" integer,
    "satisfaction_comment" "text",
    "tags" "text"[],
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" timestamp with time zone,
    CONSTRAINT "valid_priority" CHECK ((("priority")::"text" = ANY ((ARRAY['low'::character varying, 'medium'::character varying, 'high'::character varying, 'critical'::character varying])::"text"[]))),
    CONSTRAINT "valid_rating" CHECK ((("satisfaction_rating" IS NULL) OR (("satisfaction_rating" >= 1) AND ("satisfaction_rating" <= 5))))
);


ALTER TABLE "public"."tickets" OWNER TO "postgres";


COMMENT ON TABLE "public"."tickets" IS 'Tickets de soporte y asistencia';



COMMENT ON COLUMN "public"."tickets"."priority" IS 'Prioridad: low, medium, high, critical';



COMMENT ON COLUMN "public"."tickets"."status" IS 'Estado: open, in_progress, waiting, resolved, closed, cancelled';



COMMENT ON COLUMN "public"."tickets"."related_entity_type" IS 'Tipo de entidad relacionada: sale, product, customer, etc.';



CREATE MATERIALIZED VIEW "public"."mv_ticket_metrics" AS
 SELECT "l"."id" AS "location_id",
    "l"."name" AS "location_name",
    "tc"."name" AS "category_name",
    "date_trunc"('month'::"text", "t"."created_at") AS "month",
    "count"("t"."id") AS "total_tickets",
    "count"(
        CASE
            WHEN (("t"."status")::"text" = ANY ((ARRAY['open'::character varying, 'in_progress'::character varying, 'waiting'::character varying])::"text"[])) THEN 1
            ELSE NULL::integer
        END) AS "open_tickets",
    "count"(
        CASE
            WHEN (("t"."status")::"text" = 'resolved'::"text") THEN 1
            ELSE NULL::integer
        END) AS "resolved_tickets",
    "count"(
        CASE
            WHEN (("t"."status")::"text" = 'closed'::"text") THEN 1
            ELSE NULL::integer
        END) AS "closed_tickets",
    "avg"(
        CASE
            WHEN ("t"."first_response_at" IS NOT NULL) THEN (EXTRACT(epoch FROM ("t"."first_response_at" - "t"."created_at")) / (3600)::numeric)
            ELSE NULL::numeric
        END) AS "avg_first_response_hours",
    "avg"(
        CASE
            WHEN ("t"."resolved_at" IS NOT NULL) THEN (EXTRACT(epoch FROM ("t"."resolved_at" - "t"."created_at")) / (3600)::numeric)
            ELSE NULL::numeric
        END) AS "avg_resolution_hours",
    "avg"("t"."satisfaction_rating") AS "avg_satisfaction_rating",
    "count"(
        CASE
            WHEN (("t"."priority")::"text" = 'critical'::"text") THEN 1
            ELSE NULL::integer
        END) AS "critical_tickets",
    "count"(
        CASE
            WHEN (("t"."priority")::"text" = 'high'::"text") THEN 1
            ELSE NULL::integer
        END) AS "high_priority_tickets"
   FROM (("public"."tickets" "t"
     LEFT JOIN "public"."locations" "l" ON (("t"."location_id" = "l"."id")))
     LEFT JOIN "public"."ticket_categories" "tc" ON (("t"."category_id" = "tc"."id")))
  WHERE ("t"."deleted_at" IS NULL)
  GROUP BY "l"."id", "l"."name", "tc"."name", ("date_trunc"('month'::"text", "t"."created_at"))
  WITH NO DATA;


ALTER MATERIALIZED VIEW "public"."mv_ticket_metrics" OWNER TO "postgres";


COMMENT ON MATERIALIZED VIEW "public"."mv_ticket_metrics" IS 'Métricas de rendimiento de tickets de soporte';



CREATE TABLE IF NOT EXISTS "public"."sale_items" (
    "id" bigint NOT NULL,
    "sale_id" bigint NOT NULL,
    "product_id" integer NOT NULL,
    "quantity" numeric(10,2) NOT NULL,
    "unit_price" numeric(10,2) NOT NULL,
    "tax_rate" numeric(5,2) DEFAULT 16.00,
    "discount_percent" numeric(5,2) DEFAULT 0,
    "line_total" numeric(12,2) NOT NULL,
    "cost_price" numeric(10,2),
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "discount_amount" numeric(10,2) DEFAULT 0,
    "tax_amount" numeric(10,2) DEFAULT 0,
    "variant_id" integer,
    CONSTRAINT "positive_values" CHECK ((("quantity" > (0)::numeric) AND ("unit_price" >= (0)::numeric) AND ("discount_percent" >= (0)::numeric) AND ("discount_percent" <= (100)::numeric)))
);


ALTER TABLE "public"."sale_items" OWNER TO "postgres";


COMMENT ON TABLE "public"."sale_items" IS 'Detalles de productos vendidos';



COMMENT ON COLUMN "public"."sale_items"."cost_price" IS 'Precio de costo al momento de la venta para análisis de margen';



COMMENT ON COLUMN "public"."sale_items"."variant_id" IS 'Optional FK to product_variants. NULL for simple products, populated when a variant is sold';



CREATE MATERIALIZED VIEW "public"."mv_top_selling_products" AS
 SELECT "si"."product_id",
    "p"."name" AS "product_name",
    "p"."sku" AS "product_sku",
    "s"."location_id",
    "sum"("si"."quantity") AS "total_quantity_sold",
    COALESCE("sum"("si"."line_total"), (0)::numeric) AS "total_revenue",
    "count"(DISTINCT "s"."id") AS "transaction_count",
    "max"("s"."created_at") AS "last_sold_at"
   FROM (("public"."sale_items" "si"
     JOIN "public"."sales" "s" ON (("s"."id" = "si"."sale_id")))
     JOIN "public"."products" "p" ON (("p"."id" = "si"."product_id")))
  WHERE ((("s"."status")::"text" = 'completed'::"text") AND ("s"."deleted_at" IS NULL) AND ("s"."created_at" >= (CURRENT_DATE - '30 days'::interval)))
  GROUP BY "si"."product_id", "p"."name", "p"."sku", "s"."location_id"
  WITH NO DATA;


ALTER MATERIALIZED VIEW "public"."mv_top_selling_products" OWNER TO "postgres";


COMMENT ON MATERIALIZED VIEW "public"."mv_top_selling_products" IS 'Top selling products by location for the last 30 days. Refreshed periodically for dashboard analytics.';



CREATE TABLE IF NOT EXISTS "public"."notification_preferences" (
    "id" integer NOT NULL,
    "business_id" integer NOT NULL,
    "desktop_notifications" boolean DEFAULT true NOT NULL,
    "sound_enabled" boolean DEFAULT true NOT NULL,
    "low_stock_alerts" boolean DEFAULT true NOT NULL,
    "low_stock_threshold" integer DEFAULT 10 NOT NULL,
    "sales_notifications" boolean DEFAULT true NOT NULL,
    "sales_amount_threshold" numeric(12,2) DEFAULT 1000.00,
    "daily_email_summary" boolean DEFAULT false NOT NULL,
    "email_recipients" "text"[] DEFAULT ARRAY[]::"text"[],
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT "notification_preferences_low_stock_threshold_check" CHECK (("low_stock_threshold" > 0))
);


ALTER TABLE "public"."notification_preferences" OWNER TO "postgres";


COMMENT ON TABLE "public"."notification_preferences" IS 'Business-level notification configuration (applies to all locations)';



COMMENT ON COLUMN "public"."notification_preferences"."low_stock_threshold" IS 'Stock level that triggers low stock alerts';



COMMENT ON COLUMN "public"."notification_preferences"."sales_amount_threshold" IS 'Sales amount that triggers large sale notifications';



COMMENT ON COLUMN "public"."notification_preferences"."email_recipients" IS 'Email addresses for daily summary';



CREATE SEQUENCE IF NOT EXISTS "public"."notification_preferences_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."notification_preferences_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."notification_preferences_id_seq" OWNED BY "public"."notification_preferences"."id";



CREATE TABLE IF NOT EXISTS "public"."notification_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "business_id" integer NOT NULL,
    "user_id" "uuid",
    "channels" "jsonb" DEFAULT '{"push": true, "email": true, "in_app": true}'::"jsonb" NOT NULL,
    "events" "jsonb" DEFAULT '{}'::"jsonb" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."notification_settings" OWNER TO "postgres";


COMMENT ON TABLE "public"."notification_settings" IS 'Notification preferences (business-wide or per-user)';



COMMENT ON COLUMN "public"."notification_settings"."user_id" IS 'NULL = business default, non-null = user override';



COMMENT ON COLUMN "public"."notification_settings"."channels" IS 'Enabled notification channels: email, push, in_app';



COMMENT ON COLUMN "public"."notification_settings"."events" IS 'Per-event channel configuration';



CREATE TABLE IF NOT EXISTS "public"."notifications" (
    "id" bigint NOT NULL,
    "user_id" "uuid",
    "notification_type" character varying(50) NOT NULL,
    "title" character varying(200) NOT NULL,
    "message" "text" NOT NULL,
    "priority" character varying(20) DEFAULT 'normal'::character varying,
    "is_read" boolean DEFAULT false,
    "read_at" timestamp with time zone,
    "action_url" "text",
    "related_entity_type" character varying(50),
    "related_entity_id" integer,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "expires_at" timestamp with time zone,
    "business_id" integer NOT NULL,
    "location_id" integer,
    "type" character varying(50) NOT NULL,
    "data" "jsonb" DEFAULT '{}'::"jsonb",
    "read" boolean DEFAULT false NOT NULL,
    CONSTRAINT "notifications_type_check" CHECK ((("type")::"text" = ANY ((ARRAY['stock_alert'::character varying, 'sales'::character varying, 'system'::character varying, 'info'::character varying])::"text"[])))
);


ALTER TABLE "public"."notifications" OWNER TO "postgres";


COMMENT ON TABLE "public"."notifications" IS 'System notifications for users with multi-store support';



COMMENT ON COLUMN "public"."notifications"."user_id" IS 'Target user (NULL for all users in business/location)';



COMMENT ON COLUMN "public"."notifications"."expires_at" IS 'When notification should be auto-deleted';



COMMENT ON COLUMN "public"."notifications"."business_id" IS 'Business that owns this notification';



COMMENT ON COLUMN "public"."notifications"."location_id" IS 'Specific location (NULL for business-wide)';



COMMENT ON COLUMN "public"."notifications"."type" IS 'Notification type: stock_alert, sales, system, info';



COMMENT ON COLUMN "public"."notifications"."data" IS 'Additional metadata in JSON format';



CREATE SEQUENCE IF NOT EXISTS "public"."notifications_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."notifications_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."notifications_id_seq" OWNED BY "public"."notifications"."id";



CREATE TABLE IF NOT EXISTS "public"."offline_sync_queue" (
    "id" bigint NOT NULL,
    "user_id" "uuid" NOT NULL,
    "device_id" character varying(100) NOT NULL,
    "operation_type" character varying(50) NOT NULL,
    "payload" "jsonb" NOT NULL,
    "status" character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    "attempts" integer DEFAULT 0 NOT NULL,
    "error_message" "text",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "synced_at" timestamp with time zone,
    CONSTRAINT "offline_sync_queue_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['pending'::character varying, 'processing'::character varying, 'completed'::character varying, 'failed'::character varying])::"text"[])))
);


ALTER TABLE "public"."offline_sync_queue" OWNER TO "postgres";


COMMENT ON TABLE "public"."offline_sync_queue" IS 'Queue for synchronizing offline operations';



CREATE SEQUENCE IF NOT EXISTS "public"."offline_sync_queue_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."offline_sync_queue_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."offline_sync_queue_id_seq" OWNED BY "public"."offline_sync_queue"."id";



CREATE TABLE IF NOT EXISTS "public"."payment_methods" (
    "id" integer NOT NULL,
    "code" character varying(20) NOT NULL,
    "name" character varying(100) NOT NULL,
    "type" character varying(30) NOT NULL,
    "is_active" boolean DEFAULT true,
    "requires_reference" boolean DEFAULT false,
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."payment_methods" OWNER TO "postgres";


COMMENT ON TABLE "public"."payment_methods" IS 'Métodos de pago disponibles';



COMMENT ON COLUMN "public"."payment_methods"."code" IS 'Unique payment method code';



COMMENT ON COLUMN "public"."payment_methods"."type" IS 'Tipo: cash, card, transfer, mercadopago, credit';



CREATE SEQUENCE IF NOT EXISTS "public"."payment_methods_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."payment_methods_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."payment_methods_id_seq" OWNED BY "public"."payment_methods"."id";



CREATE TABLE IF NOT EXISTS "public"."payment_transactions" (
    "id" bigint NOT NULL,
    "sale_id" bigint NOT NULL,
    "payment_method_id" integer NOT NULL,
    "amount" numeric(12,2) NOT NULL,
    "currency" character varying(3) DEFAULT 'MXN'::character varying,
    "transaction_date" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "status" character varying(30) DEFAULT 'completed'::character varying,
    "reference_number" character varying(100),
    "mp_payment_id" character varying(100),
    "mp_status" character varying(50),
    "mp_status_detail" character varying(100),
    "mp_payment_type" character varying(50),
    "mp_transaction_amount" numeric(12,2),
    "mp_installments" integer,
    "mp_payer_email" character varying(100),
    "mp_metadata" "jsonb",
    "card_last_4" character varying(4),
    "card_brand" character varying(30),
    "notes" "text",
    "processed_by" "uuid",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "positive_amount" CHECK (("amount" > (0)::numeric))
);


ALTER TABLE "public"."payment_transactions" OWNER TO "postgres";


COMMENT ON TABLE "public"."payment_transactions" IS 'Transacciones de pago por venta (soporte para múltiples pagos)';



COMMENT ON COLUMN "public"."payment_transactions"."mp_payment_id" IS 'ID de pago en Mercado Pago';



COMMENT ON COLUMN "public"."payment_transactions"."mp_metadata" IS 'Respuesta completa de la API de Mercado Pago';



CREATE SEQUENCE IF NOT EXISTS "public"."payment_transactions_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."payment_transactions_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."payment_transactions_id_seq" OWNED BY "public"."payment_transactions"."id";



CREATE TABLE IF NOT EXISTS "public"."product_variants" (
    "id" integer NOT NULL,
    "product_id" integer NOT NULL,
    "sku" character varying(50) NOT NULL,
    "barcode" character varying(50),
    "variant_name" character varying(100) NOT NULL,
    "attributes" "jsonb",
    "cost_price" numeric(10,2),
    "selling_price" numeric(10,2),
    "image_url" "text",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."product_variants" OWNER TO "postgres";


COMMENT ON TABLE "public"."product_variants" IS 'Variantes de productos (color, tamaño, etc.)';



CREATE SEQUENCE IF NOT EXISTS "public"."product_variants_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."product_variants_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."product_variants_id_seq" OWNED BY "public"."product_variants"."id";



CREATE SEQUENCE IF NOT EXISTS "public"."products_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."products_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."products_id_seq" OWNED BY "public"."products"."id";



CREATE TABLE IF NOT EXISTS "public"."purchase_order_items" (
    "id" integer NOT NULL,
    "purchase_order_id" integer NOT NULL,
    "product_id" integer NOT NULL,
    "quantity_ordered" numeric(10,2) NOT NULL,
    "quantity_received" numeric(10,2) DEFAULT 0,
    "unit_cost" numeric(10,2) NOT NULL,
    "tax_rate" numeric(5,2) DEFAULT 16.00,
    "discount_percent" numeric(5,2) DEFAULT 0,
    "line_total" numeric(12,2) NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "positive_values" CHECK ((("quantity_ordered" > (0)::numeric) AND ("quantity_received" >= (0)::numeric) AND ("unit_cost" >= (0)::numeric) AND ("discount_percent" >= (0)::numeric) AND ("discount_percent" <= (100)::numeric)))
);


ALTER TABLE "public"."purchase_order_items" OWNER TO "postgres";


COMMENT ON TABLE "public"."purchase_order_items" IS 'Detalles de productos en órdenes de compra';



COMMENT ON COLUMN "public"."purchase_order_items"."quantity_received" IS 'Cantidad recibida del total ordenado';



CREATE SEQUENCE IF NOT EXISTS "public"."purchase_order_items_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."purchase_order_items_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."purchase_order_items_id_seq" OWNED BY "public"."purchase_order_items"."id";



CREATE TABLE IF NOT EXISTS "public"."purchase_orders" (
    "id" integer NOT NULL,
    "order_number" character varying(50) NOT NULL,
    "supplier_id" integer NOT NULL,
    "location_id" integer NOT NULL,
    "order_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "expected_delivery_date" "date",
    "actual_delivery_date" "date",
    "status" character varying(30) DEFAULT 'draft'::character varying,
    "subtotal" numeric(12,2) DEFAULT 0,
    "tax_amount" numeric(12,2) DEFAULT 0,
    "shipping_cost" numeric(12,2) DEFAULT 0,
    "total_amount" numeric(12,2) DEFAULT 0,
    "currency" character varying(3) DEFAULT 'MXN'::character varying,
    "payment_status" character varying(30) DEFAULT 'pending'::character varying,
    "payment_terms" character varying(100),
    "notes" "text",
    "created_by" "uuid" NOT NULL,
    "approved_by" "uuid",
    "approved_at" timestamp with time zone,
    "received_by" "uuid",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" timestamp with time zone,
    CONSTRAINT "positive_amounts" CHECK ((("subtotal" >= (0)::numeric) AND ("tax_amount" >= (0)::numeric) AND ("shipping_cost" >= (0)::numeric) AND ("total_amount" >= (0)::numeric)))
);


ALTER TABLE "public"."purchase_orders" OWNER TO "postgres";


COMMENT ON TABLE "public"."purchase_orders" IS 'Órdenes de compra a proveedores';



COMMENT ON COLUMN "public"."purchase_orders"."status" IS 'Estado: draft, sent, confirmed, partial, received, cancelled';



COMMENT ON COLUMN "public"."purchase_orders"."payment_status" IS 'Estado de pago: pending, partial, paid';



CREATE SEQUENCE IF NOT EXISTS "public"."purchase_orders_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."purchase_orders_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."purchase_orders_id_seq" OWNED BY "public"."purchase_orders"."id";



CREATE TABLE IF NOT EXISTS "public"."purchase_receipt_items" (
    "id" integer NOT NULL,
    "receipt_id" integer NOT NULL,
    "purchase_order_item_id" integer NOT NULL,
    "quantity_received" numeric(10,2) NOT NULL,
    "condition" character varying(30) DEFAULT 'good'::character varying,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "positive_quantity" CHECK (("quantity_received" > (0)::numeric))
);


ALTER TABLE "public"."purchase_receipt_items" OWNER TO "postgres";


COMMENT ON TABLE "public"."purchase_receipt_items" IS 'Detalles de items recibidos por recepción';



CREATE SEQUENCE IF NOT EXISTS "public"."purchase_receipt_items_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."purchase_receipt_items_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."purchase_receipt_items_id_seq" OWNED BY "public"."purchase_receipt_items"."id";



CREATE TABLE IF NOT EXISTS "public"."purchase_receipts" (
    "id" integer NOT NULL,
    "purchase_order_id" integer NOT NULL,
    "receipt_number" character varying(50) NOT NULL,
    "receipt_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "received_by" "uuid" NOT NULL,
    "notes" "text",
    "is_complete" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."purchase_receipts" OWNER TO "postgres";


COMMENT ON TABLE "public"."purchase_receipts" IS 'Recepciones de mercancía de órdenes de compra';



CREATE SEQUENCE IF NOT EXISTS "public"."purchase_receipts_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."purchase_receipts_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."purchase_receipts_id_seq" OWNED BY "public"."purchase_receipts"."id";



CREATE TABLE IF NOT EXISTS "public"."quote_automation_settings" (
    "id" integer NOT NULL,
    "business_id" integer NOT NULL,
    "ai_provider" character varying(20) DEFAULT 'claude'::character varying,
    "ai_model" character varying(50) DEFAULT 'claude-3-sonnet-20240229'::character varying,
    "ai_temperature" numeric(2,1) DEFAULT 0.7,
    "is_enabled" boolean DEFAULT false,
    "whatsapp_enabled" boolean DEFAULT false,
    "email_enabled" boolean DEFAULT false,
    "web_enabled" boolean DEFAULT false,
    "daily_quote_limit" integer DEFAULT 3,
    "auto_send_quote" boolean DEFAULT true,
    "include_product_images" boolean DEFAULT false,
    "default_expiry_days" integer DEFAULT 7,
    "system_prompt" "text",
    "greeting_message" "text" DEFAULT 'Hola! Soy tu asistente de cotizaciones. Cuéntame qué productos necesitas y te prepararé una cotización.'::"text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "twilio_account_sid" character varying(50),
    "twilio_auth_token_encrypted" "text",
    "twilio_whatsapp_number" character varying(20),
    "twilio_verified" boolean DEFAULT false,
    "twilio_verified_at" timestamp with time zone,
    "twilio_webhook_url" "text",
    "allow_overage" boolean DEFAULT false,
    "overage_notification_sent" boolean DEFAULT false,
    CONSTRAINT "quote_automation_settings_ai_provider_check" CHECK ((("ai_provider")::"text" = ANY ((ARRAY['claude'::character varying, 'openai'::character varying, 'deepseek'::character varying])::"text"[])))
);


ALTER TABLE "public"."quote_automation_settings" OWNER TO "postgres";


COMMENT ON TABLE "public"."quote_automation_settings" IS 'Per-business configuration for quote automation features';



CREATE SEQUENCE IF NOT EXISTS "public"."quote_automation_settings_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."quote_automation_settings_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."quote_automation_settings_id_seq" OWNED BY "public"."quote_automation_settings"."id";



CREATE TABLE IF NOT EXISTS "public"."quote_conversation_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "business_id" integer NOT NULL,
    "customer_id" integer,
    "customer_phone" character varying(20),
    "customer_email" character varying(100),
    "customer_name" character varying(100),
    "channel" character varying(20) NOT NULL,
    "channel_session_id" character varying(255),
    "messages" "jsonb" DEFAULT '[]'::"jsonb" NOT NULL,
    "extracted_items" "jsonb" DEFAULT '[]'::"jsonb",
    "status" character varying(20) DEFAULT 'active'::character varying,
    "quote_id" integer,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "expires_at" timestamp with time zone DEFAULT ("now"() + '24:00:00'::interval),
    CONSTRAINT "quote_conversation_sessions_channel_check" CHECK ((("channel")::"text" = ANY ((ARRAY['whatsapp'::character varying, 'email'::character varying, 'web'::character varying, 'telegram'::character varying])::"text"[]))),
    CONSTRAINT "quote_conversation_sessions_status_check" CHECK ((("status")::"text" = ANY ((ARRAY['active'::character varying, 'completed'::character varying, 'expired'::character varying, 'cancelled'::character varying])::"text"[])))
);


ALTER TABLE "public"."quote_conversation_sessions" OWNER TO "postgres";


COMMENT ON TABLE "public"."quote_conversation_sessions" IS 'Stores conversation context for AI-powered quote generation';



CREATE TABLE IF NOT EXISTS "public"."quote_follow_ups" (
    "id" integer NOT NULL,
    "quote_id" integer NOT NULL,
    "follow_up_date" "date" NOT NULL,
    "follow_up_type" character varying(30),
    "status" character varying(30) DEFAULT 'pending'::character varying,
    "notes" "text",
    "assigned_to" "uuid",
    "completed_by" "uuid",
    "completed_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."quote_follow_ups" OWNER TO "postgres";


COMMENT ON TABLE "public"."quote_follow_ups" IS 'Seguimiento de cotizaciones para conversión (útil para agente de IA)';



CREATE SEQUENCE IF NOT EXISTS "public"."quote_follow_ups_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."quote_follow_ups_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."quote_follow_ups_id_seq" OWNED BY "public"."quote_follow_ups"."id";



CREATE TABLE IF NOT EXISTS "public"."quote_items" (
    "id" integer NOT NULL,
    "quote_id" integer NOT NULL,
    "product_id" integer NOT NULL,
    "quantity" numeric(10,2) NOT NULL,
    "unit_price" numeric(10,2) NOT NULL,
    "tax_rate" numeric(5,2) DEFAULT 16.00,
    "discount_amount" numeric(5,2) DEFAULT 0,
    "tax_amount" numeric(12,2) DEFAULT '0'::numeric NOT NULL,
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "subtotal" numeric NOT NULL,
    CONSTRAINT "positive_values" CHECK ((("quantity" > (0)::numeric) AND ("unit_price" >= (0)::numeric) AND ("discount_amount" >= (0)::numeric) AND ("discount_amount" <= (100)::numeric)))
);


ALTER TABLE "public"."quote_items" OWNER TO "postgres";


COMMENT ON TABLE "public"."quote_items" IS 'Items de las cotizaciones';



COMMENT ON COLUMN "public"."quote_items"."tax_rate" IS 'Tasa de impuesto del item (%)';



COMMENT ON COLUMN "public"."quote_items"."discount_amount" IS 'Descuento aplicado al item';



COMMENT ON COLUMN "public"."quote_items"."tax_amount" IS 'Monto de impuesto calculado';



CREATE SEQUENCE IF NOT EXISTS "public"."quote_items_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."quote_items_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."quote_items_id_seq" OWNED BY "public"."quote_items"."id";



CREATE TABLE IF NOT EXISTS "public"."quote_usage_monthly" (
    "id" integer NOT NULL,
    "business_id" integer NOT NULL,
    "year_month" character varying(7) NOT NULL,
    "quotes_used" integer DEFAULT 0,
    "quotes_limit" integer DEFAULT 0,
    "overage_quotes" integer DEFAULT 0,
    "overage_amount" numeric(10,2) DEFAULT 0,
    "overage_price_per_quote" numeric(10,2) DEFAULT 0,
    "allow_overage" boolean DEFAULT false,
    "overage_blocked_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."quote_usage_monthly" OWNER TO "postgres";


COMMENT ON TABLE "public"."quote_usage_monthly" IS 'Tracking de cotizaciones usadas por mes por negocio';



CREATE SEQUENCE IF NOT EXISTS "public"."quote_usage_monthly_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."quote_usage_monthly_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."quote_usage_monthly_id_seq" OWNED BY "public"."quote_usage_monthly"."id";



CREATE SEQUENCE IF NOT EXISTS "public"."quotes_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."quotes_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."quotes_id_seq" OWNED BY "public"."quotes"."id";



CREATE TABLE IF NOT EXISTS "public"."refunds" (
    "id" integer NOT NULL,
    "refund_number" character varying(50) NOT NULL,
    "original_sale_id" bigint NOT NULL,
    "refund_sale_id" bigint,
    "refund_date" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "refund_amount" numeric(12,2) NOT NULL,
    "refund_type" character varying(30),
    "reason" character varying(200),
    "notes" "text",
    "processed_by" "uuid" NOT NULL,
    "approved_by" "uuid",
    "status" character varying(30) DEFAULT 'pending'::character varying,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."refunds" OWNER TO "postgres";


COMMENT ON TABLE "public"."refunds" IS 'Devoluciones y reembolsos de ventas';



CREATE SEQUENCE IF NOT EXISTS "public"."refunds_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."refunds_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."refunds_id_seq" OWNED BY "public"."refunds"."id";



CREATE SEQUENCE IF NOT EXISTS "public"."sale_items_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."sale_items_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."sale_items_id_seq" OWNED BY "public"."sale_items"."id";



CREATE SEQUENCE IF NOT EXISTS "public"."sales_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."sales_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."sales_id_seq" OWNED BY "public"."sales"."id";



CREATE TABLE IF NOT EXISTS "public"."security_settings" (
    "business_id" integer NOT NULL,
    "password_policy" "jsonb" DEFAULT '{"min_length": 8, "max_attempts": 5, "history_count": 3, "expiration_days": null, "lockout_minutes": 15, "require_numbers": true, "require_symbols": false, "require_lowercase": true, "require_uppercase": true}'::"jsonb" NOT NULL,
    "two_factor_config" "jsonb" DEFAULT '{"methods": ["app"], "required": "none"}'::"jsonb" NOT NULL,
    "session_config" "jsonb" DEFAULT '{"duration_hours": 8, "max_concurrent": 3, "inactivity_minutes": 30}'::"jsonb" NOT NULL,
    "audit_retention_days" integer DEFAULT 90 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL
);


ALTER TABLE "public"."security_settings" OWNER TO "postgres";


COMMENT ON TABLE "public"."security_settings" IS 'Security policies per business';



COMMENT ON COLUMN "public"."security_settings"."password_policy" IS 'Password requirements and expiration rules';



COMMENT ON COLUMN "public"."security_settings"."two_factor_config" IS '2FA configuration: requirement level and methods';



COMMENT ON COLUMN "public"."security_settings"."session_config" IS 'Session timeout and concurrency limits';



COMMENT ON COLUMN "public"."security_settings"."audit_retention_days" IS 'How long to keep audit logs';



CREATE TABLE IF NOT EXISTS "public"."stock_alerts" (
    "id" integer NOT NULL,
    "inventory_id" integer NOT NULL,
    "alert_type" character varying(30) DEFAULT 'low_stock'::character varying,
    "current_quantity" numeric(10,2),
    "threshold_quantity" numeric(10,2),
    "status" character varying(20) DEFAULT 'active'::character varying,
    "acknowledged_by" "uuid",
    "acknowledged_at" timestamp with time zone,
    "resolved_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."stock_alerts" OWNER TO "postgres";


COMMENT ON TABLE "public"."stock_alerts" IS 'Alertas automáticas de stock bajo';



CREATE SEQUENCE IF NOT EXISTS "public"."stock_alerts_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."stock_alerts_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."stock_alerts_id_seq" OWNED BY "public"."stock_alerts"."id";



CREATE TABLE IF NOT EXISTS "public"."subscription_plans" (
    "id" integer NOT NULL,
    "name" character varying(50) NOT NULL,
    "description" "text",
    "price" numeric(10,2) DEFAULT 0,
    "currency" character varying(3) DEFAULT 'MXN'::character varying,
    "billing_period" character varying(20) DEFAULT 'monthly'::character varying,
    "max_users" integer DEFAULT 1,
    "max_locations" integer DEFAULT 1,
    "max_products" integer DEFAULT 50,
    "features" "jsonb" DEFAULT '[]'::"jsonb",
    "is_active" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "whatsapp_enabled" boolean DEFAULT false,
    "monthly_quote_limit" integer DEFAULT 0,
    "overage_price_per_quote" numeric(10,2) DEFAULT 0,
    "allow_overage" boolean DEFAULT false
);


ALTER TABLE "public"."subscription_plans" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."subscription_plans_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."subscription_plans_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."subscription_plans_id_seq" OWNED BY "public"."subscription_plans"."id";



CREATE TABLE IF NOT EXISTS "public"."suppliers" (
    "id" integer NOT NULL,
    "code" character varying(20),
    "name" character varying(200) NOT NULL,
    "legal_name" character varying(200),
    "tax_id" character varying(50),
    "contact_person" character varying(100),
    "email" character varying(100),
    "phone" character varying(20),
    "mobile" character varying(20),
    "website" character varying(200),
    "address" "text",
    "city" character varying(100),
    "state" character varying(100),
    "postal_code" character varying(20),
    "country" character varying(50) DEFAULT 'México'::character varying,
    "payment_terms" character varying(100),
    "credit_limit" numeric(12,2),
    "rating" integer,
    "is_active" boolean DEFAULT true,
    "notes" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" timestamp with time zone,
    CONSTRAINT "valid_rating" CHECK ((("rating" IS NULL) OR (("rating" >= 1) AND ("rating" <= 5))))
);


ALTER TABLE "public"."suppliers" OWNER TO "postgres";


COMMENT ON TABLE "public"."suppliers" IS 'Proveedores de productos';



COMMENT ON COLUMN "public"."suppliers"."tax_id" IS 'RFC del proveedor (México)';



COMMENT ON COLUMN "public"."suppliers"."payment_terms" IS 'Términos de pago acordados';



CREATE SEQUENCE IF NOT EXISTS "public"."suppliers_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."suppliers_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."suppliers_id_seq" OWNED BY "public"."suppliers"."id";



CREATE TABLE IF NOT EXISTS "public"."system_errors" (
    "id" bigint NOT NULL,
    "error_code" character varying(50),
    "error_message" "text" NOT NULL,
    "error_type" character varying(50),
    "severity" character varying(20) DEFAULT 'error'::character varying,
    "stack_trace" "text",
    "request_url" "text",
    "request_method" character varying(10),
    "request_body" "jsonb",
    "user_id" "uuid",
    "location_id" integer,
    "ip_address" "inet",
    "user_agent" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "resolved" boolean DEFAULT false,
    "resolved_at" timestamp with time zone,
    "resolved_by" "uuid",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."system_errors" OWNER TO "postgres";


COMMENT ON TABLE "public"."system_errors" IS 'Log de errores del sistema para debugging y monitoreo';



CREATE SEQUENCE IF NOT EXISTS "public"."system_errors_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."system_errors_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."system_errors_id_seq" OWNED BY "public"."system_errors"."id";



CREATE TABLE IF NOT EXISTS "public"."ticket_attachments" (
    "id" integer NOT NULL,
    "ticket_id" integer NOT NULL,
    "comment_id" integer,
    "file_name" character varying(255) NOT NULL,
    "file_url" "text" NOT NULL,
    "file_size" integer,
    "file_type" character varying(100),
    "uploaded_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."ticket_attachments" OWNER TO "postgres";


COMMENT ON TABLE "public"."ticket_attachments" IS 'Archivos adjuntos en tickets';



CREATE SEQUENCE IF NOT EXISTS "public"."ticket_attachments_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."ticket_attachments_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."ticket_attachments_id_seq" OWNED BY "public"."ticket_attachments"."id";



CREATE SEQUENCE IF NOT EXISTS "public"."ticket_categories_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."ticket_categories_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."ticket_categories_id_seq" OWNED BY "public"."ticket_categories"."id";



CREATE TABLE IF NOT EXISTS "public"."ticket_comments" (
    "id" integer NOT NULL,
    "ticket_id" integer NOT NULL,
    "comment" "text" NOT NULL,
    "is_internal" boolean DEFAULT false,
    "is_resolution" boolean DEFAULT false,
    "attachments" "jsonb",
    "created_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" timestamp with time zone
);


ALTER TABLE "public"."ticket_comments" OWNER TO "postgres";


COMMENT ON TABLE "public"."ticket_comments" IS 'Comentarios y respuestas en tickets';



COMMENT ON COLUMN "public"."ticket_comments"."is_internal" IS 'Si es nota interna del equipo de soporte';



CREATE SEQUENCE IF NOT EXISTS "public"."ticket_comments_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."ticket_comments_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."ticket_comments_id_seq" OWNED BY "public"."ticket_comments"."id";



CREATE TABLE IF NOT EXISTS "public"."ticket_history" (
    "id" bigint NOT NULL,
    "ticket_id" integer NOT NULL,
    "field_name" character varying(50) NOT NULL,
    "old_value" "text",
    "new_value" "text",
    "changed_by" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."ticket_history" OWNER TO "postgres";


COMMENT ON TABLE "public"."ticket_history" IS 'Historial de cambios en tickets para auditoría';



CREATE SEQUENCE IF NOT EXISTS "public"."ticket_history_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."ticket_history_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."ticket_history_id_seq" OWNED BY "public"."ticket_history"."id";



CREATE SEQUENCE IF NOT EXISTS "public"."tickets_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."tickets_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."tickets_id_seq" OWNED BY "public"."tickets"."id";



CREATE TABLE IF NOT EXISTS "public"."user_activity_log" (
    "id" bigint NOT NULL,
    "user_id" "uuid" NOT NULL,
    "location_id" integer,
    "activity_type" character varying(50) NOT NULL,
    "entity_type" character varying(50),
    "entity_id" character varying(100),
    "description" "text",
    "ip_address" "inet",
    "user_agent" "text",
    "metadata" "jsonb" DEFAULT '{}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE "public"."user_activity_log" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_activity_log" IS 'Log de actividades de usuarios para análisis y seguridad';



CREATE SEQUENCE IF NOT EXISTS "public"."user_activity_log_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."user_activity_log_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."user_activity_log_id_seq" OWNED BY "public"."user_activity_log"."id";



CREATE TABLE IF NOT EXISTS "public"."user_cleanup_audit" (
    "id" integer NOT NULL,
    "user_id" "uuid" NOT NULL,
    "deleted_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "details" "jsonb"
);


ALTER TABLE "public"."user_cleanup_audit" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."user_cleanup_audit_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."user_cleanup_audit_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."user_cleanup_audit_id_seq" OWNED BY "public"."user_cleanup_audit"."id";



CREATE TABLE IF NOT EXISTS "public"."user_details_archive" (
    "id" "uuid" NOT NULL,
    "email" character varying(255),
    "first_name" character varying(100),
    "last_name" character varying(100),
    "phone" character varying(20),
    "business_id" integer,
    "role_id" integer,
    "default_location_id" integer,
    "is_active" boolean DEFAULT false,
    "last_login_at" timestamp with time zone,
    "archived_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "archived_by" "uuid",
    "removal_reason" "text",
    "original_created_at" timestamp with time zone,
    "original_updated_at" timestamp with time zone,
    "assigned_locations" "jsonb"
);


ALTER TABLE "public"."user_details_archive" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_details_archive" IS 'Archive of removed team members for record keeping';



CREATE TABLE IF NOT EXISTS "public"."user_locations" (
    "id" integer NOT NULL,
    "user_id" "uuid" NOT NULL,
    "location_id" integer NOT NULL,
    "is_primary" boolean DEFAULT false,
    "assigned_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "assigned_by" "uuid"
);


ALTER TABLE "public"."user_locations" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_locations" IS 'Asignación de usuarios a múltiples sucursales';



COMMENT ON COLUMN "public"."user_locations"."is_primary" IS 'Marca la sucursal principal de trabajo del usuario';



CREATE SEQUENCE IF NOT EXISTS "public"."user_locations_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."user_locations_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."user_locations_id_seq" OWNED BY "public"."user_locations"."id";



CREATE TABLE IF NOT EXISTS "public"."user_preferences" (
    "id" bigint NOT NULL,
    "user_id" "uuid" NOT NULL,
    "business_id" integer NOT NULL,
    "default_view" character varying(20) DEFAULT 'auto'::character varying,
    "sidebar_collapsed" boolean DEFAULT false,
    "theme" character varying(20) DEFAULT 'system'::character varying,
    "accent_color" character varying(7) DEFAULT '#10b981'::character varying,
    "quick_products" "jsonb" DEFAULT '[]'::"jsonb",
    "keyboard_shortcuts" "jsonb" DEFAULT '{"cancel": "Escape", "search": "F2", "checkout": "F12", "discount": "F8", "addCustomer": "F3"}'::"jsonb",
    "auto_print_receipt" boolean DEFAULT false,
    "sound_enabled" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT "user_preferences_default_view_check" CHECK ((("default_view")::"text" = ANY ((ARRAY['auto'::character varying, 'admin'::character varying, 'seller'::character varying])::"text"[]))),
    CONSTRAINT "user_preferences_theme_check" CHECK ((("theme")::"text" = ANY ((ARRAY['light'::character varying, 'dark'::character varying, 'system'::character varying])::"text"[])))
);


ALTER TABLE "public"."user_preferences" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_preferences" IS 'Stores user-specific UI preferences and settings';



CREATE SEQUENCE IF NOT EXISTS "public"."user_preferences_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."user_preferences_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."user_preferences_id_seq" OWNED BY "public"."user_preferences"."id";



CREATE TABLE IF NOT EXISTS "public"."user_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "location_id" integer,
    "ip_address" "inet",
    "user_agent" "text",
    "started_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    "ended_at" timestamp with time zone,
    "is_active" boolean DEFAULT true,
    "business_id" integer
);


ALTER TABLE "public"."user_sessions" OWNER TO "postgres";


COMMENT ON TABLE "public"."user_sessions" IS 'Sesiones activas de usuarios para auditoría y seguridad';



CREATE TABLE IF NOT EXISTS "public"."whatsapp_numbers" (
    "id" integer NOT NULL,
    "phone_number" character varying(20) NOT NULL,
    "twilio_phone_sid" character varying(50),
    "business_id" integer,
    "assigned_at" timestamp with time zone,
    "assigned_by" "uuid",
    "is_active" boolean DEFAULT true,
    "is_verified" boolean DEFAULT false,
    "friendly_name" character varying(100),
    "notes" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "evolution_instance_name" character varying(100),
    "evolution_api_url" character varying(255) DEFAULT 'http://evolution_api_pos:8080'::character varying,
    "connection_type" character varying(20) DEFAULT 'twilio'::character varying,
    CONSTRAINT "whatsapp_numbers_connection_type_check" CHECK ((("connection_type")::"text" = ANY ((ARRAY['twilio'::character varying, 'evolution'::character varying])::"text"[])))
);


ALTER TABLE "public"."whatsapp_numbers" OWNER TO "postgres";


COMMENT ON TABLE "public"."whatsapp_numbers" IS 'Pool de números WhatsApp de la plataforma para asignar a negocios';



COMMENT ON COLUMN "public"."whatsapp_numbers"."evolution_instance_name" IS 'Name of the Evolution API instance for this number';



COMMENT ON COLUMN "public"."whatsapp_numbers"."connection_type" IS 'Type of WhatsApp connection: twilio or evolution';



CREATE SEQUENCE IF NOT EXISTS "public"."whatsapp_numbers_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."whatsapp_numbers_id_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."whatsapp_numbers_id_seq" OWNED BY "public"."whatsapp_numbers"."id";



ALTER TABLE ONLY "public"."audit_log" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."audit_log_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."business_payment_settings" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."business_payment_settings_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."businesses" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."businesses_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."cash_register_movements" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."cash_register_movements_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."cash_register_shifts" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."cash_register_shifts_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."cash_registers" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."cash_registers_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."categories" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."categories_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."customer_addresses" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."customer_addresses_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."customer_credit_history" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."customer_credit_history_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."customers" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."customers_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."inventory" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."inventory_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."inventory_movements" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."inventory_movements_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."inventory_transfer_items" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."inventory_transfer_items_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."inventory_transfers" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."inventory_transfers_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."locations" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."locations_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."notification_preferences" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."notification_preferences_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."notifications" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."notifications_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."offline_sync_queue" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."offline_sync_queue_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."payment_methods" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."payment_methods_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."payment_transactions" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."payment_transactions_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."product_variants" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."product_variants_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."products" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."products_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."purchase_order_items" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."purchase_order_items_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."purchase_orders" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."purchase_orders_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."purchase_receipt_items" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."purchase_receipt_items_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."purchase_receipts" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."purchase_receipts_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."quote_automation_settings" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."quote_automation_settings_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."quote_follow_ups" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."quote_follow_ups_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."quote_items" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."quote_items_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."quote_usage_monthly" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."quote_usage_monthly_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."quotes" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."quotes_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."refunds" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."refunds_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."roles" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."custom_roles_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."sale_items" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."sale_items_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."sales" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."sales_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."stock_alerts" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."stock_alerts_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."subscription_plans" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."subscription_plans_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."suppliers" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."suppliers_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."system_errors" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."system_errors_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."ticket_attachments" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."ticket_attachments_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."ticket_categories" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."ticket_categories_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."ticket_comments" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."ticket_comments_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."ticket_history" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."ticket_history_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."tickets" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."tickets_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."user_activity_log" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."user_activity_log_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."user_cleanup_audit" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."user_cleanup_audit_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."user_locations" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."user_locations_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."user_preferences" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."user_preferences_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."whatsapp_numbers" ALTER COLUMN "id" SET DEFAULT "nextval"('"public"."whatsapp_numbers_id_seq"'::"regclass");



ALTER TABLE ONLY "public"."audit_log"
    ADD CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."business_payment_settings"
    ADD CONSTRAINT "business_payment_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."businesses"
    ADD CONSTRAINT "businesses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cash_register_movements"
    ADD CONSTRAINT "cash_register_movements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cash_register_shifts"
    ADD CONSTRAINT "cash_register_shifts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."cash_register_shifts"
    ADD CONSTRAINT "cash_register_shifts_shift_number_key" UNIQUE ("shift_number");



ALTER TABLE ONLY "public"."cash_registers"
    ADD CONSTRAINT "cash_registers_business_id_code_key" UNIQUE ("business_id", "code");



ALTER TABLE ONLY "public"."cash_registers"
    ADD CONSTRAINT "cash_registers_location_id_code_key" UNIQUE ("location_id", "code");



ALTER TABLE ONLY "public"."cash_registers"
    ADD CONSTRAINT "cash_registers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."roles"
    ADD CONSTRAINT "custom_roles_business_id_name_key" UNIQUE ("business_id", "name");



ALTER TABLE ONLY "public"."roles"
    ADD CONSTRAINT "custom_roles_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customer_addresses"
    ADD CONSTRAINT "customer_addresses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customer_credit_history"
    ADD CONSTRAINT "customer_credit_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_customer_number_key" UNIQUE ("customer_number");



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."email_templates"
    ADD CONSTRAINT "email_templates_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inventory_movements"
    ADD CONSTRAINT "inventory_movements_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inventory"
    ADD CONSTRAINT "inventory_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inventory"
    ADD CONSTRAINT "inventory_product_id_location_id_key" UNIQUE ("product_id", "location_id");



ALTER TABLE ONLY "public"."inventory"
    ADD CONSTRAINT "inventory_product_location_variant_unique" UNIQUE ("product_id", "location_id", "variant_id");



ALTER TABLE ONLY "public"."inventory_transfer_items"
    ADD CONSTRAINT "inventory_transfer_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inventory_transfers"
    ADD CONSTRAINT "inventory_transfers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."inventory_transfers"
    ADD CONSTRAINT "inventory_transfers_transfer_number_key" UNIQUE ("transfer_number");



ALTER TABLE ONLY "public"."locations"
    ADD CONSTRAINT "locations_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."locations"
    ADD CONSTRAINT "locations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notification_preferences"
    ADD CONSTRAINT "notification_preferences_business_id_key" UNIQUE ("business_id");



ALTER TABLE ONLY "public"."notification_preferences"
    ADD CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notification_settings"
    ADD CONSTRAINT "notification_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."offline_sync_queue"
    ADD CONSTRAINT "offline_sync_queue_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payment_methods"
    ADD CONSTRAINT "payment_methods_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."payment_methods"
    ADD CONSTRAINT "payment_methods_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."payment_transactions"
    ADD CONSTRAINT "payment_transactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_variants"
    ADD CONSTRAINT "product_variants_barcode_key" UNIQUE ("barcode");



ALTER TABLE ONLY "public"."product_variants"
    ADD CONSTRAINT "product_variants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."product_variants"
    ADD CONSTRAINT "product_variants_sku_key" UNIQUE ("sku");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_barcode_key" UNIQUE ("barcode");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_sku_key" UNIQUE ("sku");



ALTER TABLE ONLY "public"."purchase_order_items"
    ADD CONSTRAINT "purchase_order_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."purchase_orders"
    ADD CONSTRAINT "purchase_orders_order_number_key" UNIQUE ("order_number");



ALTER TABLE ONLY "public"."purchase_orders"
    ADD CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."purchase_receipt_items"
    ADD CONSTRAINT "purchase_receipt_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."purchase_receipts"
    ADD CONSTRAINT "purchase_receipts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."purchase_receipts"
    ADD CONSTRAINT "purchase_receipts_receipt_number_key" UNIQUE ("receipt_number");



ALTER TABLE ONLY "public"."quote_automation_settings"
    ADD CONSTRAINT "quote_automation_settings_business_id_key" UNIQUE ("business_id");



ALTER TABLE ONLY "public"."quote_automation_settings"
    ADD CONSTRAINT "quote_automation_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quote_conversation_sessions"
    ADD CONSTRAINT "quote_conversation_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quote_follow_ups"
    ADD CONSTRAINT "quote_follow_ups_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quote_items"
    ADD CONSTRAINT "quote_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quote_usage_monthly"
    ADD CONSTRAINT "quote_usage_monthly_business_id_year_month_key" UNIQUE ("business_id", "year_month");



ALTER TABLE ONLY "public"."quote_usage_monthly"
    ADD CONSTRAINT "quote_usage_monthly_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quotes"
    ADD CONSTRAINT "quotes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quotes"
    ADD CONSTRAINT "quotes_quote_number_key" UNIQUE ("quote_number");



ALTER TABLE ONLY "public"."refunds"
    ADD CONSTRAINT "refunds_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."refunds"
    ADD CONSTRAINT "refunds_refund_number_key" UNIQUE ("refund_number");



ALTER TABLE ONLY "public"."sale_items"
    ADD CONSTRAINT "sale_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sales"
    ADD CONSTRAINT "sales_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sales"
    ADD CONSTRAINT "sales_sale_number_key" UNIQUE ("sale_number");



ALTER TABLE ONLY "public"."security_settings"
    ADD CONSTRAINT "security_settings_pkey" PRIMARY KEY ("business_id");



ALTER TABLE ONLY "public"."stock_alerts"
    ADD CONSTRAINT "stock_alerts_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."subscription_plans"
    ADD CONSTRAINT "subscription_plans_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."subscription_plans"
    ADD CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."suppliers"
    ADD CONSTRAINT "suppliers_code_key" UNIQUE ("code");



ALTER TABLE ONLY "public"."suppliers"
    ADD CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."system_errors"
    ADD CONSTRAINT "system_errors_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ticket_attachments"
    ADD CONSTRAINT "ticket_attachments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ticket_categories"
    ADD CONSTRAINT "ticket_categories_name_key" UNIQUE ("name");



ALTER TABLE ONLY "public"."ticket_categories"
    ADD CONSTRAINT "ticket_categories_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ticket_comments"
    ADD CONSTRAINT "ticket_comments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."ticket_history"
    ADD CONSTRAINT "ticket_history_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tickets"
    ADD CONSTRAINT "tickets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."tickets"
    ADD CONSTRAINT "tickets_ticket_number_key" UNIQUE ("ticket_number");



ALTER TABLE ONLY "public"."email_templates"
    ADD CONSTRAINT "unique_business_event" UNIQUE ("business_id", "event_type");



ALTER TABLE ONLY "public"."business_payment_settings"
    ADD CONSTRAINT "unique_business_payment" UNIQUE ("business_id", "payment_method_id");



ALTER TABLE ONLY "public"."notification_settings"
    ADD CONSTRAINT "unique_business_user_notif" UNIQUE ("business_id", "user_id");



ALTER TABLE ONLY "public"."user_activity_log"
    ADD CONSTRAINT "user_activity_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_cleanup_audit"
    ADD CONSTRAINT "user_cleanup_audit_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_details_archive"
    ADD CONSTRAINT "user_details_archive_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_details"
    ADD CONSTRAINT "user_details_email_key" UNIQUE ("email");



ALTER TABLE ONLY "public"."user_details"
    ADD CONSTRAINT "user_details_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_locations"
    ADD CONSTRAINT "user_locations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_locations"
    ADD CONSTRAINT "user_locations_user_id_location_id_key" UNIQUE ("user_id", "location_id");



ALTER TABLE ONLY "public"."user_preferences"
    ADD CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_preferences"
    ADD CONSTRAINT "user_preferences_user_id_business_id_key" UNIQUE ("user_id", "business_id");



ALTER TABLE ONLY "public"."user_sessions"
    ADD CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."whatsapp_numbers"
    ADD CONSTRAINT "whatsapp_numbers_phone_number_key" UNIQUE ("phone_number");



ALTER TABLE ONLY "public"."whatsapp_numbers"
    ADD CONSTRAINT "whatsapp_numbers_pkey" PRIMARY KEY ("id");



CREATE INDEX "idx_audit_log_created" ON "public"."audit_log" USING "btree" ("created_at");



CREATE INDEX "idx_audit_log_session" ON "public"."audit_log" USING "btree" ("session_id", "created_at" DESC) WHERE ("session_id" IS NOT NULL);



CREATE INDEX "idx_audit_log_table_action" ON "public"."audit_log" USING "btree" ("table_name", "action", "created_at" DESC) WHERE (("table_name")::"text" = ANY ((ARRAY['businesses'::character varying, 'user_details'::character varying, 'sales'::character varying, 'inventory'::character varying, 'products'::character varying])::"text"[]));



COMMENT ON INDEX "public"."idx_audit_log_table_action" IS 'Optimize filtered audit log queries';



CREATE INDEX "idx_audit_log_table_record" ON "public"."audit_log" USING "btree" ("table_name", "record_id");



CREATE INDEX "idx_audit_log_user" ON "public"."audit_log" USING "btree" ("user_id");



CREATE INDEX "idx_audit_log_user_date" ON "public"."audit_log" USING "btree" ("user_id", "created_at" DESC) WHERE ("user_id" IS NOT NULL);



COMMENT ON INDEX "public"."idx_audit_log_user_date" IS 'Optimize user activity queries';



CREATE INDEX "idx_business_payment_settings_business" ON "public"."business_payment_settings" USING "btree" ("business_id") WHERE ("is_enabled" = true);



CREATE INDEX "idx_business_payment_settings_order" ON "public"."business_payment_settings" USING "btree" ("business_id", "display_order");



CREATE INDEX "idx_businesses_active" ON "public"."businesses" USING "btree" ("is_active") WHERE ("deleted_at" IS NULL);



CREATE INDEX "idx_businesses_owner" ON "public"."businesses" USING "btree" ("owner_id");



CREATE INDEX "idx_cash_registers_business_id" ON "public"."cash_registers" USING "btree" ("business_id");



CREATE INDEX "idx_cash_registers_is_active" ON "public"."cash_registers" USING "btree" ("is_active") WHERE ("is_active" = true);



CREATE INDEX "idx_cash_registers_location_id" ON "public"."cash_registers" USING "btree" ("location_id");



CREATE INDEX "idx_categories_business" ON "public"."categories" USING "btree" ("business_id");



CREATE INDEX "idx_custom_roles_business" ON "public"."roles" USING "btree" ("business_id");



CREATE INDEX "idx_customers_business" ON "public"."customers" USING "btree" ("business_id");



CREATE INDEX "idx_daily_sales_date" ON "public"."mv_daily_sales_by_location" USING "btree" ("sale_date");



CREATE UNIQUE INDEX "idx_daily_sales_location_date" ON "public"."mv_daily_sales_by_location" USING "btree" ("location_id", "sale_date");



CREATE INDEX "idx_email_templates_active" ON "public"."email_templates" USING "btree" ("business_id", "event_type") WHERE ("is_active" = true);



CREATE INDEX "idx_email_templates_business" ON "public"."email_templates" USING "btree" ("business_id");



CREATE INDEX "idx_email_templates_event" ON "public"."email_templates" USING "btree" ("event_type");



CREATE INDEX "idx_inventory_business" ON "public"."inventory" USING "btree" ("business_id");



CREATE INDEX "idx_inventory_movements_business" ON "public"."inventory_movements" USING "btree" ("business_id");



CREATE INDEX "idx_inventory_variant_id" ON "public"."inventory" USING "btree" ("variant_id");



CREATE INDEX "idx_locations_business" ON "public"."locations" USING "btree" ("business_id");



CREATE UNIQUE INDEX "idx_locations_main_per_business" ON "public"."locations" USING "btree" ("business_id", "main_location") WHERE ("main_location" = 1);



CREATE INDEX "idx_movements_created_at" ON "public"."cash_register_movements" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_movements_sale_id" ON "public"."cash_register_movements" USING "btree" ("sale_id") WHERE ("sale_id" IS NOT NULL);



CREATE INDEX "idx_movements_shift_id" ON "public"."cash_register_movements" USING "btree" ("shift_id");



CREATE INDEX "idx_movements_type" ON "public"."cash_register_movements" USING "btree" ("movement_type");



CREATE INDEX "idx_movements_user_id" ON "public"."cash_register_movements" USING "btree" ("user_id");



CREATE UNIQUE INDEX "idx_mv_customer_analysis_id" ON "public"."mv_customer_analysis" USING "btree" ("customer_id");



CREATE INDEX "idx_mv_customer_status" ON "public"."mv_customer_analysis" USING "btree" ("customer_status");



CREATE UNIQUE INDEX "idx_mv_inventory_location_product" ON "public"."mv_inventory_valuation" USING "btree" ("location_id", "product_id");



CREATE INDEX "idx_mv_inventory_status" ON "public"."mv_inventory_valuation" USING "btree" ("stock_status");



CREATE UNIQUE INDEX "idx_mv_quote_conversion_loc_month" ON "public"."mv_quote_conversion_rate" USING "btree" ("location_id", "month");



CREATE UNIQUE INDEX "idx_mv_seller_performance_user_loc_month" ON "public"."mv_seller_performance" USING "btree" ("user_id", "location_id", "month");



CREATE INDEX "idx_mv_ticket_metrics_loc_month" ON "public"."mv_ticket_metrics" USING "btree" ("location_id", "month");



CREATE INDEX "idx_notification_settings_business" ON "public"."notification_settings" USING "btree" ("business_id");



CREATE INDEX "idx_notification_settings_business_default" ON "public"."notification_settings" USING "btree" ("business_id") WHERE ("user_id" IS NULL);



CREATE INDEX "idx_notification_settings_user" ON "public"."notification_settings" USING "btree" ("user_id");



CREATE INDEX "idx_notifications_business_user" ON "public"."notifications" USING "btree" ("business_id", "user_id", "read");



CREATE INDEX "idx_notifications_created" ON "public"."notifications" USING "btree" ("created_at");



CREATE INDEX "idx_notifications_created_at" ON "public"."notifications" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_notifications_location" ON "public"."notifications" USING "btree" ("location_id") WHERE ("location_id" IS NOT NULL);



CREATE INDEX "idx_notifications_read" ON "public"."notifications" USING "btree" ("is_read");



CREATE INDEX "idx_notifications_type" ON "public"."notifications" USING "btree" ("type");



CREATE INDEX "idx_notifications_unread" ON "public"."notifications" USING "btree" ("business_id", "read") WHERE ("read" = false);



CREATE INDEX "idx_notifications_user" ON "public"."notifications" USING "btree" ("user_id");



CREATE INDEX "idx_offline_queue_created_at" ON "public"."offline_sync_queue" USING "btree" ("created_at");



CREATE INDEX "idx_offline_queue_status" ON "public"."offline_sync_queue" USING "btree" ("status") WHERE (("status")::"text" = ANY ((ARRAY['pending'::character varying, 'failed'::character varying])::"text"[]));



CREATE INDEX "idx_offline_queue_user_id" ON "public"."offline_sync_queue" USING "btree" ("user_id");



CREATE INDEX "idx_products_business" ON "public"."products" USING "btree" ("business_id");



CREATE INDEX "idx_products_is_favorite" ON "public"."products" USING "btree" ("is_favorite") WHERE ("is_favorite" = true);



CREATE INDEX "idx_products_sale_frequency" ON "public"."products" USING "btree" ("sale_frequency" DESC);



CREATE INDEX "idx_quote_automation_whatsapp_number" ON "public"."quote_automation_settings" USING "btree" ("twilio_whatsapp_number") WHERE ("twilio_whatsapp_number" IS NOT NULL);



CREATE INDEX "idx_quote_conv_sessions_business" ON "public"."quote_conversation_sessions" USING "btree" ("business_id");



CREATE INDEX "idx_quote_conv_sessions_channel" ON "public"."quote_conversation_sessions" USING "btree" ("channel");



CREATE INDEX "idx_quote_conv_sessions_customer_email" ON "public"."quote_conversation_sessions" USING "btree" ("customer_email");



CREATE INDEX "idx_quote_conv_sessions_customer_phone" ON "public"."quote_conversation_sessions" USING "btree" ("customer_phone");



CREATE INDEX "idx_quote_conv_sessions_expires" ON "public"."quote_conversation_sessions" USING "btree" ("expires_at") WHERE (("status")::"text" = 'active'::"text");



CREATE INDEX "idx_quote_conv_sessions_status" ON "public"."quote_conversation_sessions" USING "btree" ("status");



CREATE INDEX "idx_quote_items_product" ON "public"."quote_items" USING "btree" ("product_id");



CREATE INDEX "idx_quote_items_quote" ON "public"."quote_items" USING "btree" ("quote_id");



CREATE INDEX "idx_quote_usage_business_month" ON "public"."quote_usage_monthly" USING "btree" ("business_id", "year_month");



CREATE INDEX "idx_quotes_business" ON "public"."quotes" USING "btree" ("business_id");



CREATE INDEX "idx_quotes_created_by" ON "public"."quotes" USING "btree" ("created_by");



CREATE INDEX "idx_quotes_customer" ON "public"."quotes" USING "btree" ("customer_id");



CREATE INDEX "idx_quotes_date" ON "public"."quotes" USING "btree" ("quote_date");



CREATE INDEX "idx_quotes_expiry" ON "public"."quotes" USING "btree" ("expiry_date");



CREATE INDEX "idx_quotes_location" ON "public"."quotes" USING "btree" ("location_id");



CREATE INDEX "idx_quotes_status" ON "public"."quotes" USING "btree" ("status");



CREATE INDEX "idx_sale_items_variant_id" ON "public"."sale_items" USING "btree" ("variant_id");



CREATE INDEX "idx_sales_business" ON "public"."sales" USING "btree" ("business_id");



CREATE INDEX "idx_sales_offline_id" ON "public"."sales" USING "btree" ("offline_id") WHERE ("offline_id" IS NOT NULL);



CREATE INDEX "idx_sales_shift_id" ON "public"."sales" USING "btree" ("shift_id");



CREATE INDEX "idx_shifts_cash_register_id" ON "public"."cash_register_shifts" USING "btree" ("cash_register_id");



CREATE INDEX "idx_shifts_opened_at" ON "public"."cash_register_shifts" USING "btree" ("opened_at" DESC);



CREATE INDEX "idx_shifts_status" ON "public"."cash_register_shifts" USING "btree" ("status");



CREATE INDEX "idx_shifts_user_id" ON "public"."cash_register_shifts" USING "btree" ("user_id");



CREATE INDEX "idx_system_errors_created" ON "public"."system_errors" USING "btree" ("created_at");



CREATE INDEX "idx_system_errors_resolved" ON "public"."system_errors" USING "btree" ("resolved");



CREATE INDEX "idx_system_errors_severity" ON "public"."system_errors" USING "btree" ("severity");



CREATE INDEX "idx_top_products_location" ON "public"."mv_top_selling_products" USING "btree" ("location_id");



CREATE INDEX "idx_top_products_quantity" ON "public"."mv_top_selling_products" USING "btree" ("total_quantity_sold" DESC);



CREATE INDEX "idx_transfer_items_product" ON "public"."inventory_transfer_items" USING "btree" ("product_id");



CREATE INDEX "idx_transfer_items_transfer" ON "public"."inventory_transfer_items" USING "btree" ("transfer_id");



CREATE INDEX "idx_transfers_business" ON "public"."inventory_transfers" USING "btree" ("business_id");



CREATE INDEX "idx_transfers_expires_at" ON "public"."inventory_transfers" USING "btree" ("expires_at") WHERE ("expires_at" IS NOT NULL);



CREATE INDEX "idx_transfers_from_location" ON "public"."inventory_transfers" USING "btree" ("from_location_id");



CREATE INDEX "idx_transfers_requested_at" ON "public"."inventory_transfers" USING "btree" ("requested_at");



CREATE INDEX "idx_transfers_status" ON "public"."inventory_transfers" USING "btree" ("status");



CREATE INDEX "idx_transfers_to_location" ON "public"."inventory_transfers" USING "btree" ("to_location_id");



CREATE INDEX "idx_user_activity_created" ON "public"."user_activity_log" USING "btree" ("created_at");



CREATE INDEX "idx_user_activity_type" ON "public"."user_activity_log" USING "btree" ("activity_type");



CREATE INDEX "idx_user_activity_user" ON "public"."user_activity_log" USING "btree" ("user_id");



CREATE INDEX "idx_user_archive_archived_at" ON "public"."user_details_archive" USING "btree" ("archived_at");



CREATE INDEX "idx_user_archive_business" ON "public"."user_details_archive" USING "btree" ("business_id");



CREATE INDEX "idx_user_archive_email" ON "public"."user_details_archive" USING "btree" ("email");



CREATE INDEX "idx_user_details_business" ON "public"."user_details" USING "btree" ("business_id");



CREATE INDEX "idx_user_details_default_location_id" ON "public"."user_details" USING "btree" ("default_location_id");



CREATE INDEX "idx_user_details_email" ON "public"."user_details" USING "btree" ("email");



CREATE INDEX "idx_user_details_is_active" ON "public"."user_details" USING "btree" ("is_active");



CREATE UNIQUE INDEX "idx_user_details_username" ON "public"."user_details" USING "btree" ("username") WHERE ("username" IS NOT NULL);



CREATE INDEX "idx_user_details_username_lookup" ON "public"."user_details" USING "btree" ("username") WHERE (("username" IS NOT NULL) AND ("deleted_at" IS NULL));



CREATE INDEX "idx_user_preferences_business_id" ON "public"."user_preferences" USING "btree" ("business_id");



CREATE INDEX "idx_user_preferences_user_id" ON "public"."user_preferences" USING "btree" ("user_id");



CREATE INDEX "idx_user_sessions_business" ON "public"."user_sessions" USING "btree" ("business_id");



CREATE INDEX "idx_whatsapp_numbers_available" ON "public"."whatsapp_numbers" USING "btree" ("is_active") WHERE (("business_id" IS NULL) AND ("is_active" = true));



CREATE INDEX "idx_whatsapp_numbers_business" ON "public"."whatsapp_numbers" USING "btree" ("business_id") WHERE ("business_id" IS NOT NULL);



CREATE INDEX "idx_whatsapp_numbers_evolution_instance" ON "public"."whatsapp_numbers" USING "btree" ("evolution_instance_name") WHERE ("evolution_instance_name" IS NOT NULL);



CREATE UNIQUE INDEX "products_business_barcode_unique" ON "public"."products" USING "btree" ("business_id", "barcode") WHERE (("deleted_at" IS NULL) AND ("barcode" IS NOT NULL));



CREATE UNIQUE INDEX "roles_system_name_unique" ON "public"."roles" USING "btree" ("name") WHERE ("business_id" IS NULL);



CREATE OR REPLACE TRIGGER "tr_categories_business" BEFORE INSERT ON "public"."categories" FOR EACH ROW EXECUTE FUNCTION "public"."auto_assign_business_id"();



CREATE OR REPLACE TRIGGER "tr_categories_updated_at" BEFORE UPDATE ON "public"."categories" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "tr_customers_business" BEFORE INSERT ON "public"."customers" FOR EACH ROW EXECUTE FUNCTION "public"."auto_assign_business_id"();



CREATE OR REPLACE TRIGGER "tr_customers_updated_at" BEFORE UPDATE ON "public"."customers" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "tr_inventory_business" BEFORE INSERT ON "public"."inventory" FOR EACH ROW EXECUTE FUNCTION "public"."auto_assign_business_id"();



CREATE OR REPLACE TRIGGER "tr_inventory_check_stock" AFTER INSERT OR UPDATE ON "public"."inventory" FOR EACH ROW EXECUTE FUNCTION "public"."check_low_stock"();



CREATE OR REPLACE TRIGGER "tr_inventory_log_movement" AFTER UPDATE ON "public"."inventory" FOR EACH ROW EXECUTE FUNCTION "public"."log_inventory_movement"();



CREATE OR REPLACE TRIGGER "tr_inventory_movements_business" BEFORE INSERT ON "public"."inventory_movements" FOR EACH ROW EXECUTE FUNCTION "public"."auto_assign_business_id"();



CREATE OR REPLACE TRIGGER "tr_inventory_updated_at" BEFORE UPDATE ON "public"."inventory" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "tr_locations_business" BEFORE INSERT ON "public"."locations" FOR EACH ROW EXECUTE FUNCTION "public"."auto_assign_business_id"();



CREATE OR REPLACE TRIGGER "tr_locations_updated_at" BEFORE UPDATE ON "public"."locations" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "tr_po_items_update_totals" AFTER INSERT OR DELETE OR UPDATE ON "public"."purchase_order_items" FOR EACH ROW EXECUTE FUNCTION "public"."update_purchase_order_totals"();



CREATE OR REPLACE TRIGGER "tr_products_audit" AFTER INSERT OR DELETE OR UPDATE ON "public"."products" FOR EACH ROW EXECUTE FUNCTION "public"."audit_trigger_func"();



CREATE OR REPLACE TRIGGER "tr_products_business" BEFORE INSERT ON "public"."products" FOR EACH ROW EXECUTE FUNCTION "public"."auto_assign_business_id"();



CREATE OR REPLACE TRIGGER "tr_products_updated_at" BEFORE UPDATE ON "public"."products" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "tr_purchase_orders_updated_at" BEFORE UPDATE ON "public"."purchase_orders" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "tr_quote_items_update_totals" AFTER INSERT OR DELETE OR UPDATE ON "public"."quote_items" FOR EACH ROW EXECUTE FUNCTION "public"."update_quote_totals"();



CREATE OR REPLACE TRIGGER "tr_quotes_updated_at" BEFORE UPDATE ON "public"."quotes" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "tr_sales_audit" AFTER INSERT OR DELETE OR UPDATE ON "public"."sales" FOR EACH ROW EXECUTE FUNCTION "public"."audit_trigger_func"();



CREATE OR REPLACE TRIGGER "tr_sales_business" BEFORE INSERT ON "public"."sales" FOR EACH ROW EXECUTE FUNCTION "public"."auto_assign_business_id"();



CREATE OR REPLACE TRIGGER "tr_sales_updated_at" BEFORE UPDATE ON "public"."sales" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "tr_suppliers_updated_at" BEFORE UPDATE ON "public"."suppliers" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "tr_tickets_updated_at" BEFORE UPDATE ON "public"."tickets" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "tr_user_details_audit" AFTER INSERT OR DELETE OR UPDATE ON "public"."user_details" FOR EACH ROW EXECUTE FUNCTION "public"."audit_trigger_func"();



CREATE OR REPLACE TRIGGER "tr_user_details_updated_at" BEFORE UPDATE ON "public"."user_details" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "trigger_increment_product_sale_frequency" AFTER INSERT ON "public"."sale_items" FOR EACH ROW EXECUTE FUNCTION "public"."increment_product_sale_frequency"();



CREATE OR REPLACE TRIGGER "trigger_update_notification_preferences_updated_at" BEFORE UPDATE ON "public"."notification_preferences" FOR EACH ROW EXECUTE FUNCTION "public"."update_notification_preferences_updated_at"();



CREATE OR REPLACE TRIGGER "trigger_update_transfer_timestamp" BEFORE UPDATE ON "public"."inventory_transfers" FOR EACH ROW EXECUTE FUNCTION "public"."update_transfer_timestamp"();



CREATE OR REPLACE TRIGGER "update_cash_register_shifts_updated_at" BEFORE UPDATE ON "public"."cash_register_shifts" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_cash_registers_updated_at" BEFORE UPDATE ON "public"."cash_registers" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_user_preferences_updated_at" BEFORE UPDATE ON "public"."user_preferences" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."audit_log"
    ADD CONSTRAINT "audit_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user_details"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."business_payment_settings"
    ADD CONSTRAINT "business_payment_settings_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."business_payment_settings"
    ADD CONSTRAINT "business_payment_settings_payment_method_id_fkey" FOREIGN KEY ("payment_method_id") REFERENCES "public"."payment_methods"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."businesses"
    ADD CONSTRAINT "businesses_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."businesses"
    ADD CONSTRAINT "businesses_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "public"."subscription_plans"("id");



ALTER TABLE ONLY "public"."businesses"
    ADD CONSTRAINT "businesses_subscription_plan_id_fkey" FOREIGN KEY ("subscription_plan_id") REFERENCES "public"."subscription_plans"("id");



ALTER TABLE ONLY "public"."cash_register_movements"
    ADD CONSTRAINT "cash_register_movements_payment_method_id_fkey" FOREIGN KEY ("payment_method_id") REFERENCES "public"."payment_methods"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."cash_register_movements"
    ADD CONSTRAINT "cash_register_movements_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."cash_register_movements"
    ADD CONSTRAINT "cash_register_movements_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "public"."cash_register_shifts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cash_register_movements"
    ADD CONSTRAINT "cash_register_movements_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."cash_register_shifts"
    ADD CONSTRAINT "cash_register_shifts_cash_register_id_fkey" FOREIGN KEY ("cash_register_id") REFERENCES "public"."cash_registers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cash_register_shifts"
    ADD CONSTRAINT "cash_register_shifts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."cash_registers"
    ADD CONSTRAINT "cash_registers_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."cash_registers"
    ADD CONSTRAINT "cash_registers_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."categories"
    ADD CONSTRAINT "categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."categories"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."roles"
    ADD CONSTRAINT "custom_roles_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."customer_addresses"
    ADD CONSTRAINT "customer_addresses_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."customer_credit_history"
    ADD CONSTRAINT "customer_credit_history_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."customer_credit_history"
    ADD CONSTRAINT "customer_credit_history_performed_by_fkey" FOREIGN KEY ("performed_by") REFERENCES "public"."user_details"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_preferred_location_id_fkey" FOREIGN KEY ("preferred_location_id") REFERENCES "public"."locations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."email_templates"
    ADD CONSTRAINT "email_templates_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."inventory"
    ADD CONSTRAINT "inventory_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."inventory"
    ADD CONSTRAINT "inventory_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."inventory_movements"
    ADD CONSTRAINT "inventory_movements_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."inventory_movements"
    ADD CONSTRAINT "inventory_movements_inventory_id_fkey" FOREIGN KEY ("inventory_id") REFERENCES "public"."inventory"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."inventory_movements"
    ADD CONSTRAINT "inventory_movements_performed_by_fkey" FOREIGN KEY ("performed_by") REFERENCES "public"."user_details"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."inventory"
    ADD CONSTRAINT "inventory_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."inventory_transfer_items"
    ADD CONSTRAINT "inventory_transfer_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id");



ALTER TABLE ONLY "public"."inventory_transfer_items"
    ADD CONSTRAINT "inventory_transfer_items_transfer_id_fkey" FOREIGN KEY ("transfer_id") REFERENCES "public"."inventory_transfers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."inventory_transfer_items"
    ADD CONSTRAINT "inventory_transfer_items_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id");



ALTER TABLE ONLY "public"."inventory_transfers"
    ADD CONSTRAINT "inventory_transfers_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."inventory_transfers"
    ADD CONSTRAINT "inventory_transfers_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id");



ALTER TABLE ONLY "public"."inventory_transfers"
    ADD CONSTRAINT "inventory_transfers_from_location_id_fkey" FOREIGN KEY ("from_location_id") REFERENCES "public"."locations"("id");



ALTER TABLE ONLY "public"."inventory_transfers"
    ADD CONSTRAINT "inventory_transfers_origin_sale_id_fkey" FOREIGN KEY ("origin_sale_id") REFERENCES "public"."sales"("id");



ALTER TABLE ONLY "public"."inventory_transfers"
    ADD CONSTRAINT "inventory_transfers_received_by_fkey" FOREIGN KEY ("received_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."inventory_transfers"
    ADD CONSTRAINT "inventory_transfers_rejected_by_fkey" FOREIGN KEY ("rejected_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."inventory_transfers"
    ADD CONSTRAINT "inventory_transfers_requested_by_fkey" FOREIGN KEY ("requested_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."inventory_transfers"
    ADD CONSTRAINT "inventory_transfers_shipped_by_fkey" FOREIGN KEY ("shipped_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."inventory_transfers"
    ADD CONSTRAINT "inventory_transfers_to_location_id_fkey" FOREIGN KEY ("to_location_id") REFERENCES "public"."locations"("id");



ALTER TABLE ONLY "public"."inventory"
    ADD CONSTRAINT "inventory_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."locations"
    ADD CONSTRAINT "locations_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notification_preferences"
    ADD CONSTRAINT "notification_preferences_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notification_settings"
    ADD CONSTRAINT "notification_settings_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notification_settings"
    ADD CONSTRAINT "notification_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user_details"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."notifications"
    ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user_details"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."offline_sync_queue"
    ADD CONSTRAINT "offline_sync_queue_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."payment_transactions"
    ADD CONSTRAINT "payment_transactions_payment_method_id_fkey" FOREIGN KEY ("payment_method_id") REFERENCES "public"."payment_methods"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."payment_transactions"
    ADD CONSTRAINT "payment_transactions_processed_by_fkey" FOREIGN KEY ("processed_by") REFERENCES "public"."user_details"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."payment_transactions"
    ADD CONSTRAINT "payment_transactions_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."product_variants"
    ADD CONSTRAINT "product_variants_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."products"
    ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."purchase_order_items"
    ADD CONSTRAINT "purchase_order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."purchase_order_items"
    ADD CONSTRAINT "purchase_order_items_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "public"."purchase_orders"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."purchase_orders"
    ADD CONSTRAINT "purchase_orders_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "public"."user_details"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."purchase_orders"
    ADD CONSTRAINT "purchase_orders_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."user_details"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."purchase_orders"
    ADD CONSTRAINT "purchase_orders_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."purchase_orders"
    ADD CONSTRAINT "purchase_orders_received_by_fkey" FOREIGN KEY ("received_by") REFERENCES "public"."user_details"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."purchase_orders"
    ADD CONSTRAINT "purchase_orders_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."purchase_receipt_items"
    ADD CONSTRAINT "purchase_receipt_items_purchase_order_item_id_fkey" FOREIGN KEY ("purchase_order_item_id") REFERENCES "public"."purchase_order_items"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."purchase_receipt_items"
    ADD CONSTRAINT "purchase_receipt_items_receipt_id_fkey" FOREIGN KEY ("receipt_id") REFERENCES "public"."purchase_receipts"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."purchase_receipts"
    ADD CONSTRAINT "purchase_receipts_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "public"."purchase_orders"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."purchase_receipts"
    ADD CONSTRAINT "purchase_receipts_received_by_fkey" FOREIGN KEY ("received_by") REFERENCES "public"."user_details"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."quote_automation_settings"
    ADD CONSTRAINT "quote_automation_settings_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quote_conversation_sessions"
    ADD CONSTRAINT "quote_conversation_sessions_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quote_conversation_sessions"
    ADD CONSTRAINT "quote_conversation_sessions_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id");



ALTER TABLE ONLY "public"."quote_conversation_sessions"
    ADD CONSTRAINT "quote_conversation_sessions_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id");



ALTER TABLE ONLY "public"."quote_follow_ups"
    ADD CONSTRAINT "quote_follow_ups_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "public"."user_details"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."quote_follow_ups"
    ADD CONSTRAINT "quote_follow_ups_completed_by_fkey" FOREIGN KEY ("completed_by") REFERENCES "public"."user_details"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."quote_follow_ups"
    ADD CONSTRAINT "quote_follow_ups_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quote_items"
    ADD CONSTRAINT "quote_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."quote_items"
    ADD CONSTRAINT "quote_items_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quote_usage_monthly"
    ADD CONSTRAINT "quote_usage_monthly_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quotes"
    ADD CONSTRAINT "quotes_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "public"."user_details"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."quotes"
    ADD CONSTRAINT "quotes_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id");



ALTER TABLE ONLY "public"."quotes"
    ADD CONSTRAINT "quotes_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."user_details"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."quotes"
    ADD CONSTRAINT "quotes_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."quotes"
    ADD CONSTRAINT "quotes_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."refunds"
    ADD CONSTRAINT "refunds_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "public"."user_details"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."refunds"
    ADD CONSTRAINT "refunds_original_sale_id_fkey" FOREIGN KEY ("original_sale_id") REFERENCES "public"."sales"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."refunds"
    ADD CONSTRAINT "refunds_processed_by_fkey" FOREIGN KEY ("processed_by") REFERENCES "public"."user_details"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."refunds"
    ADD CONSTRAINT "refunds_refund_sale_id_fkey" FOREIGN KEY ("refund_sale_id") REFERENCES "public"."sales"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."sale_items"
    ADD CONSTRAINT "sale_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."sale_items"
    ADD CONSTRAINT "sale_items_sale_id_fkey" FOREIGN KEY ("sale_id") REFERENCES "public"."sales"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sales"
    ADD CONSTRAINT "sales_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sales"
    ADD CONSTRAINT "sales_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."sales"
    ADD CONSTRAINT "sales_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."sales"
    ADD CONSTRAINT "sales_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."sales"
    ADD CONSTRAINT "sales_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "public"."cash_register_shifts"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."sales"
    ADD CONSTRAINT "sales_sold_by_fkey" FOREIGN KEY ("sold_by") REFERENCES "public"."user_details"("id") ON DELETE RESTRICT;



COMMENT ON CONSTRAINT "sales_sold_by_fkey" ON "public"."sales" IS 'Relación entre ventas y usuario vendedor';



ALTER TABLE ONLY "public"."security_settings"
    ADD CONSTRAINT "security_settings_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."stock_alerts"
    ADD CONSTRAINT "stock_alerts_acknowledged_by_fkey" FOREIGN KEY ("acknowledged_by") REFERENCES "public"."user_details"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."stock_alerts"
    ADD CONSTRAINT "stock_alerts_inventory_id_fkey" FOREIGN KEY ("inventory_id") REFERENCES "public"."inventory"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."system_errors"
    ADD CONSTRAINT "system_errors_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."system_errors"
    ADD CONSTRAINT "system_errors_resolved_by_fkey" FOREIGN KEY ("resolved_by") REFERENCES "public"."user_details"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."system_errors"
    ADD CONSTRAINT "system_errors_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user_details"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ticket_attachments"
    ADD CONSTRAINT "ticket_attachments_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "public"."ticket_comments"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ticket_attachments"
    ADD CONSTRAINT "ticket_attachments_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ticket_attachments"
    ADD CONSTRAINT "ticket_attachments_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "public"."user_details"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."ticket_categories"
    ADD CONSTRAINT "ticket_categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "public"."ticket_categories"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."ticket_comments"
    ADD CONSTRAINT "ticket_comments_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."user_details"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."ticket_comments"
    ADD CONSTRAINT "ticket_comments_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."ticket_history"
    ADD CONSTRAINT "ticket_history_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "public"."user_details"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."ticket_history"
    ADD CONSTRAINT "ticket_history_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."tickets"
    ADD CONSTRAINT "tickets_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "public"."user_details"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tickets"
    ADD CONSTRAINT "tickets_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "public"."ticket_categories"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."tickets"
    ADD CONSTRAINT "tickets_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."user_details"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."tickets"
    ADD CONSTRAINT "tickets_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_activity_log"
    ADD CONSTRAINT "user_activity_log_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_activity_log"
    ADD CONSTRAINT "user_activity_log_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user_details"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_details_archive"
    ADD CONSTRAINT "user_details_archive_archived_by_fkey" FOREIGN KEY ("archived_by") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_details"
    ADD CONSTRAINT "user_details_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_details"
    ADD CONSTRAINT "user_details_default_cash_register_id_fkey" FOREIGN KEY ("default_cash_register_id") REFERENCES "public"."cash_registers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_details"
    ADD CONSTRAINT "user_details_id_fkey" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_details"
    ADD CONSTRAINT "user_details_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id");



ALTER TABLE ONLY "public"."user_locations"
    ADD CONSTRAINT "user_locations_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "public"."user_details"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_locations"
    ADD CONSTRAINT "user_locations_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_locations"
    ADD CONSTRAINT "user_locations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user_details"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_preferences"
    ADD CONSTRAINT "user_preferences_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_preferences"
    ADD CONSTRAINT "user_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_sessions"
    ADD CONSTRAINT "user_sessions_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_sessions"
    ADD CONSTRAINT "user_sessions_location_id_fkey" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_sessions"
    ADD CONSTRAINT "user_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user_details"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_details"
    ADD CONSTRAINT "users_default_location_id_fkey" FOREIGN KEY ("default_location_id") REFERENCES "public"."locations"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."whatsapp_numbers"
    ADD CONSTRAINT "whatsapp_numbers_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."whatsapp_numbers"
    ADD CONSTRAINT "whatsapp_numbers_business_id_fkey" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE SET NULL;



CREATE POLICY "Admins can create notifications" ON "public"."notifications" FOR INSERT WITH CHECK (("business_id" = ( SELECT "user_details"."business_id"
   FROM "public"."user_details"
  WHERE ("user_details"."id" = "auth"."uid"()))));



CREATE POLICY "Admins can manage business preferences" ON "public"."notification_preferences" USING ((("business_id" = ( SELECT "user_details"."business_id"
   FROM "public"."user_details"
  WHERE ("user_details"."id" = "auth"."uid"()))) AND (EXISTS ( SELECT 1
   FROM ("public"."user_details" "ud"
     JOIN "public"."roles" "r" ON (("ud"."role_id" = "r"."id")))
  WHERE (("ud"."id" = "auth"."uid"()) AND (("r"."name")::"text" = ANY ((ARRAY['admin'::character varying, 'owner'::character varying])::"text"[])))))));



CREATE POLICY "Admins can manage cash registers" ON "public"."cash_registers" USING ((("business_id" = "public"."get_user_business_id"()) AND "public"."is_admin"()));



CREATE POLICY "Businesses can view own usage" ON "public"."quote_usage_monthly" FOR SELECT USING (("business_id" = "public"."get_user_business_id"()));



CREATE POLICY "Enable read access for authenticated users on locations" ON "public"."locations" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Platform admins can manage whatsapp numbers" ON "public"."whatsapp_numbers" USING (true) WITH CHECK (true);



CREATE POLICY "System can delete old notifications" ON "public"."notifications" FOR DELETE USING ((("expires_at" IS NOT NULL) AND ("expires_at" < CURRENT_TIMESTAMP)));



CREATE POLICY "System can update usage" ON "public"."quote_usage_monthly" USING (true) WITH CHECK (true);



CREATE POLICY "Users can create movements" ON "public"."cash_register_movements" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM ("public"."cash_register_shifts" "crs"
     JOIN "public"."cash_registers" "cr" ON (("cr"."id" = "crs"."cash_register_id")))
  WHERE (("crs"."id" = "cash_register_movements"."shift_id") AND ("cr"."business_id" = "public"."get_user_business_id"())))));



CREATE POLICY "Users can create shifts" ON "public"."cash_register_shifts" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."cash_registers" "cr"
  WHERE (("cr"."id" = "cash_register_shifts"."cash_register_id") AND ("cr"."business_id" = "public"."get_user_business_id"())))));



CREATE POLICY "Users can create transfers for their business" ON "public"."inventory_transfers" FOR INSERT WITH CHECK (("business_id" = "public"."get_user_business_id"()));



CREATE POLICY "Users can delete location assignments" ON "public"."user_locations" FOR DELETE USING (("user_id" IN ( SELECT "user_details"."id"
   FROM "public"."user_details"
  WHERE ("user_details"."business_id" = "public"."get_user_business_id"()))));



CREATE POLICY "Users can delete own preferences" ON "public"."user_preferences" FOR DELETE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert location assignments" ON "public"."user_locations" FOR INSERT WITH CHECK (("user_id" IN ( SELECT "user_details"."id"
   FROM "public"."user_details"
  WHERE ("user_details"."business_id" = "public"."get_user_business_id"()))));



CREATE POLICY "Users can insert own preferences" ON "public"."user_preferences" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can insert sessions for their business" ON "public"."quote_conversation_sessions" FOR INSERT WITH CHECK (("business_id" = "public"."get_user_business_id"()));



CREATE POLICY "Users can insert settings for their business" ON "public"."quote_automation_settings" FOR INSERT WITH CHECK (("business_id" = "public"."get_user_business_id"()));



CREATE POLICY "Users can insert their own location assignments" ON "public"."user_locations" FOR INSERT TO "authenticated" WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can insert to their sync queue" ON "public"."offline_sync_queue" FOR INSERT WITH CHECK (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can manage own business roles" ON "public"."roles" USING ((("business_id" = ( SELECT "user_details"."business_id"
   FROM "public"."user_details"
  WHERE ("user_details"."id" = "auth"."uid"()))) AND ("is_system" = false)));



CREATE POLICY "Users can manage their own sessions" ON "public"."user_sessions" TO "authenticated" USING (("user_id" = "auth"."uid"())) WITH CHECK (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can manage transfer items from their business" ON "public"."inventory_transfer_items" USING ((EXISTS ( SELECT 1
   FROM "public"."inventory_transfers" "t"
  WHERE (("t"."id" = "inventory_transfer_items"."transfer_id") AND ("t"."business_id" = "public"."get_user_business_id"())))));



CREATE POLICY "Users can read their own location assignments" ON "public"."user_locations" FOR SELECT TO "authenticated" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "Users can update location assignments" ON "public"."user_locations" FOR UPDATE USING (("user_id" IN ( SELECT "user_details"."id"
   FROM "public"."user_details"
  WHERE ("user_details"."business_id" = "public"."get_user_business_id"()))));



CREATE POLICY "Users can update own preferences" ON "public"."user_preferences" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update sessions from their business" ON "public"."quote_conversation_sessions" FOR UPDATE USING (("business_id" = "public"."get_user_business_id"()));



CREATE POLICY "Users can update settings from their business" ON "public"."quote_automation_settings" FOR UPDATE USING (("business_id" = "public"."get_user_business_id"()));



CREATE POLICY "Users can update their own notification read status" ON "public"."notifications" FOR UPDATE USING ((("business_id" = ( SELECT "user_details"."business_id"
   FROM "public"."user_details"
  WHERE ("user_details"."id" = "auth"."uid"()))) AND (("user_id" IS NULL) OR ("user_id" = "auth"."uid"())))) WITH CHECK (("business_id" = ( SELECT "user_details"."business_id"
   FROM "public"."user_details"
  WHERE ("user_details"."id" = "auth"."uid"()))));



CREATE POLICY "Users can update their own shifts" ON "public"."cash_register_shifts" FOR UPDATE USING ((("user_id" = "auth"."uid"()) OR "public"."is_admin"()));



CREATE POLICY "Users can update their sync queue" ON "public"."offline_sync_queue" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update transfers from their business" ON "public"."inventory_transfers" FOR UPDATE USING (("business_id" = "public"."get_user_business_id"()));



CREATE POLICY "Users can view archived members from their business" ON "public"."user_details_archive" FOR SELECT USING (("business_id" = "public"."get_user_business_id"()));



CREATE POLICY "Users can view cash registers in their business" ON "public"."cash_registers" FOR SELECT USING (("business_id" = "public"."get_user_business_id"()));



CREATE POLICY "Users can view movements in their business" ON "public"."cash_register_movements" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM ("public"."cash_register_shifts" "crs"
     JOIN "public"."cash_registers" "cr" ON (("cr"."id" = "crs"."cash_register_id")))
  WHERE (("crs"."id" = "cash_register_movements"."shift_id") AND ("cr"."business_id" = "public"."get_user_business_id"())))));



CREATE POLICY "Users can view notifications from their business" ON "public"."notifications" FOR SELECT USING ((("business_id" = ( SELECT "user_details"."business_id"
   FROM "public"."user_details"
  WHERE ("user_details"."id" = "auth"."uid"()))) AND (("user_id" IS NULL) OR ("user_id" = "auth"."uid"()) OR ("location_id" IN ( SELECT "user_locations"."location_id"
   FROM "public"."user_locations"
  WHERE ("user_locations"."user_id" = "auth"."uid"()))))));



CREATE POLICY "Users can view own business locations" ON "public"."locations" FOR SELECT USING ((("public"."get_user_business_id"() IS NOT NULL) AND ("business_id" = "public"."get_user_business_id"())));



CREATE POLICY "Users can view own location assignments" ON "public"."user_locations" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR ("user_id" IN ( SELECT "user_details"."id"
   FROM "public"."user_details"
  WHERE ("user_details"."business_id" = "public"."get_user_business_id"())))));



CREATE POLICY "Users can view own preferences" ON "public"."user_preferences" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view sessions from their business" ON "public"."quote_conversation_sessions" FOR SELECT USING (("business_id" = "public"."get_user_business_id"()));



CREATE POLICY "Users can view settings from their business" ON "public"."quote_automation_settings" FOR SELECT USING (("business_id" = "public"."get_user_business_id"()));



CREATE POLICY "Users can view shifts in their business" ON "public"."cash_register_shifts" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."cash_registers" "cr"
  WHERE (("cr"."id" = "cash_register_shifts"."cash_register_id") AND ("cr"."business_id" = "public"."get_user_business_id"())))));



CREATE POLICY "Users can view system roles and own business roles" ON "public"."roles" FOR SELECT USING ((("business_id" IS NULL) OR ("business_id" = ( SELECT "user_details"."business_id"
   FROM "public"."user_details"
  WHERE ("user_details"."id" = "auth"."uid"())))));



CREATE POLICY "Users can view their business preferences" ON "public"."notification_preferences" FOR SELECT USING (("business_id" = ( SELECT "user_details"."business_id"
   FROM "public"."user_details"
  WHERE ("user_details"."id" = "auth"."uid"()))));



CREATE POLICY "Users can view their own sync queue" ON "public"."offline_sync_queue" FOR SELECT USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view transfer items from their business" ON "public"."inventory_transfer_items" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."inventory_transfers" "t"
  WHERE (("t"."id" = "inventory_transfer_items"."transfer_id") AND ("t"."business_id" = "public"."get_user_business_id"())))));



CREATE POLICY "Users can view transfers from their business" ON "public"."inventory_transfers" FOR SELECT USING (("business_id" = "public"."get_user_business_id"()));



CREATE POLICY "admins_modify_email_templates" ON "public"."email_templates" USING (("public"."is_admin"() AND ("business_id" = "public"."get_user_business_id"())));



CREATE POLICY "admins_modify_notification_settings" ON "public"."notification_settings" USING (("public"."is_admin"() AND ("business_id" = "public"."get_user_business_id"())));



CREATE POLICY "admins_modify_payment_settings" ON "public"."business_payment_settings" USING (("public"."is_admin"() AND ("business_id" = "public"."get_user_business_id"())));



CREATE POLICY "admins_modify_security_settings" ON "public"."security_settings" USING (("public"."is_admin"() AND ("business_id" = "public"."get_user_business_id"())));



CREATE POLICY "business_members_view_email_templates" ON "public"."email_templates" FOR SELECT USING (("business_id" = "public"."get_user_business_id"()));



CREATE POLICY "business_members_view_payment_settings" ON "public"."business_payment_settings" FOR SELECT USING (("business_id" = "public"."get_user_business_id"()));



CREATE POLICY "business_members_view_security_settings" ON "public"."security_settings" FOR SELECT USING (("business_id" = "public"."get_user_business_id"()));



ALTER TABLE "public"."business_payment_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."businesses" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "businesses_insert" ON "public"."businesses" FOR INSERT WITH CHECK (("owner_id" = "auth"."uid"()));



CREATE POLICY "businesses_select" ON "public"."businesses" FOR SELECT USING ((("owner_id" = "auth"."uid"()) OR ("id" = "public"."get_user_business_id"())));



CREATE POLICY "businesses_update" ON "public"."businesses" FOR UPDATE USING ((("owner_id" = "auth"."uid"()) OR ("id" = "public"."get_user_business_id"())));



ALTER TABLE "public"."cash_register_movements" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cash_register_shifts" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."cash_registers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."categories" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "categories_all" ON "public"."categories" USING (("business_id" = "public"."get_user_business_id"()));



CREATE POLICY "categories_select" ON "public"."categories" FOR SELECT USING ((("business_id" = "public"."get_user_business_id"()) OR ("business_id" IS NULL)));



CREATE POLICY "custom_roles_all" ON "public"."roles" USING ((("business_id" = "public"."get_user_business_id"()) AND ("is_system" = false)));



CREATE POLICY "custom_roles_select" ON "public"."roles" FOR SELECT USING ((("business_id" IS NULL) OR ("business_id" = "public"."get_user_business_id"())));



ALTER TABLE "public"."customers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "customers_all" ON "public"."customers" USING (("business_id" = "public"."get_user_business_id"()));



CREATE POLICY "customers_select" ON "public"."customers" FOR SELECT USING ((("business_id" = "public"."get_user_business_id"()) OR ("business_id" IS NULL)));



ALTER TABLE "public"."email_templates" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."inventory" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "inventory_all" ON "public"."inventory" USING (("business_id" = "public"."get_user_business_id"()));



ALTER TABLE "public"."inventory_movements" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "inventory_movements_all" ON "public"."inventory_movements" USING (("business_id" = "public"."get_user_business_id"()));



CREATE POLICY "inventory_movements_select" ON "public"."inventory_movements" FOR SELECT USING ((("business_id" = "public"."get_user_business_id"()) OR ("business_id" IS NULL)));



CREATE POLICY "inventory_select" ON "public"."inventory" FOR SELECT USING ((("business_id" = "public"."get_user_business_id"()) OR ("business_id" IS NULL)));



ALTER TABLE "public"."inventory_transfer_items" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."inventory_transfers" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."locations" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "locations_delete" ON "public"."locations" FOR DELETE USING (("business_id" = "public"."get_user_business_id"()));



CREATE POLICY "locations_insert" ON "public"."locations" FOR INSERT WITH CHECK (("business_id" = "public"."get_user_business_id"()));



CREATE POLICY "locations_select" ON "public"."locations" FOR SELECT USING ((("business_id" = "public"."get_user_business_id"()) OR ("business_id" IS NULL)));



CREATE POLICY "locations_update" ON "public"."locations" FOR UPDATE USING (("business_id" = "public"."get_user_business_id"()));



ALTER TABLE "public"."notification_preferences" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notification_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."offline_sync_queue" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."products" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "products_all" ON "public"."products" USING (("business_id" = "public"."get_user_business_id"()));



CREATE POLICY "products_select" ON "public"."products" FOR SELECT USING ((("business_id" = "public"."get_user_business_id"()) OR ("business_id" IS NULL)));



ALTER TABLE "public"."quote_automation_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."quote_conversation_sessions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."quote_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "quote_items_delete_policy" ON "public"."quote_items" FOR DELETE USING (("quote_id" IN ( SELECT "quotes"."id"
   FROM "public"."quotes"
  WHERE ("quotes"."business_id" = ( SELECT "public"."get_user_business_id"() AS "get_user_business_id")))));



CREATE POLICY "quote_items_insert_policy" ON "public"."quote_items" FOR INSERT WITH CHECK (("quote_id" IN ( SELECT "quotes"."id"
   FROM "public"."quotes"
  WHERE ("quotes"."business_id" = ( SELECT "public"."get_user_business_id"() AS "get_user_business_id")))));



CREATE POLICY "quote_items_select_policy" ON "public"."quote_items" FOR SELECT USING (("quote_id" IN ( SELECT "quotes"."id"
   FROM "public"."quotes"
  WHERE ("quotes"."business_id" = ( SELECT "public"."get_user_business_id"() AS "get_user_business_id")))));



CREATE POLICY "quote_items_update_policy" ON "public"."quote_items" FOR UPDATE USING (("quote_id" IN ( SELECT "quotes"."id"
   FROM "public"."quotes"
  WHERE ("quotes"."business_id" = ( SELECT "public"."get_user_business_id"() AS "get_user_business_id")))));



ALTER TABLE "public"."quote_usage_monthly" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."quotes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "quotes_delete_policy" ON "public"."quotes" FOR DELETE USING (("business_id" = ( SELECT "public"."get_user_business_id"() AS "get_user_business_id")));



CREATE POLICY "quotes_insert_policy" ON "public"."quotes" FOR INSERT WITH CHECK (("business_id" = ( SELECT "public"."get_user_business_id"() AS "get_user_business_id")));



CREATE POLICY "quotes_select_policy" ON "public"."quotes" FOR SELECT USING (("business_id" = ( SELECT "public"."get_user_business_id"() AS "get_user_business_id")));



CREATE POLICY "quotes_update_policy" ON "public"."quotes" FOR UPDATE USING (("business_id" = ( SELECT "public"."get_user_business_id"() AS "get_user_business_id")));



ALTER TABLE "public"."roles" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sales" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "sales_all" ON "public"."sales" USING (("business_id" = "public"."get_user_business_id"()));



CREATE POLICY "sales_select" ON "public"."sales" FOR SELECT USING ((("business_id" = "public"."get_user_business_id"()) OR ("business_id" IS NULL)));



ALTER TABLE "public"."security_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_details" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_details_archive" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_details_select_authenticated" ON "public"."user_details" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "user_details_select_own" ON "public"."user_details" FOR SELECT USING (("auth"."uid"() = "id"));



CREATE POLICY "user_details_service_role_all" ON "public"."user_details" TO "service_role" USING (true) WITH CHECK (true);



CREATE POLICY "user_details_update_policy" ON "public"."user_details" FOR UPDATE USING ((("auth"."uid"() = "id") OR "public"."is_admin"()));



CREATE POLICY "user_details_username_lookup" ON "public"."user_details" FOR SELECT TO "anon" USING (true);



ALTER TABLE "public"."user_locations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_preferences" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_sessions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_sessions_all" ON "public"."user_sessions" USING (("user_id" = "auth"."uid"()));



CREATE POLICY "user_sessions_select" ON "public"."user_sessions" FOR SELECT USING ((("user_id" = "auth"."uid"()) OR ("business_id" = "public"."get_user_business_id"())));



CREATE POLICY "users_update_own_notification_settings" ON "public"."notification_settings" FOR UPDATE USING ((("business_id" = "public"."get_user_business_id"()) AND ("user_id" = "auth"."uid"())));



CREATE POLICY "users_view_notification_settings" ON "public"."notification_settings" FOR SELECT USING ((("business_id" = "public"."get_user_business_id"()) AND (("user_id" IS NULL) OR ("user_id" = "auth"."uid"()))));



ALTER TABLE "public"."whatsapp_numbers" ENABLE ROW LEVEL SECURITY;


GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";



GRANT ALL ON FUNCTION "public"."archive_and_remove_user"("p_user_id" "uuid", "p_removal_reason" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."archive_and_remove_user"("p_user_id" "uuid", "p_removal_reason" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."archive_and_remove_user"("p_user_id" "uuid", "p_removal_reason" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."audit_trigger_func"() TO "anon";
GRANT ALL ON FUNCTION "public"."audit_trigger_func"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."audit_trigger_func"() TO "service_role";



GRANT ALL ON FUNCTION "public"."auto_assign_business_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."auto_assign_business_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."auto_assign_business_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."check_low_stock"() TO "anon";
GRANT ALL ON FUNCTION "public"."check_low_stock"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_low_stock"() TO "service_role";



GRANT ALL ON FUNCTION "public"."check_monthly_quote_limit"("p_business_id" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."check_monthly_quote_limit"("p_business_id" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_monthly_quote_limit"("p_business_id" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."check_plan_limit"("p_business_id" integer, "p_resource_type" character varying, "p_current_count" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."check_plan_limit"("p_business_id" integer, "p_resource_type" character varying, "p_current_count" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_plan_limit"("p_business_id" integer, "p_resource_type" character varying, "p_current_count" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."check_quote_automation_limit"("p_business_id" integer, "p_customer_phone" character varying, "p_customer_email" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."check_quote_automation_limit"("p_business_id" integer, "p_customer_phone" character varying, "p_customer_email" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_quote_automation_limit"("p_business_id" integer, "p_customer_phone" character varying, "p_customer_email" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_expired_quote_sessions"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_expired_quote_sessions"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_expired_quote_sessions"() TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_orphan_auth_users"() TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_orphan_auth_users"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_orphan_auth_users"() TO "service_role";



GRANT ALL ON FUNCTION "public"."delete_expired_notifications"() TO "anon";
GRANT ALL ON FUNCTION "public"."delete_expired_notifications"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."delete_expired_notifications"() TO "service_role";



GRANT ALL ON FUNCTION "public"."ensure_single_main_location"() TO "anon";
GRANT ALL ON FUNCTION "public"."ensure_single_main_location"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."ensure_single_main_location"() TO "service_role";



GRANT ALL ON FUNCTION "public"."find_customer_by_phone"("p_business_id" integer, "p_phone" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."find_customer_by_phone"("p_business_id" integer, "p_phone" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."find_customer_by_phone"("p_business_id" integer, "p_phone" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_shift_number"("p_cash_register_id" bigint) TO "anon";
GRANT ALL ON FUNCTION "public"."generate_shift_number"("p_cash_register_id" bigint) TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_shift_number"("p_cash_register_id" bigint) TO "service_role";



GRANT ALL ON FUNCTION "public"."generate_transfer_number"("p_business_id" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."generate_transfer_number"("p_business_id" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."generate_transfer_number"("p_business_id" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_archived_users"("p_business_id" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_archived_users"("p_business_id" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_archived_users"("p_business_id" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_business_by_evolution_instance"("p_instance_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_business_by_evolution_instance"("p_instance_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_business_by_evolution_instance"("p_instance_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_business_by_whatsapp_number"("p_whatsapp_number" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_business_by_whatsapp_number"("p_whatsapp_number" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_business_by_whatsapp_number"("p_whatsapp_number" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_business_by_whatsapp_number"("p_whatsapp_number" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."get_business_by_whatsapp_number"("p_whatsapp_number" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_business_by_whatsapp_number"("p_whatsapp_number" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_business_whatsapp_number"("p_business_id" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_business_whatsapp_number"("p_business_id" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_business_whatsapp_number"("p_business_id" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_enabled_payment_methods"("p_business_id" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_enabled_payment_methods"("p_business_id" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_enabled_payment_methods"("p_business_id" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_main_location"("p_business_id" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_main_location"("p_business_id" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_main_location"("p_business_id" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_notification_preferences"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_notification_preferences"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_notification_preferences"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_twilio_webhook_url"("p_business_id" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."get_twilio_webhook_url"("p_business_id" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_twilio_webhook_url"("p_business_id" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_business_id"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_business_id"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_business_id"() TO "service_role";



GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."handle_new_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_product_sale_frequency"() TO "anon";
GRANT ALL ON FUNCTION "public"."increment_product_sale_frequency"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_product_sale_frequency"() TO "service_role";



GRANT ALL ON FUNCTION "public"."increment_quote_usage"("p_business_id" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."increment_quote_usage"("p_business_id" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."increment_quote_usage"("p_business_id" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "service_role";



GRANT ALL ON FUNCTION "public"."log_inventory_movement"() TO "anon";
GRANT ALL ON FUNCTION "public"."log_inventory_movement"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_inventory_movement"() TO "service_role";



GRANT ALL ON FUNCTION "public"."refresh_all_materialized_views"() TO "anon";
GRANT ALL ON FUNCTION "public"."refresh_all_materialized_views"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."refresh_all_materialized_views"() TO "service_role";



GRANT ALL ON FUNCTION "public"."refresh_sales_analytics"() TO "anon";
GRANT ALL ON FUNCTION "public"."refresh_sales_analytics"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."refresh_sales_analytics"() TO "service_role";



GRANT ALL ON FUNCTION "public"."search_products_with_inventory"("p_search_term" "text", "p_location_id" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."search_products_with_inventory"("p_search_term" "text", "p_location_id" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."search_products_with_inventory"("p_search_term" "text", "p_location_id" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_user_email"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_user_email"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_user_email"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_inventory_on_sale"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_inventory_on_sale"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_inventory_on_sale"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_notification_preferences_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_notification_preferences_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_notification_preferences_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_purchase_order_totals"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_purchase_order_totals"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_purchase_order_totals"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_quote_totals"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_quote_totals"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_quote_totals"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_sale_totals_correct"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_sale_totals_correct"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_sale_totals_correct"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_transfer_timestamp"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_transfer_timestamp"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_transfer_timestamp"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."user_belongs_to_business"("p_business_id" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."user_belongs_to_business"("p_business_id" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."user_belongs_to_business"("p_business_id" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."verify_twilio_whatsapp"("p_business_id" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."verify_twilio_whatsapp"("p_business_id" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."verify_twilio_whatsapp"("p_business_id" integer) TO "service_role";



GRANT ALL ON TABLE "public"."audit_log" TO "anon";
GRANT ALL ON TABLE "public"."audit_log" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_log" TO "service_role";



GRANT ALL ON SEQUENCE "public"."audit_log_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."audit_log_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."audit_log_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."business_payment_settings" TO "anon";
GRANT ALL ON TABLE "public"."business_payment_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."business_payment_settings" TO "service_role";



GRANT ALL ON SEQUENCE "public"."business_payment_settings_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."business_payment_settings_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."business_payment_settings_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."businesses" TO "anon";
GRANT ALL ON TABLE "public"."businesses" TO "authenticated";
GRANT ALL ON TABLE "public"."businesses" TO "service_role";



GRANT ALL ON SEQUENCE "public"."businesses_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."businesses_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."businesses_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."cash_register_movements" TO "anon";
GRANT ALL ON TABLE "public"."cash_register_movements" TO "authenticated";
GRANT ALL ON TABLE "public"."cash_register_movements" TO "service_role";



GRANT ALL ON SEQUENCE "public"."cash_register_movements_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."cash_register_movements_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."cash_register_movements_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."cash_register_shifts" TO "anon";
GRANT ALL ON TABLE "public"."cash_register_shifts" TO "authenticated";
GRANT ALL ON TABLE "public"."cash_register_shifts" TO "service_role";



GRANT ALL ON SEQUENCE "public"."cash_register_shifts_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."cash_register_shifts_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."cash_register_shifts_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."cash_registers" TO "anon";
GRANT ALL ON TABLE "public"."cash_registers" TO "authenticated";
GRANT ALL ON TABLE "public"."cash_registers" TO "service_role";



GRANT ALL ON SEQUENCE "public"."cash_registers_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."cash_registers_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."cash_registers_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."categories" TO "anon";
GRANT ALL ON TABLE "public"."categories" TO "authenticated";
GRANT ALL ON TABLE "public"."categories" TO "service_role";



GRANT ALL ON SEQUENCE "public"."categories_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."categories_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."categories_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."roles" TO "anon";
GRANT ALL ON TABLE "public"."roles" TO "authenticated";
GRANT ALL ON TABLE "public"."roles" TO "service_role";



GRANT ALL ON SEQUENCE "public"."custom_roles_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."custom_roles_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."custom_roles_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."customer_addresses" TO "anon";
GRANT ALL ON TABLE "public"."customer_addresses" TO "authenticated";
GRANT ALL ON TABLE "public"."customer_addresses" TO "service_role";



GRANT ALL ON SEQUENCE "public"."customer_addresses_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."customer_addresses_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."customer_addresses_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."customer_credit_history" TO "anon";
GRANT ALL ON TABLE "public"."customer_credit_history" TO "authenticated";
GRANT ALL ON TABLE "public"."customer_credit_history" TO "service_role";



GRANT ALL ON SEQUENCE "public"."customer_credit_history_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."customer_credit_history_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."customer_credit_history_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."customers" TO "anon";
GRANT ALL ON TABLE "public"."customers" TO "authenticated";
GRANT ALL ON TABLE "public"."customers" TO "service_role";



GRANT ALL ON SEQUENCE "public"."customers_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."customers_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."customers_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."email_templates" TO "anon";
GRANT ALL ON TABLE "public"."email_templates" TO "authenticated";
GRANT ALL ON TABLE "public"."email_templates" TO "service_role";



GRANT ALL ON TABLE "public"."inventory" TO "anon";
GRANT ALL ON TABLE "public"."inventory" TO "authenticated";
GRANT ALL ON TABLE "public"."inventory" TO "service_role";



GRANT ALL ON SEQUENCE "public"."inventory_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."inventory_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."inventory_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."inventory_movements" TO "anon";
GRANT ALL ON TABLE "public"."inventory_movements" TO "authenticated";
GRANT ALL ON TABLE "public"."inventory_movements" TO "service_role";



GRANT ALL ON SEQUENCE "public"."inventory_movements_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."inventory_movements_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."inventory_movements_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."inventory_transfer_items" TO "anon";
GRANT ALL ON TABLE "public"."inventory_transfer_items" TO "authenticated";
GRANT ALL ON TABLE "public"."inventory_transfer_items" TO "service_role";



GRANT ALL ON SEQUENCE "public"."inventory_transfer_items_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."inventory_transfer_items_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."inventory_transfer_items_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."inventory_transfers" TO "anon";
GRANT ALL ON TABLE "public"."inventory_transfers" TO "authenticated";
GRANT ALL ON TABLE "public"."inventory_transfers" TO "service_role";



GRANT ALL ON SEQUENCE "public"."inventory_transfers_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."inventory_transfers_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."inventory_transfers_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."locations" TO "anon";
GRANT ALL ON TABLE "public"."locations" TO "authenticated";
GRANT ALL ON TABLE "public"."locations" TO "service_role";



GRANT ALL ON SEQUENCE "public"."locations_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."locations_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."locations_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."sales" TO "anon";
GRANT ALL ON TABLE "public"."sales" TO "authenticated";
GRANT ALL ON TABLE "public"."sales" TO "service_role";



GRANT ALL ON TABLE "public"."mv_customer_analysis" TO "anon";
GRANT ALL ON TABLE "public"."mv_customer_analysis" TO "authenticated";
GRANT ALL ON TABLE "public"."mv_customer_analysis" TO "service_role";



GRANT ALL ON TABLE "public"."mv_daily_sales_by_location" TO "anon";
GRANT ALL ON TABLE "public"."mv_daily_sales_by_location" TO "authenticated";
GRANT ALL ON TABLE "public"."mv_daily_sales_by_location" TO "service_role";



GRANT ALL ON TABLE "public"."products" TO "anon";
GRANT ALL ON TABLE "public"."products" TO "authenticated";
GRANT ALL ON TABLE "public"."products" TO "service_role";



GRANT ALL ON TABLE "public"."mv_inventory_valuation" TO "anon";
GRANT ALL ON TABLE "public"."mv_inventory_valuation" TO "authenticated";
GRANT ALL ON TABLE "public"."mv_inventory_valuation" TO "service_role";



GRANT ALL ON TABLE "public"."quotes" TO "anon";
GRANT ALL ON TABLE "public"."quotes" TO "authenticated";
GRANT ALL ON TABLE "public"."quotes" TO "service_role";



GRANT ALL ON TABLE "public"."mv_quote_conversion_rate" TO "anon";
GRANT ALL ON TABLE "public"."mv_quote_conversion_rate" TO "authenticated";
GRANT ALL ON TABLE "public"."mv_quote_conversion_rate" TO "service_role";



GRANT ALL ON TABLE "public"."user_details" TO "anon";
GRANT ALL ON TABLE "public"."user_details" TO "authenticated";
GRANT ALL ON TABLE "public"."user_details" TO "service_role";



GRANT ALL ON TABLE "public"."mv_seller_performance" TO "anon";
GRANT ALL ON TABLE "public"."mv_seller_performance" TO "authenticated";
GRANT ALL ON TABLE "public"."mv_seller_performance" TO "service_role";



GRANT ALL ON TABLE "public"."ticket_categories" TO "anon";
GRANT ALL ON TABLE "public"."ticket_categories" TO "authenticated";
GRANT ALL ON TABLE "public"."ticket_categories" TO "service_role";



GRANT ALL ON TABLE "public"."tickets" TO "anon";
GRANT ALL ON TABLE "public"."tickets" TO "authenticated";
GRANT ALL ON TABLE "public"."tickets" TO "service_role";



GRANT ALL ON TABLE "public"."mv_ticket_metrics" TO "anon";
GRANT ALL ON TABLE "public"."mv_ticket_metrics" TO "authenticated";
GRANT ALL ON TABLE "public"."mv_ticket_metrics" TO "service_role";



GRANT ALL ON TABLE "public"."sale_items" TO "anon";
GRANT ALL ON TABLE "public"."sale_items" TO "authenticated";
GRANT ALL ON TABLE "public"."sale_items" TO "service_role";



GRANT ALL ON TABLE "public"."mv_top_selling_products" TO "anon";
GRANT ALL ON TABLE "public"."mv_top_selling_products" TO "authenticated";
GRANT ALL ON TABLE "public"."mv_top_selling_products" TO "service_role";



GRANT ALL ON TABLE "public"."notification_preferences" TO "anon";
GRANT ALL ON TABLE "public"."notification_preferences" TO "authenticated";
GRANT ALL ON TABLE "public"."notification_preferences" TO "service_role";



GRANT ALL ON SEQUENCE "public"."notification_preferences_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."notification_preferences_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."notification_preferences_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."notification_settings" TO "anon";
GRANT ALL ON TABLE "public"."notification_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."notification_settings" TO "service_role";



GRANT ALL ON TABLE "public"."notifications" TO "anon";
GRANT ALL ON TABLE "public"."notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."notifications" TO "service_role";



GRANT ALL ON SEQUENCE "public"."notifications_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."notifications_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."notifications_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."offline_sync_queue" TO "anon";
GRANT ALL ON TABLE "public"."offline_sync_queue" TO "authenticated";
GRANT ALL ON TABLE "public"."offline_sync_queue" TO "service_role";



GRANT ALL ON SEQUENCE "public"."offline_sync_queue_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."offline_sync_queue_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."offline_sync_queue_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."payment_methods" TO "anon";
GRANT ALL ON TABLE "public"."payment_methods" TO "authenticated";
GRANT ALL ON TABLE "public"."payment_methods" TO "service_role";



GRANT ALL ON SEQUENCE "public"."payment_methods_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."payment_methods_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."payment_methods_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."payment_transactions" TO "anon";
GRANT ALL ON TABLE "public"."payment_transactions" TO "authenticated";
GRANT ALL ON TABLE "public"."payment_transactions" TO "service_role";



GRANT ALL ON SEQUENCE "public"."payment_transactions_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."payment_transactions_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."payment_transactions_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."product_variants" TO "anon";
GRANT ALL ON TABLE "public"."product_variants" TO "authenticated";
GRANT ALL ON TABLE "public"."product_variants" TO "service_role";



GRANT ALL ON SEQUENCE "public"."product_variants_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."product_variants_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."product_variants_id_seq" TO "service_role";



GRANT ALL ON SEQUENCE "public"."products_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."products_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."products_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."purchase_order_items" TO "anon";
GRANT ALL ON TABLE "public"."purchase_order_items" TO "authenticated";
GRANT ALL ON TABLE "public"."purchase_order_items" TO "service_role";



GRANT ALL ON SEQUENCE "public"."purchase_order_items_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."purchase_order_items_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."purchase_order_items_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."purchase_orders" TO "anon";
GRANT ALL ON TABLE "public"."purchase_orders" TO "authenticated";
GRANT ALL ON TABLE "public"."purchase_orders" TO "service_role";



GRANT ALL ON SEQUENCE "public"."purchase_orders_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."purchase_orders_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."purchase_orders_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."purchase_receipt_items" TO "anon";
GRANT ALL ON TABLE "public"."purchase_receipt_items" TO "authenticated";
GRANT ALL ON TABLE "public"."purchase_receipt_items" TO "service_role";



GRANT ALL ON SEQUENCE "public"."purchase_receipt_items_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."purchase_receipt_items_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."purchase_receipt_items_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."purchase_receipts" TO "anon";
GRANT ALL ON TABLE "public"."purchase_receipts" TO "authenticated";
GRANT ALL ON TABLE "public"."purchase_receipts" TO "service_role";



GRANT ALL ON SEQUENCE "public"."purchase_receipts_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."purchase_receipts_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."purchase_receipts_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."quote_automation_settings" TO "anon";
GRANT ALL ON TABLE "public"."quote_automation_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."quote_automation_settings" TO "service_role";



GRANT ALL ON SEQUENCE "public"."quote_automation_settings_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."quote_automation_settings_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."quote_automation_settings_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."quote_conversation_sessions" TO "anon";
GRANT ALL ON TABLE "public"."quote_conversation_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."quote_conversation_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."quote_follow_ups" TO "anon";
GRANT ALL ON TABLE "public"."quote_follow_ups" TO "authenticated";
GRANT ALL ON TABLE "public"."quote_follow_ups" TO "service_role";



GRANT ALL ON SEQUENCE "public"."quote_follow_ups_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."quote_follow_ups_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."quote_follow_ups_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."quote_items" TO "anon";
GRANT ALL ON TABLE "public"."quote_items" TO "authenticated";
GRANT ALL ON TABLE "public"."quote_items" TO "service_role";



GRANT ALL ON SEQUENCE "public"."quote_items_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."quote_items_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."quote_items_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."quote_usage_monthly" TO "anon";
GRANT ALL ON TABLE "public"."quote_usage_monthly" TO "authenticated";
GRANT ALL ON TABLE "public"."quote_usage_monthly" TO "service_role";



GRANT ALL ON SEQUENCE "public"."quote_usage_monthly_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."quote_usage_monthly_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."quote_usage_monthly_id_seq" TO "service_role";



GRANT ALL ON SEQUENCE "public"."quotes_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."quotes_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."quotes_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."refunds" TO "anon";
GRANT ALL ON TABLE "public"."refunds" TO "authenticated";
GRANT ALL ON TABLE "public"."refunds" TO "service_role";



GRANT ALL ON SEQUENCE "public"."refunds_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."refunds_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."refunds_id_seq" TO "service_role";



GRANT ALL ON SEQUENCE "public"."sale_items_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."sale_items_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."sale_items_id_seq" TO "service_role";



GRANT ALL ON SEQUENCE "public"."sales_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."sales_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."sales_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."security_settings" TO "anon";
GRANT ALL ON TABLE "public"."security_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."security_settings" TO "service_role";



GRANT ALL ON TABLE "public"."stock_alerts" TO "anon";
GRANT ALL ON TABLE "public"."stock_alerts" TO "authenticated";
GRANT ALL ON TABLE "public"."stock_alerts" TO "service_role";



GRANT ALL ON SEQUENCE "public"."stock_alerts_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."stock_alerts_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."stock_alerts_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."subscription_plans" TO "anon";
GRANT ALL ON TABLE "public"."subscription_plans" TO "authenticated";
GRANT ALL ON TABLE "public"."subscription_plans" TO "service_role";



GRANT ALL ON SEQUENCE "public"."subscription_plans_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."subscription_plans_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."subscription_plans_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."suppliers" TO "anon";
GRANT ALL ON TABLE "public"."suppliers" TO "authenticated";
GRANT ALL ON TABLE "public"."suppliers" TO "service_role";



GRANT ALL ON SEQUENCE "public"."suppliers_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."suppliers_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."suppliers_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."system_errors" TO "anon";
GRANT ALL ON TABLE "public"."system_errors" TO "authenticated";
GRANT ALL ON TABLE "public"."system_errors" TO "service_role";



GRANT ALL ON SEQUENCE "public"."system_errors_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."system_errors_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."system_errors_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."ticket_attachments" TO "anon";
GRANT ALL ON TABLE "public"."ticket_attachments" TO "authenticated";
GRANT ALL ON TABLE "public"."ticket_attachments" TO "service_role";



GRANT ALL ON SEQUENCE "public"."ticket_attachments_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."ticket_attachments_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."ticket_attachments_id_seq" TO "service_role";



GRANT ALL ON SEQUENCE "public"."ticket_categories_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."ticket_categories_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."ticket_categories_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."ticket_comments" TO "anon";
GRANT ALL ON TABLE "public"."ticket_comments" TO "authenticated";
GRANT ALL ON TABLE "public"."ticket_comments" TO "service_role";



GRANT ALL ON SEQUENCE "public"."ticket_comments_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."ticket_comments_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."ticket_comments_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."ticket_history" TO "anon";
GRANT ALL ON TABLE "public"."ticket_history" TO "authenticated";
GRANT ALL ON TABLE "public"."ticket_history" TO "service_role";



GRANT ALL ON SEQUENCE "public"."ticket_history_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."ticket_history_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."ticket_history_id_seq" TO "service_role";



GRANT ALL ON SEQUENCE "public"."tickets_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."tickets_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."tickets_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."user_activity_log" TO "anon";
GRANT ALL ON TABLE "public"."user_activity_log" TO "authenticated";
GRANT ALL ON TABLE "public"."user_activity_log" TO "service_role";



GRANT ALL ON SEQUENCE "public"."user_activity_log_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."user_activity_log_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."user_activity_log_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."user_cleanup_audit" TO "anon";
GRANT ALL ON TABLE "public"."user_cleanup_audit" TO "authenticated";
GRANT ALL ON TABLE "public"."user_cleanup_audit" TO "service_role";



GRANT ALL ON SEQUENCE "public"."user_cleanup_audit_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."user_cleanup_audit_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."user_cleanup_audit_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."user_details_archive" TO "anon";
GRANT ALL ON TABLE "public"."user_details_archive" TO "authenticated";
GRANT ALL ON TABLE "public"."user_details_archive" TO "service_role";



GRANT ALL ON TABLE "public"."user_locations" TO "anon";
GRANT ALL ON TABLE "public"."user_locations" TO "authenticated";
GRANT ALL ON TABLE "public"."user_locations" TO "service_role";



GRANT ALL ON SEQUENCE "public"."user_locations_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."user_locations_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."user_locations_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."user_preferences" TO "anon";
GRANT ALL ON TABLE "public"."user_preferences" TO "authenticated";
GRANT ALL ON TABLE "public"."user_preferences" TO "service_role";



GRANT ALL ON SEQUENCE "public"."user_preferences_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."user_preferences_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."user_preferences_id_seq" TO "service_role";



GRANT ALL ON TABLE "public"."user_sessions" TO "anon";
GRANT ALL ON TABLE "public"."user_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."user_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."whatsapp_numbers" TO "anon";
GRANT ALL ON TABLE "public"."whatsapp_numbers" TO "authenticated";
GRANT ALL ON TABLE "public"."whatsapp_numbers" TO "service_role";



GRANT ALL ON SEQUENCE "public"."whatsapp_numbers_id_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."whatsapp_numbers_id_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."whatsapp_numbers_id_seq" TO "service_role";



ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";







