-- =====================================================
-- POS SYSTEM - FUNCTIONS, TRIGGERS & RLS POLICIES
-- =====================================================

-- =====================================================
-- SECTION 1: HELPER FUNCTIONS
-- =====================================================

-- Function to get current user's business_id
CREATE OR REPLACE FUNCTION get_user_business_id()
RETURNS INTEGER AS $$
BEGIN
    RETURN (
        SELECT business_id
        FROM user_details
        WHERE id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check plan limits
CREATE OR REPLACE FUNCTION check_plan_limit(
    p_business_id INTEGER,
    p_resource_type VARCHAR
)
RETURNS BOOLEAN AS $$
DECLARE
    v_plan_id INTEGER;
    v_current_count INTEGER;
    v_max_allowed INTEGER;
BEGIN
    -- Get the business's plan
    SELECT plan_id INTO v_plan_id
    FROM businesses
    WHERE id = p_business_id;

    -- Get current count and max allowed based on resource type
    IF p_resource_type = 'users' THEN
        SELECT COUNT(*) INTO v_current_count
        FROM user_details
        WHERE business_id = p_business_id AND is_active = true;

        SELECT max_users INTO v_max_allowed
        FROM subscription_plans
        WHERE id = v_plan_id;

    ELSIF p_resource_type = 'locations' THEN
        SELECT COUNT(*) INTO v_current_count
        FROM locations
        WHERE business_id = p_business_id AND deleted_at IS NULL;

        SELECT max_locations INTO v_max_allowed
        FROM subscription_plans
        WHERE id = v_plan_id;

    ELSIF p_resource_type = 'products' THEN
        SELECT COUNT(*) INTO v_current_count
        FROM products
        WHERE business_id = p_business_id AND deleted_at IS NULL;

        SELECT max_products INTO v_max_allowed
        FROM subscription_plans
        WHERE id = v_plan_id;
    END IF;

    RETURN v_current_count < v_max_allowed;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- SECTION 1.5: SEARCH FUNCTIONS
-- =====================================================

-- Function to search products with inventory for POS
-- Returns products filtered by current user's business
DROP FUNCTION IF EXISTS search_products_with_inventory(text, integer);
CREATE OR REPLACE FUNCTION search_products_with_inventory(
    p_search_term TEXT,
    p_location_id INTEGER
)
RETURNS TABLE (
    product_id INTEGER,
    product_name VARCHAR(200),
    product_sku VARCHAR(50),
    product_barcode VARCHAR(50),
    product_description TEXT,
    category_id INTEGER,
    category_name VARCHAR(100),
    selling_price NUMERIC(10, 2),
    cost_price NUMERIC(10, 2),
    tax_rate NUMERIC(5, 2),
    is_taxable BOOLEAN,
    image_url TEXT,
    unit_of_measure VARCHAR(20),
    available_stock NUMERIC(10, 2),
    inventory_id INTEGER
) AS $$
DECLARE
    v_business_id INTEGER;
BEGIN
    -- Get current user's business_id
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- SECTION 2: TRIGGERS FOR UPDATED_AT
-- =====================================================

CREATE TRIGGER tr_businesses_updated_at BEFORE UPDATE ON businesses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER tr_roles_updated_at BEFORE UPDATE ON roles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER tr_locations_updated_at BEFORE UPDATE ON locations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER tr_user_details_updated_at BEFORE UPDATE ON user_details
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER tr_categories_updated_at BEFORE UPDATE ON categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER tr_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER tr_inventory_updated_at BEFORE UPDATE ON inventory
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER tr_customers_updated_at BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER tr_sales_updated_at BEFORE UPDATE ON sales
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER tr_suppliers_updated_at BEFORE UPDATE ON suppliers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER tr_purchase_orders_updated_at BEFORE UPDATE ON purchase_orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- SECTION 3: TRIGGER FOR AUTO-ASSIGNING BUSINESS_ID
-- =====================================================

CREATE OR REPLACE FUNCTION auto_assign_business_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.business_id IS NULL THEN
        NEW.business_id := get_user_business_id();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply to relevant tables
CREATE TRIGGER tr_products_auto_business BEFORE INSERT ON products
    FOR EACH ROW EXECUTE FUNCTION auto_assign_business_id();

CREATE TRIGGER tr_categories_auto_business BEFORE INSERT ON categories
    FOR EACH ROW EXECUTE FUNCTION auto_assign_business_id();

CREATE TRIGGER tr_customers_auto_business BEFORE INSERT ON customers
    FOR EACH ROW EXECUTE FUNCTION auto_assign_business_id();

CREATE TRIGGER tr_inventory_auto_business BEFORE INSERT ON inventory
    FOR EACH ROW EXECUTE FUNCTION auto_assign_business_id();

CREATE TRIGGER tr_inventory_movements_auto_business BEFORE INSERT ON inventory_movements
    FOR EACH ROW EXECUTE FUNCTION auto_assign_business_id();

CREATE TRIGGER tr_sales_auto_business BEFORE INSERT ON sales
    FOR EACH ROW EXECUTE FUNCTION auto_assign_business_id();

CREATE TRIGGER tr_suppliers_auto_business BEFORE INSERT ON suppliers
    FOR EACH ROW EXECUTE FUNCTION auto_assign_business_id();

CREATE TRIGGER tr_purchase_orders_auto_business BEFORE INSERT ON purchase_orders
    FOR EACH ROW EXECUTE FUNCTION auto_assign_business_id();

-- =====================================================
-- SECTION 4: TRIGGER FOR NEW USER PROFILE
-- =====================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_details (id, email, first_name, last_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'last_name', '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =====================================================
-- SECTION 5: RLS POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

-- ============ SUBSCRIPTION PLANS ============
CREATE POLICY "Anyone can view plans" ON subscription_plans
    FOR SELECT USING (true);

-- ============ BUSINESSES ============
CREATE POLICY "Users can view own business" ON businesses
    FOR SELECT USING (
        id = get_user_business_id() OR owner_id = auth.uid()
    );

CREATE POLICY "Owners can update own business" ON businesses
    FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "Anyone can create business" ON businesses
    FOR INSERT WITH CHECK (owner_id = auth.uid());

-- ============ ROLES ============
CREATE POLICY "Users can view system and own business roles" ON roles
    FOR SELECT USING (
        business_id IS NULL OR business_id = get_user_business_id()
    );

CREATE POLICY "Users can manage own business roles" ON roles
    FOR ALL USING (
        business_id = get_user_business_id() AND is_system = false
    );

-- ============ LOCATIONS ============
CREATE POLICY "Users can view own business locations" ON locations
    FOR SELECT USING (business_id = get_user_business_id());

CREATE POLICY "Users can manage own business locations" ON locations
    FOR ALL USING (business_id = get_user_business_id());

-- ============ USER DETAILS ============
CREATE POLICY "Users can view own profile" ON user_details
    FOR SELECT USING (id = auth.uid() OR business_id = get_user_business_id());

CREATE POLICY "Users can update own profile" ON user_details
    FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Users can insert own profile" ON user_details
    FOR INSERT WITH CHECK (id = auth.uid());

-- ============ USER LOCATIONS ============
CREATE POLICY "Users can view own location assignments" ON user_locations
    FOR SELECT USING (
        user_id = auth.uid()
        OR user_id IN (
            SELECT id FROM user_details WHERE business_id = get_user_business_id()
        )
    );

CREATE POLICY "Users can insert location assignments" ON user_locations
    FOR INSERT WITH CHECK (
        user_id IN (
            SELECT id FROM user_details WHERE business_id = get_user_business_id()
        )
    );

CREATE POLICY "Users can update location assignments" ON user_locations
    FOR UPDATE USING (
        user_id IN (
            SELECT id FROM user_details WHERE business_id = get_user_business_id()
        )
    );

CREATE POLICY "Users can delete location assignments" ON user_locations
    FOR DELETE USING (
        user_id IN (
            SELECT id FROM user_details WHERE business_id = get_user_business_id()
        )
    );

-- ============ USER SESSIONS ============
CREATE POLICY "Users can manage own sessions" ON user_sessions
    FOR ALL USING (user_id = auth.uid());

-- ============ CATEGORIES ============
CREATE POLICY "Users can view own business categories" ON categories
    FOR SELECT USING (business_id = get_user_business_id());

CREATE POLICY "Users can manage own business categories" ON categories
    FOR ALL USING (business_id = get_user_business_id());

-- ============ PRODUCTS ============
CREATE POLICY "Users can view own business products" ON products
    FOR SELECT USING (business_id = get_user_business_id());

CREATE POLICY "Users can manage own business products" ON products
    FOR ALL USING (business_id = get_user_business_id());

-- ============ INVENTORY ============
CREATE POLICY "Users can view own business inventory" ON inventory
    FOR SELECT USING (business_id = get_user_business_id());

CREATE POLICY "Users can manage own business inventory" ON inventory
    FOR ALL USING (business_id = get_user_business_id());

-- ============ INVENTORY MOVEMENTS ============
CREATE POLICY "Users can view own business movements" ON inventory_movements
    FOR SELECT USING (business_id = get_user_business_id());

CREATE POLICY "Users can create movements" ON inventory_movements
    FOR INSERT WITH CHECK (business_id = get_user_business_id());

-- ============ CUSTOMERS ============
CREATE POLICY "Users can view own business customers" ON customers
    FOR SELECT USING (business_id = get_user_business_id());

CREATE POLICY "Users can manage own business customers" ON customers
    FOR ALL USING (business_id = get_user_business_id());

-- ============ SALES ============
CREATE POLICY "Users can view own business sales" ON sales
    FOR SELECT USING (business_id = get_user_business_id());

CREATE POLICY "Users can manage own business sales" ON sales
    FOR ALL USING (business_id = get_user_business_id());

-- ============ SALE ITEMS ============
CREATE POLICY "Users can view sale items" ON sale_items
    FOR SELECT USING (
        sale_id IN (SELECT id FROM sales WHERE business_id = get_user_business_id())
    );

CREATE POLICY "Users can manage sale items" ON sale_items
    FOR ALL USING (
        sale_id IN (SELECT id FROM sales WHERE business_id = get_user_business_id())
    );

-- ============ PAYMENT TRANSACTIONS ============
CREATE POLICY "Users can view payment transactions" ON payment_transactions
    FOR SELECT USING (
        sale_id IN (SELECT id FROM sales WHERE business_id = get_user_business_id())
    );

CREATE POLICY "Users can create payment transactions" ON payment_transactions
    FOR INSERT WITH CHECK (
        sale_id IN (SELECT id FROM sales WHERE business_id = get_user_business_id())
    );

-- ============ SUPPLIERS ============
CREATE POLICY "Users can view own business suppliers" ON suppliers
    FOR SELECT USING (business_id = get_user_business_id());

CREATE POLICY "Users can manage own business suppliers" ON suppliers
    FOR ALL USING (business_id = get_user_business_id());

-- ============ PURCHASE ORDERS ============
CREATE POLICY "Users can view own business purchase orders" ON purchase_orders
    FOR SELECT USING (business_id = get_user_business_id());

CREATE POLICY "Users can manage own business purchase orders" ON purchase_orders
    FOR ALL USING (business_id = get_user_business_id());

-- =====================================================
-- SECTION 6: GRANTS
-- =====================================================

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- =====================================================
-- SECTION 7: QUOTES MODULE LOGIC
-- =====================================================

-- Trigger to update updated_at
CREATE TRIGGER trigger_update_quotes_timestamp
    BEFORE UPDATE ON quotes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for auto-assigning business_id
CREATE TRIGGER tr_quotes_auto_business BEFORE INSERT ON quotes
    FOR EACH ROW EXECUTE FUNCTION auto_assign_business_id();

-- RLS Policies for quotes
CREATE POLICY "Users can view own business quotes" ON quotes
    FOR SELECT USING (business_id = get_user_business_id());

CREATE POLICY "Users can create quotes" ON quotes
    FOR INSERT WITH CHECK (business_id = get_user_business_id());

CREATE POLICY "Users can update own business quotes" ON quotes
    FOR UPDATE USING (business_id = get_user_business_id());

CREATE POLICY "Users can delete own business quotes" ON quotes
    FOR DELETE USING (business_id = get_user_business_id());

-- RLS Policies for quote_items
CREATE POLICY "Users can view quote items" ON quote_items
    FOR SELECT USING (quote_id IN (
        SELECT id FROM quotes WHERE business_id = get_user_business_id()
    ));

CREATE POLICY "Users can create quote items" ON quote_items
    FOR INSERT WITH CHECK (quote_id IN (
        SELECT id FROM quotes WHERE business_id = get_user_business_id()
    ));

CREATE POLICY "Users can update quote items" ON quote_items
    FOR UPDATE USING (quote_id IN (
        SELECT id FROM quotes WHERE business_id = get_user_business_id()
    ));

CREATE POLICY "Users can delete quote items" ON quote_items
    FOR DELETE USING (quote_id IN (
        SELECT id FROM quotes WHERE business_id = get_user_business_id()
    ));

-- =====================================================
-- SECTION 8: USER ARCHIVE LOGIC
-- =====================================================

-- RLS Policy: Users can view archived members from their business
CREATE POLICY "Users can view archived members from their business"
ON user_details_archive
FOR SELECT
USING (business_id = get_user_business_id());

-- Function to archive and remove a user
CREATE OR REPLACE FUNCTION archive_and_remove_user(
    p_user_id UUID,
    p_removal_reason TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get archived users for a business
CREATE OR REPLACE FUNCTION get_archived_users(p_business_id INTEGER DEFAULT NULL)
RETURNS TABLE (
    id UUID,
    email VARCHAR(255),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    role_name VARCHAR(100),
    archived_at TIMESTAMPTZ,
    archived_by_email VARCHAR(255),
    removal_reason TEXT,
    assigned_locations JSONB,
    original_created_at TIMESTAMPTZ
) AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

