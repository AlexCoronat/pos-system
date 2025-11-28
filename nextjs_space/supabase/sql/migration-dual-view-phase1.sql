-- ============================================================================
-- MIGRATION: Dual-View POS System - Database Schema Updates
-- Phase 1: New tables and modifications for Admin/Seller interface
-- ============================================================================
-- Description: This migration adds support for:
--   - User preferences for view customization
--   - Cash register management
--   - Cash register shifts (opening/closing)
--   - Cash movements tracking
--   - Offline synchronization queue
--   - Product sale frequency tracking
-- ============================================================================

-- ============================================================================
-- TABLE 1: user_preferences
-- Purpose: Store individual user UI preferences and settings
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_preferences (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    business_id INTEGER NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    
    -- View preferences
    default_view VARCHAR(20) DEFAULT 'auto' CHECK (default_view IN ('auto', 'admin', 'seller')),
    sidebar_collapsed BOOLEAN DEFAULT false,
    
    -- Theme preferences
    theme VARCHAR(20) DEFAULT 'system' CHECK (theme IN ('light', 'dark', 'system')),
    accent_color VARCHAR(7) DEFAULT '#10b981', -- Emerald-500 as default
    
    -- Product quick access (array of product IDs)
    quick_products JSONB DEFAULT '[]'::jsonb,
    
    -- Keyboard shortcuts (customizable)
    keyboard_shortcuts JSONB DEFAULT '{
        "search": "F2",
        "checkout": "F12",
        "cancel": "Escape",
        "addCustomer": "F3",
        "discount": "F8"
    }'::jsonb,
    
    -- POS preferences
    auto_print_receipt BOOLEAN DEFAULT false,
    sound_enabled BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    -- Constraints
    UNIQUE(user_id, business_id)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON public.user_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_user_preferences_business_id ON public.user_preferences(business_id);

-- RLS Policies
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- Users can only view/edit their own preferences
CREATE POLICY "Users can view own preferences"
    ON public.user_preferences FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
    ON public.user_preferences FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
    ON public.user_preferences FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own preferences"
    ON public.user_preferences FOR DELETE
    USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_user_preferences_updated_at
    BEFORE UPDATE ON public.user_preferences
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.user_preferences IS 'Stores user-specific UI preferences and settings';

-- ============================================================================
-- TABLE 2: cash_registers
-- Purpose: Define cash registers/terminals per location
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.cash_registers (
    id BIGSERIAL PRIMARY KEY,
    business_id INTEGER NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
    location_id BIGINT REFERENCES public.locations(id) ON DELETE SET NULL,
    
    -- Register details
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20) NOT NULL, -- e.g., CAJA-01, TERMINAL-A
    description TEXT,
    
    -- Status
    is_active BOOLEAN DEFAULT true NOT NULL,
    is_main BOOLEAN DEFAULT false NOT NULL, -- One main register per location
    
    -- Hardware integration (for future use)
    hardware_config JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    
    -- Constraints
    UNIQUE(business_id, code),
    UNIQUE(location_id, code)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cash_registers_business_id ON public.cash_registers(business_id);
CREATE INDEX IF NOT EXISTS idx_cash_registers_location_id ON public.cash_registers(location_id);
CREATE INDEX IF NOT EXISTS idx_cash_registers_is_active ON public.cash_registers(is_active) WHERE is_active = true;

-- RLS Policies
ALTER TABLE public.cash_registers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view cash registers in their business"
    ON public.cash_registers FOR SELECT
    USING (business_id = public.get_user_business_id());

CREATE POLICY "Admins can manage cash registers"
    ON public.cash_registers FOR ALL
    USING (business_id = public.get_user_business_id() AND public.is_admin());

-- Trigger for updated_at
CREATE TRIGGER update_cash_registers_updated_at
    BEFORE UPDATE ON public.cash_registers
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.cash_registers IS 'Defines cash registers/terminals per business location';

