-- =============================================
-- SETTINGS MODULES - Adapted to Existing Schema
-- Migration: 013_settings_modules.sql
-- =============================================
-- Description: Creates tables for Company, Payment, Notification, and Security settings
-- while reusing existing structures (businesses, locations, payment_methods, audit_log)

-- =============================================
-- 1. BUSINESS PAYMENT SETTINGS
-- =============================================
-- Links businesses to global payment_methods catalog
-- Stores per-business configuration for each payment method

CREATE TABLE IF NOT EXISTS public.business_payment_settings (
  id SERIAL PRIMARY KEY,
  business_id INT NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  payment_method_id INT NOT NULL REFERENCES public.payment_methods(id) ON DELETE CASCADE,
  
  -- Enable/disable this method for this business
  is_enabled BOOLEAN DEFAULT false NOT NULL,
  
  -- Method-specific configuration (flexible JSONB)
  config JSONB DEFAULT '{}'::jsonb NOT NULL,
  /* Configuration examples by method type:
     
     CASH:
     {
       "denominations": [20, 50, 100, 200, 500, 1000],
       "opening_balance": 1000,
       "require_count_on_close": true
     }
     
     CARD:
     {
       "processor": "stripe",
       "api_key_encrypted": "enc_...",
       "fee_percentage": 3.6,
       "fee_fixed": 3.00,
       "installments": [3, 6, 12],
       "terminal": {
         "model": "Clip Pro",
         "connection": "bluetooth",
         "device_id": "ABC123"
       },
       "tips": {
         "enabled": true,
         "suggestions": [10, 15, 20]
       }
     }
  */
  
  -- Display order in UI
  display_order INT DEFAULT 0 NOT NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- Ensure one config per business-method combination
  CONSTRAINT unique_business_payment UNIQUE(business_id, payment_method_id)
);

-- Index for quick lookup of enabled methods
CREATE INDEX idx_business_payment_settings_business 
  ON public.business_payment_settings(business_id) 
  WHERE is_enabled = true;

-- Index for ordering
CREATE INDEX idx_business_payment_settings_order 
  ON public.business_payment_settings(business_id, display_order);

COMMENT ON TABLE public.business_payment_settings IS 'Per-business configuration of payment methods';
COMMENT ON COLUMN public.business_payment_settings.config IS 'Method-specific settings in JSONB: processor details, fees, terminal config, etc.';
COMMENT ON COLUMN public.business_payment_settings.display_order IS 'Order to display payment methods in UI';

-- =============================================
-- 2. NOTIFICATION SETTINGS
-- =============================================
-- Stores notification preferences per business or per user

CREATE TABLE IF NOT EXISTS public.notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id INT NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.user_details(id) ON DELETE CASCADE,
  
  -- NULL user_id = business-wide default settings
  -- Non-null user_id = user-specific override
  
  -- Enabled channels
  channels JSONB DEFAULT '{"email": true, "push": true, "in_app": true}'::jsonb NOT NULL,
  
  -- Event-specific configuration
  events JSONB DEFAULT '{}'::jsonb NOT NULL,
  /* Event configuration example:
     {
       "sale.created": {"email": true, "push": true, "in_app": true},
       "sale.cancelled": {"email": true, "push": false, "in_app": true},
       "inventory.low_stock": {"email": true, "push": false, "in_app": true},
       "inventory.out_of_stock": {"email": true, "push": true, "in_app": true},
       "team.member_added": {"email": true, "push": false, "in_app": true},
       "team.member_removed": {"email": true, "push": false, "in_app": true},
       "system.error": {"email": true, "push": true, "in_app": true}
     }
  */
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- One config per business-user combination
  CONSTRAINT unique_business_user_notif UNIQUE(business_id, user_id)
);

-- Indexes for lookups
CREATE INDEX idx_notification_settings_business 
  ON public.notification_settings(business_id);

CREATE INDEX idx_notification_settings_user 
  ON public.notification_settings(user_id);

-- Index for finding business defaults
CREATE INDEX idx_notification_settings_business_default 
  ON public.notification_settings(business_id) 
  WHERE user_id IS NULL;

COMMENT ON TABLE public.notification_settings IS 'Notification preferences (business-wide or per-user)';
COMMENT ON COLUMN public.notification_settings.user_id IS 'NULL = business default, non-null = user override';
COMMENT ON COLUMN public.notification_settings.channels IS 'Enabled notification channels: email, push, in_app';
COMMENT ON COLUMN public.notification_settings.events IS 'Per-event channel configuration';

