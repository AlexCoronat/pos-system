-- Modify notifications system for multi-store POS
-- Author: System
-- Date: 2025-12-05
-- This migration adds multi-store support to existing notifications table

-- ============================================================================
-- NOTIFICATIONS TABLE - ADD MISSING COLUMNS
-- ============================================================================

-- Add business_id column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'notifications' 
                   AND column_name = 'business_id') THEN
        ALTER TABLE public.notifications 
        ADD COLUMN business_id INTEGER NOT NULL DEFAULT 1 REFERENCES public.businesses(id) ON DELETE CASCADE;
        
        -- Remove default after adding column
        ALTER TABLE public.notifications ALTER COLUMN business_id DROP DEFAULT;
    END IF;
END $$;

-- Add location_id column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'notifications' 
                   AND column_name = 'location_id') THEN
        ALTER TABLE public.notifications 
        ADD COLUMN location_id INTEGER REFERENCES public.locations(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add user_id column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'notifications' 
                   AND column_name = 'user_id') THEN
        ALTER TABLE public.notifications 
        ADD COLUMN user_id UUID REFERENCES public.user_details(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add type column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'notifications' 
                   AND column_name = 'type') THEN
        ALTER TABLE public.notifications 
        ADD COLUMN type VARCHAR(50) NOT NULL DEFAULT 'info' CHECK (type IN ('stock_alert', 'sales', 'system', 'info'));
        
        -- Remove default after adding column
        ALTER TABLE public.notifications ALTER COLUMN type DROP DEFAULT;
    END IF;
END $$;

-- Add title column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'notifications' 
                   AND column_name = 'title') THEN
        ALTER TABLE public.notifications 
        ADD COLUMN title VARCHAR(255) NOT NULL DEFAULT 'Notification';
        
        -- Remove default after adding column
        ALTER TABLE public.notifications ALTER COLUMN title DROP DEFAULT;
    END IF;
END $$;

-- Add message column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'notifications' 
                   AND column_name = 'message') THEN
        ALTER TABLE public.notifications 
        ADD COLUMN message TEXT NOT NULL DEFAULT '';
        
        -- Remove default after adding column
        ALTER TABLE public.notifications ALTER COLUMN message DROP DEFAULT;
    END IF;
END $$;

-- Add data column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'notifications' 
                   AND column_name = 'data') THEN
        ALTER TABLE public.notifications 
        ADD COLUMN data JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;

-- Add read column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'notifications' 
                   AND column_name = 'read') THEN
        ALTER TABLE public.notifications 
        ADD COLUMN read BOOLEAN DEFAULT false NOT NULL;
    END IF;
END $$;

-- Add read_at column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'notifications' 
                   AND column_name = 'read_at') THEN
        ALTER TABLE public.notifications 
        ADD COLUMN read_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- Add created_at column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'notifications' 
                   AND column_name = 'created_at') THEN
        ALTER TABLE public.notifications 
        ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL;
    END IF;
END $$;

-- Add expires_at column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_schema = 'public' 
                   AND table_name = 'notifications' 
                   AND column_name = 'expires_at') THEN
        ALTER TABLE public.notifications 
        ADD COLUMN expires_at TIMESTAMP WITH TIME ZONE;
    END IF;
END $$;

-- Add table and column comments
COMMENT ON TABLE public.notifications IS 'System notifications for users with multi-store support';
COMMENT ON COLUMN public.notifications.business_id IS 'Business that owns this notification';
COMMENT ON COLUMN public.notifications.location_id IS 'Specific location (NULL for business-wide)';
COMMENT ON COLUMN public.notifications.user_id IS 'Target user (NULL for all users in business/location)';
COMMENT ON COLUMN public.notifications.type IS 'Notification type: stock_alert, sales, system, info';
COMMENT ON COLUMN public.notifications.data IS 'Additional metadata in JSON format';
COMMENT ON COLUMN public.notifications.expires_at IS 'When notification should be auto-deleted';

