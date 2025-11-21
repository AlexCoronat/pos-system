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
    FOR SELECT USING (user_id = auth.uid() OR user_id IN (
        SELECT id FROM user_details WHERE business_id = get_user_business_id()
    ));

CREATE POLICY "Users can manage location assignments" ON user_locations
    FOR ALL USING (user_id = auth.uid() OR user_id IN (
        SELECT id FROM user_details WHERE business_id = get_user_business_id()
    ));

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

-- =====================================================
-- SECTION 6: GRANTS
-- =====================================================

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