-- =============================================
-- 3. EMAIL TEMPLATES
-- =============================================
-- Customizable email templates per business and event type

CREATE TABLE IF NOT EXISTS public.email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id INT NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL,
  
  -- Template content
  subject TEXT NOT NULL,
  body TEXT NOT NULL, -- Markdown with variable placeholders
  
  -- Available variables for this template
  variables TEXT[] DEFAULT ARRAY[]::TEXT[],
  /* Common variables:
     ['customer_name', 'amount', 'date', 'order_number', 'product_name', etc.]
     
     Usage in template:
     "Hola {customer_name}, tu orden #{order_number} por {amount} ha sido confirmada."
  */
  
  -- Template metadata
  is_active BOOLEAN DEFAULT true NOT NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  -- One template per business-event combination
  CONSTRAINT unique_business_event UNIQUE(business_id, event_type)
);

CREATE INDEX idx_email_templates_business 
  ON public.email_templates(business_id);

CREATE INDEX idx_email_templates_event 
  ON public.email_templates(event_type);

CREATE INDEX idx_email_templates_active 
  ON public.email_templates(business_id, event_type) 
  WHERE is_active = true;

COMMENT ON TABLE public.email_templates IS 'Customizable email templates per event type';
COMMENT ON COLUMN public.email_templates.event_type IS 'Event identifier: sale.created, inventory.low_stock, etc.';
COMMENT ON COLUMN public.email_templates.body IS 'Template body in Markdown with {variable} placeholders';
COMMENT ON COLUMN public.email_templates.variables IS 'List of available variables for this template';

-- =============================================
-- 4. SECURITY SETTINGS
-- =============================================
-- Security policies per business

CREATE TABLE IF NOT EXISTS public.security_settings (
  business_id INT PRIMARY KEY REFERENCES public.businesses(id) ON DELETE CASCADE,
  
  -- Password policy
  password_policy JSONB DEFAULT '{
    "min_length": 8,
    "require_uppercase": true,
    "require_lowercase": true,
    "require_numbers": true,
    "require_symbols": false,
    "expiration_days": null,
    "history_count": 3,
    "max_attempts": 5,
    "lockout_minutes": 15
  }'::jsonb NOT NULL,
  
  -- Two-factor authentication config
  two_factor_config JSONB DEFAULT '{
    "required": "none",
    "methods": ["app"]
  }'::jsonb NOT NULL,
  /* Options:
     required: "none" | "admins" | "all"
     methods: ["app", "sms", "email"]
  */
  
  -- Session management
  session_config JSONB DEFAULT '{
    "duration_hours": 8,
    "inactivity_minutes": 30,
    "max_concurrent": 3
  }'::jsonb NOT NULL,
  
  -- Audit log retention
  audit_retention_days INT DEFAULT 90 NOT NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

COMMENT ON TABLE public.security_settings IS 'Security policies per business';
COMMENT ON COLUMN public.security_settings.password_policy IS 'Password requirements and expiration rules';
COMMENT ON COLUMN public.security_settings.two_factor_config IS '2FA configuration: requirement level and methods';
COMMENT ON COLUMN public.security_settings.session_config IS 'Session timeout and concurrency limits';
COMMENT ON COLUMN public.security_settings.audit_retention_days IS 'How long to keep audit logs';

-- =============================================
-- 5. OPTIMIZE EXISTING AUDIT_LOG TABLE
-- =============================================
-- Add indexes for better query performance in Security module

CREATE INDEX IF NOT EXISTS idx_audit_log_user_date 
  ON public.audit_log(user_id, created_at DESC)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_audit_log_table_action 
  ON public.audit_log(table_name, action, created_at DESC)
  WHERE table_name IN ('businesses', 'user_details', 'sales', 'inventory', 'products');

CREATE INDEX IF NOT EXISTS idx_audit_log_session 
  ON public.audit_log(session_id, created_at DESC)
  WHERE session_id IS NOT NULL;

COMMENT ON INDEX public.idx_audit_log_user_date IS 'Optimize user activity queries';
COMMENT ON INDEX public.idx_audit_log_table_action IS 'Optimize filtered audit log queries';