-- ============================================================================
-- TABLE 3: cash_register_shifts
-- Purpose: Track opening and closing of cash register sessions
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.cash_register_shifts (
    id BIGSERIAL PRIMARY KEY,
    cash_register_id BIGINT NOT NULL REFERENCES public.cash_registers(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Shift identification
    shift_number VARCHAR(30) NOT NULL UNIQUE, -- Auto-generated: CAJA-YYYYMMDD-001
    
    -- Status
    status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'suspended', 'closed')) NOT NULL,
    
    -- Financial tracking
    opening_amount DECIMAL(12,2) DEFAULT 0.00 NOT NULL,
    expected_amount DECIMAL(12,2), -- Calculated at closing
    actual_amount DECIMAL(12,2), -- Counted at closing
    difference DECIMAL(12,2), -- actual - expected (can be positive/negative)
    
    -- Timestamps
    opened_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    closed_at TIMESTAMPTZ,
    
    -- Notes
    opening_notes TEXT,
    closing_notes TEXT,
    
    -- Summary (JSON with breakdown by payment method, etc.)
    summary JSONB DEFAULT '{}'::jsonb,
    
    -- Metadata
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_shifts_cash_register_id ON public.cash_register_shifts(cash_register_id);
CREATE INDEX IF NOT EXISTS idx_shifts_user_id ON public.cash_register_shifts(user_id);
CREATE INDEX IF NOT EXISTS idx_shifts_status ON public.cash_register_shifts(status);
CREATE INDEX IF NOT EXISTS idx_shifts_opened_at ON public.cash_register_shifts(opened_at DESC);

-- RLS Policies
ALTER TABLE public.cash_register_shifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view shifts in their business"
    ON public.cash_register_shifts FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.cash_registers cr
            WHERE cr.id = cash_register_id
            AND cr.business_id = public.get_user_business_id()
        )
    );

CREATE POLICY "Users can create shifts"
    ON public.cash_register_shifts FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.cash_registers cr
            WHERE cr.id = cash_register_id
            AND cr.business_id = public.get_user_business_id()
        )
    );

CREATE POLICY "Users can update their own shifts"
    ON public.cash_register_shifts FOR UPDATE
    USING (
        user_id = auth.uid() OR public.is_admin()
    );

-- Trigger for updated_at
CREATE TRIGGER update_cash_register_shifts_updated_at
    BEFORE UPDATE ON public.cash_register_shifts
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Function to auto-generate shift number
CREATE OR REPLACE FUNCTION public.generate_shift_number(p_cash_register_id BIGINT)
RETURNS VARCHAR AS $$
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
$$ LANGUAGE plpgsql;

COMMENT ON TABLE public.cash_register_shifts IS 'Tracks cash register shift sessions with opening/closing amounts';

-- ============================================================================
-- TABLE 4: cash_register_movements
-- Purpose: Log all cash movements during a shift
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.cash_register_movements (
    id BIGSERIAL PRIMARY KEY,
    shift_id BIGINT NOT NULL REFERENCES public.cash_register_shifts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Movement type
    movement_type VARCHAR(30) NOT NULL CHECK (movement_type IN (
        'opening',      -- Initial cash in drawer
        'sale',         -- Sale transaction
        'refund',       -- Refund to customer
        'deposit',      -- Cash deposit to safe
        'withdrawal',   -- Cash withdrawal from drawer
        'closing'       -- Final count
    )),
    
    -- Financial data
    amount DECIMAL(12,2) NOT NULL,
    
    -- References
    payment_method_id INTEGER REFERENCES public.payment_methods(id) ON DELETE SET NULL,
    sale_id BIGINT REFERENCES public.sales(id) ON DELETE SET NULL,
    
    -- Description
    description TEXT,
    
    -- Metadata
    metadata JSONB DEFAULT '{}'::jsonb,
    
    -- Timestamp
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_movements_shift_id ON public.cash_register_movements(shift_id);
CREATE INDEX IF NOT EXISTS idx_movements_user_id ON public.cash_register_movements(user_id);
CREATE INDEX IF NOT EXISTS idx_movements_type ON public.cash_register_movements(movement_type);
CREATE INDEX IF NOT EXISTS idx_movements_sale_id ON public.cash_register_movements(sale_id) WHERE sale_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_movements_created_at ON public.cash_register_movements(created_at DESC);

-- RLS Policies
ALTER TABLE public.cash_register_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view movements in their business"
    ON public.cash_register_movements FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.cash_register_shifts crs
            JOIN public.cash_registers cr ON cr.id = crs.cash_register_id
            WHERE crs.id = shift_id
            AND cr.business_id = public.get_user_business_id()
        )
    );

