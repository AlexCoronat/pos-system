-- =====================================================
-- POS SYSTEM - SEED DATA
-- Initial data for production
-- =====================================================

-- =====================================================
-- SECTION 1: SUBSCRIPTION PLANS
-- =====================================================

INSERT INTO subscription_plans (name, description, price_monthly, price_yearly, max_users, max_locations, max_products, features) VALUES
('Free', 'Plan gratuito para comenzar', 0, 0, 2, 1, 100, '{
    "basic_pos": true,
    "inventory": true,
    "customers": true,
    "reports_basic": true,
    "support_email": true
}'::jsonb),

('Starter', 'Plan para pequeños negocios', 299, 2990, 5, 2, 500, '{
    "basic_pos": true,
    "inventory": true,
    "customers": true,
    "reports_basic": true,
    "reports_advanced": true,
    "support_email": true,
    "support_chat": true,
    "multi_location": true
}'::jsonb),

('Professional', 'Plan para negocios en crecimiento', 599, 5990, 15, 5, 2000, '{
    "basic_pos": true,
    "inventory": true,
    "customers": true,
    "reports_basic": true,
    "reports_advanced": true,
    "support_email": true,
    "support_chat": true,
    "support_phone": true,
    "multi_location": true,
    "custom_roles": true,
    "api_access": true
}'::jsonb),

('Enterprise', 'Plan empresarial sin límites', 1299, 12990, -1, -1, -1, '{
    "basic_pos": true,
    "inventory": true,
    "customers": true,
    "reports_basic": true,
    "reports_advanced": true,
    "reports_custom": true,
    "support_email": true,
    "support_chat": true,
    "support_phone": true,
    "support_priority": true,
    "multi_location": true,
    "custom_roles": true,
    "api_access": true,
    "white_label": true,
    "dedicated_support": true
}'::jsonb);

-- =====================================================
-- SECTION 2: SYSTEM ROLES
-- =====================================================

INSERT INTO roles (name, description, is_system, is_active, permissions, business_id) VALUES
('Admin', 'Administrador con acceso completo', true, true, '{
    "dashboard": ["view"],
    "products": ["view", "create", "edit", "delete"],
    "inventory": ["view", "create", "edit", "delete"],
    "sales": ["view", "create", "edit", "delete", "cancel"],
    "customers": ["view", "create", "edit", "delete"],
    "reports": ["view", "export"],
    "settings": ["view", "edit"],
    "users": ["view", "create", "edit", "delete"]
}'::jsonb, NULL),

('Manager', 'Gerente con acceso a reportes y configuración', true, true, '{
    "dashboard": ["view"],
    "products": ["view", "create", "edit"],
    "inventory": ["view", "create", "edit"],
    "sales": ["view", "create", "edit", "cancel"],
    "customers": ["view", "create", "edit"],
    "reports": ["view", "export"],
    "settings": ["view"]
}'::jsonb, NULL),

('Cashier', 'Cajero con acceso a ventas', true, true, '{
    "dashboard": ["view"],
    "products": ["view"],
    "inventory": ["view"],
    "sales": ["view", "create"],
    "customers": ["view", "create"]
}'::jsonb, NULL),

('Inventory', 'Encargado de inventario', true, true, '{
    "dashboard": ["view"],
    "products": ["view", "create", "edit"],
    "inventory": ["view", "create", "edit", "delete"],
    "reports": ["view"]
}'::jsonb, NULL);

-- =====================================================
-- SECTION 3: PAYMENT METHODS
-- =====================================================

INSERT INTO payment_methods (code, name, type, requires_reference) VALUES
('CASH', 'Efectivo', 'cash', false),
('CARD_CREDIT', 'Tarjeta de Crédito', 'card', true),
('CARD_DEBIT', 'Tarjeta de Débito', 'card', true),
('TRANSFER', 'Transferencia Bancaria', 'transfer', true),
('MERCADOPAGO', 'Mercado Pago', 'mercadopago', false);

-- =====================================================
-- SECTION 4: INDEXES FOR PERFORMANCE
-- =====================================================

-- Products indexes
CREATE INDEX IF NOT EXISTS idx_products_business ON products(business_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active) WHERE is_active = true;

-- Inventory indexes
CREATE INDEX IF NOT EXISTS idx_inventory_business ON inventory(business_id);
CREATE INDEX IF NOT EXISTS idx_inventory_product ON inventory(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_location ON inventory(location_id);

-- Sales indexes
CREATE INDEX IF NOT EXISTS idx_sales_business ON sales(business_id);
CREATE INDEX IF NOT EXISTS idx_sales_customer ON sales(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_location ON sales(location_id);
CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(sale_date);
CREATE INDEX IF NOT EXISTS idx_sales_status ON sales(status);

-- Customers indexes
CREATE INDEX IF NOT EXISTS idx_customers_business ON customers(business_id);
CREATE INDEX IF NOT EXISTS idx_customers_number ON customers(customer_number);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);

-- User details indexes
CREATE INDEX IF NOT EXISTS idx_user_details_business ON user_details(business_id);
CREATE INDEX IF NOT EXISTS idx_user_details_email ON user_details(email);

-- Locations indexes
CREATE INDEX IF NOT EXISTS idx_locations_business ON locations(business_id);

-- Categories indexes
CREATE INDEX IF NOT EXISTS idx_categories_business ON categories(business_id);
CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);

-- =====================================================
-- SECTION 5: COMMENTS
-- =====================================================

COMMENT ON DATABASE postgres IS 'POS System - Multi-tenant SaaS Platform';