-- =============================================
-- 6. ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================

-- Enable RLS on new tables
ALTER TABLE public.business_payment_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_settings ENABLE ROW LEVEL SECURITY;

-- ===== BUSINESS PAYMENT SETTINGS POLICIES =====

-- All business members can view their business payment settings
CREATE POLICY "business_members_view_payment_settings"
  ON public.business_payment_settings
  FOR SELECT
  USING (business_id = public.get_user_business_id());

-- Only admins can modify payment settings
CREATE POLICY "admins_modify_payment_settings"
  ON public.business_payment_settings
  FOR ALL
  USING (public.is_admin() AND business_id = public.get_user_business_id());

-- ===== NOTIFICATION SETTINGS POLICIES =====

-- Users can view their own notification settings or business defaults
CREATE POLICY "users_view_notification_settings"
  ON public.notification_settings
  FOR SELECT
  USING (
    business_id = public.get_user_business_id()
    AND (user_id IS NULL OR user_id = auth.uid())
  );

-- Users can update their own notification settings
CREATE POLICY "users_update_own_notification_settings"
  ON public.notification_settings
  FOR UPDATE
  USING (business_id = public.get_user_business_id() AND user_id = auth.uid());

-- Admins can modify business-wide notification settings
CREATE POLICY "admins_modify_notification_settings"
  ON public.notification_settings
  FOR ALL
  USING (public.is_admin() AND business_id = public.get_user_business_id());

-- ===== EMAIL TEMPLATES POLICIES =====

-- All business members can view email templates
CREATE POLICY "business_members_view_email_templates"
  ON public.email_templates
  FOR SELECT
  USING (business_id = public.get_user_business_id());

-- Only admins can modify email templates
CREATE POLICY "admins_modify_email_templates"
  ON public.email_templates
  FOR ALL
  USING (public.is_admin() AND business_id = public.get_user_business_id());

-- ===== SECURITY SETTINGS POLICIES =====

-- All business members can view security settings
CREATE POLICY "business_members_view_security_settings"
  ON public.security_settings
  FOR SELECT
  USING (business_id = public.get_user_business_id());

-- Only admins can modify security settings
CREATE POLICY "admins_modify_security_settings"
  ON public.security_settings
  FOR ALL
  USING (public.is_admin() AND business_id = public.get_user_business_id());

-- =============================================
-- 7. HELPER FUNCTIONS
-- =============================================

-- Get enabled payment methods for a business
CREATE OR REPLACE FUNCTION public.get_enabled_payment_methods(p_business_id INT)
RETURNS TABLE (
  method_id INT,
  method_code VARCHAR,
  method_name VARCHAR,
  method_type VARCHAR,
  config JSONB,
  display_order INT
) 
LANGUAGE SQL 
SECURITY DEFINER
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

COMMENT ON FUNCTION public.get_enabled_payment_methods(INT) IS 'Returns enabled payment methods for a business with their configuration';

-- Get notification preferences (user-specific or business default)
CREATE OR REPLACE FUNCTION public.get_notification_preferences(p_user_id UUID)
RETURNS TABLE (
  channels JSONB,
  events JSONB
)
LANGUAGE SQL
SECURITY DEFINER
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

COMMENT ON FUNCTION public.get_notification_preferences(UUID) IS 'Gets user notification preferences or business defaults';

-- =============================================
-- 8. DEFAULT DATA
-- =============================================

-- Ensure basic payment methods exist in catalog
INSERT INTO public.payment_methods (code, name, type, is_active, requires_reference)
VALUES 
  ('cash', 'Efectivo', 'cash', true, false),
  ('card', 'Tarjeta', 'card', true, false)
ON CONFLICT (code) DO NOTHING;

COMMENT ON COLUMN public.payment_methods.code IS 'Unique payment method code';

-- =============================================
-- VERIFICATION QUERIES
-- =============================================

-- Verify all tables were created
DO $$
BEGIN
  ASSERT (SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'business_payment_settings'
  )), 'Table business_payment_settings not created';
  
  ASSERT (SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'notification_settings'
  )), 'Table notification_settings not created';
  
  ASSERT (SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'email_templates'
  )), 'Table email_templates not created';
  
  ASSERT (SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'security_settings'
  )), 'Table security_settings not created';
  
  RAISE NOTICE '✅ All settings tables created successfully';
END $$;