CREATE POLICY "Users can create movements"
    ON public.cash_register_movements FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.cash_register_shifts crs
            JOIN public.cash_registers cr ON cr.id = crs.cash_register_id
            WHERE crs.id = shift_id
            AND cr.business_id = public.get_user_business_id()
        )
    );

COMMENT ON TABLE public.cash_register_movements IS 'Logs all cash movements during cash register shifts';

-- ============================================================================
-- TABLE 5: offline_sync_queue
-- Purpose: Queue for syncing operations made offline
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.offline_sync_queue (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    device_id VARCHAR(100) NOT NULL,
    
    -- Operation details
    operation_type VARCHAR(50) NOT NULL, -- 'sale', 'inventory_adjustment', etc.
    payload JSONB NOT NULL,
    
    -- Sync status
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')) NOT NULL,
    attempts INT DEFAULT 0 NOT NULL,
    error_message TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    synced_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_offline_queue_user_id ON public.offline_sync_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_offline_queue_status ON public.offline_sync_queue(status) WHERE status IN ('pending', 'failed');
CREATE INDEX IF NOT EXISTS idx_offline_queue_created_at ON public.offline_sync_queue(created_at);

-- RLS Policies
ALTER TABLE public.offline_sync_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sync queue"
    ON public.offline_sync_queue FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert to their sync queue"
    ON public.offline_sync_queue FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their sync queue"
    ON public.offline_sync_queue FOR UPDATE
    USING (auth.uid() = user_id);

COMMENT ON TABLE public.offline_sync_queue IS 'Queue for synchronizing offline operations';

-- ============================================================================
-- MODIFICATIONS TO EXISTING TABLES
-- ============================================================================

-- Add shift_id to sales table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'sales'
        AND column_name = 'shift_id'
    ) THEN
        ALTER TABLE public.sales
        ADD COLUMN shift_id BIGINT REFERENCES public.cash_register_shifts(id) ON DELETE SET NULL;
        
        CREATE INDEX IF NOT EXISTS idx_sales_shift_id ON public.sales(shift_id);
        
        COMMENT ON COLUMN public.sales.shift_id IS 'Reference to cash register shift';
    END IF;
END $$;

-- Add is_offline flag to sales table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'sales'
        AND column_name = 'is_offline'
    ) THEN
        ALTER TABLE public.sales
        ADD COLUMN is_offline BOOLEAN DEFAULT false;
        
        COMMENT ON COLUMN public.sales.is_offline IS 'Indicates if sale was created offline';
    END IF;
END $$;

-- Add offline_id to sales table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'sales'
        AND column_name = 'offline_id'
    ) THEN
        ALTER TABLE public.sales
        ADD COLUMN offline_id VARCHAR(100);
        
        CREATE INDEX IF NOT EXISTS idx_sales_offline_id ON public.sales(offline_id) WHERE offline_id IS NOT NULL;
        
        COMMENT ON COLUMN public.sales.offline_id IS 'Temporary ID used when created offline';
    END IF;
END $$;