-- ============================================================================
-- NOTIFICATION PREFERENCES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.notification_preferences (
    id SERIAL PRIMARY KEY,
    business_id INTEGER NOT NULL UNIQUE REFERENCES public.businesses(id) ON DELETE CASCADE,
    desktop_notifications BOOLEAN DEFAULT true NOT NULL,
    sound_enabled BOOLEAN DEFAULT true NOT NULL,
    low_stock_alerts BOOLEAN DEFAULT true NOT NULL,
    low_stock_threshold INTEGER DEFAULT 10 NOT NULL CHECK (low_stock_threshold > 0),
    sales_notifications BOOLEAN DEFAULT true NOT NULL,
    sales_amount_threshold NUMERIC(12,2) DEFAULT 1000.00,
    daily_email_summary BOOLEAN DEFAULT false NOT NULL,
    email_recipients TEXT[] DEFAULT ARRAY[]::TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Add table comment
COMMENT ON TABLE public.notification_preferences IS 'Business-level notification configuration (applies to all locations)';

-- Add column comments
COMMENT ON COLUMN public.notification_preferences.low_stock_threshold IS 'Stock level that triggers low stock alerts';
COMMENT ON COLUMN public.notification_preferences.sales_amount_threshold IS 'Sales amount that triggers large sale notifications';
COMMENT ON COLUMN public.notification_preferences.email_recipients IS 'Email addresses for daily summary';

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_business_user ON public.notifications(business_id, user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_location ON public.notifications(location_id) WHERE location_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(business_id, read) WHERE read = false;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view notifications from their business" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notification read status" ON public.notifications;
DROP POLICY IF EXISTS "Admins can create notifications" ON public.notifications;
DROP POLICY IF EXISTS "System can delete old notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can view their business preferences" ON public.notification_preferences;
DROP POLICY IF EXISTS "Admins can manage business preferences" ON public.notification_preferences;

-- Notifications policies
CREATE POLICY "Users can view notifications from their business"
    ON public.notifications
    FOR SELECT
    USING (
        business_id = (SELECT business_id FROM public.user_details WHERE id = auth.uid())
        AND (
            user_id IS NULL -- Business-wide notification
            OR user_id = auth.uid() -- Targeted to this user
            OR location_id IN ( -- User has access to this location
                SELECT location_id 
                FROM public.user_locations 
                WHERE user_id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can update their own notification read status"
    ON public.notifications
    FOR UPDATE
    USING (
        business_id = (SELECT business_id FROM public.user_details WHERE id = auth.uid())
        AND (user_id IS NULL OR user_id = auth.uid())
    )
    WITH CHECK (
        business_id = (SELECT business_id FROM public.user_details WHERE id = auth.uid())
    );

CREATE POLICY "Admins can create notifications"
    ON public.notifications
    FOR INSERT
    WITH CHECK (
        business_id = (SELECT business_id FROM public.user_details WHERE id = auth.uid())
    );

CREATE POLICY "System can delete old notifications"
    ON public.notifications
    FOR DELETE
    USING (
        expires_at IS NOT NULL 
        AND expires_at < CURRENT_TIMESTAMP
    );

-- Notification preferences policies
CREATE POLICY "Users can view their business preferences"
    ON public.notification_preferences
    FOR SELECT
    USING (
        business_id = (SELECT business_id FROM public.user_details WHERE id = auth.uid())
    );

CREATE POLICY "Admins can manage business preferences"
    ON public.notification_preferences
    FOR ALL
    USING (
        business_id = (SELECT business_id FROM public.user_details WHERE id = auth.uid())
        AND EXISTS (
            SELECT 1 FROM public.user_details ud
            JOIN public.roles r ON ud.role_id = r.id
            WHERE ud.id = auth.uid()
            AND r.name IN ('admin', 'owner')
        )
    );

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_notification_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS trigger_update_notification_preferences_updated_at ON public.notification_preferences;
CREATE TRIGGER trigger_update_notification_preferences_updated_at
    BEFORE UPDATE ON public.notification_preferences
    FOR EACH ROW
    EXECUTE FUNCTION public.update_notification_preferences_updated_at();

-- Function to auto-delete expired notifications
CREATE OR REPLACE FUNCTION public.delete_expired_notifications()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.notifications
    WHERE expires_at IS NOT NULL 
    AND expires_at < CURRENT_TIMESTAMP;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.delete_expired_notifications() IS 'Deletes notifications that have passed their expiration date';

-- ============================================================================
-- INITIAL DATA
-- ============================================================================

-- Create default preferences for existing businesses
INSERT INTO public.notification_preferences (business_id)
SELECT id FROM public.businesses
ON CONFLICT (business_id) DO NOTHING;