-- Add sale_frequency to products table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'products'
        AND column_name = 'sale_frequency'
    ) THEN
        ALTER TABLE public.products
        ADD COLUMN sale_frequency INTEGER DEFAULT 0 NOT NULL;
        
        CREATE INDEX IF NOT EXISTS idx_products_sale_frequency ON public.products(sale_frequency DESC);
        
        COMMENT ON COLUMN public.products.sale_frequency IS 'Counter for how many times product has been sold';
    END IF;
END $$;

-- Add is_favorite flag to products table (for manual quick access configuration)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'products'
        AND column_name = 'is_favorite'
    ) THEN
        ALTER TABLE public.products
        ADD COLUMN is_favorite BOOLEAN DEFAULT false;
        
        CREATE INDEX IF NOT EXISTS idx_products_is_favorite ON public.products(is_favorite) WHERE is_favorite = true;
        
        COMMENT ON COLUMN public.products.is_favorite IS 'Marks product as favorite for quick access';
    END IF;
END $$;

-- Add preferred_view to user_details table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'user_details'
        AND column_name = 'preferred_view'
    ) THEN
        ALTER TABLE public.user_details
        ADD COLUMN preferred_view VARCHAR(20) CHECK (preferred_view IN ('auto', 'admin', 'seller'));
        
        COMMENT ON COLUMN public.user_details.preferred_view IS 'User preferred view mode';
    END IF;
END $$;

-- Add default_cash_register_id to user_details table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'user_details'
        AND column_name = 'default_cash_register_id'
    ) THEN
        ALTER TABLE public.user_details
        ADD COLUMN default_cash_register_id BIGINT REFERENCES public.cash_registers(id) ON DELETE SET NULL;
        
        COMMENT ON COLUMN public.user_details.default_cash_register_id IS 'Default cash register assigned to user';
    END IF;
END $$;

-- ============================================================================
-- TRIGGER: Update product sale_frequency on sale
-- ============================================================================

CREATE OR REPLACE FUNCTION public.increment_product_sale_frequency()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.products
        SET sale_frequency = sale_frequency + NEW.quantity
        WHERE id = NEW.product_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_increment_product_sale_frequency ON public.sale_items;
CREATE TRIGGER trigger_increment_product_sale_frequency
    AFTER INSERT ON public.sale_items
    FOR EACH ROW
    EXECUTE FUNCTION public.increment_product_sale_frequency();

COMMENT ON FUNCTION public.increment_product_sale_frequency IS 'Increments product sale frequency counter when sold';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Verify all tables were created
DO $$
DECLARE
    v_table_count INT;
BEGIN
    SELECT COUNT(*) INTO v_table_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name IN (
        'user_preferences',
        'cash_registers',
        'cash_register_shifts',
        'cash_register_movements',
        'offline_sync_queue'
    );
    
    RAISE NOTICE 'Created % out of 5 new tables', v_table_count;
    
    IF v_table_count = 5 THEN
        RAISE NOTICE '✅ All new tables created successfully';
    ELSE
        RAISE WARNING '⚠️ Some tables may not have been created';
    END IF;
END $$;

-- Verify columns were added
DO $$
DECLARE
    v_column_count INT;
BEGIN
    SELECT COUNT(*) INTO v_column_count
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND (
        (table_name = 'sales' AND column_name IN ('shift_id', 'is_offline', 'offline_id'))
        OR (table_name = 'products' AND column_name IN ('sale_frequency', 'is_favorite'))
        OR (table_name = 'user_details' AND column_name IN ('preferred_view', 'default_cash_register_id'))
    );
    
    RAISE NOTICE 'Added % out of 8 expected columns to existing tables', v_column_count;
    
    IF v_column_count = 8 THEN
        RAISE NOTICE '✅ All columns added successfully';
    ELSE
        RAISE WARNING '⚠️ Some columns may not have been added';
    END IF;
END $$;

-- ============================================================================
-- COMPLETION SUMMARY
-- ============================================================================
SELECT 
    '✅ Database migration completed successfully!' as status,
    'Phase 1: Dual-View POS System - Schema Updates' as migration_name,
    CURRENT_TIMESTAMP as completed_at;
