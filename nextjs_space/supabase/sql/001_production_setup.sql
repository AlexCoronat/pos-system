-- =====================================================
-- POS SYSTEM - PRODUCTION DATABASE SETUP
-- Multi-tenant SaaS Architecture
-- Version: 1.0
-- Last Updated: 2025-11-20
-- =====================================================

-- This script sets up the complete database for production
-- Run in order: 001_production_setup.sql

-- =====================================================
-- SECTION 1: SUBSCRIPTION PLANS
-- =====================================================

CREATE TABLE IF NOT EXISTS subscription_plans (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    price_monthly NUMERIC(10, 2) DEFAULT 0,
    price_yearly NUMERIC(10, 2) DEFAULT 0,
    max_users INTEGER DEFAULT 1,
    max_locations INTEGER DEFAULT 1,
    max_products INTEGER DEFAULT 100,
    features JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE subscription_plans IS 'Planes de suscripción para el SaaS';

-- =====================================================
-- SECTION 2: BUSINESSES (TENANTS)
-- =====================================================

CREATE TABLE IF NOT EXISTS businesses (
    id SERIAL PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    legal_name VARCHAR(200),
    tax_id VARCHAR(50),
    business_type VARCHAR(100),
    owner_id UUID NOT NULL,
    plan_id INTEGER REFERENCES subscription_plans(id) DEFAULT 1,
    logo_url TEXT,
    email VARCHAR(100),
    phone VARCHAR(20),
    website VARCHAR(200),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(50) DEFAULT 'México',
    timezone VARCHAR(50) DEFAULT 'America/Mexico_City',
    currency VARCHAR(3) DEFAULT 'MXN',
    is_active BOOLEAN DEFAULT true,
    trial_ends_at TIMESTAMP WITH TIME ZONE,
    subscription_ends_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE businesses IS 'Negocios/empresas (tenants del sistema)';

-- =====================================================
-- SECTION 3: ROLES (UNIFIED TABLE)
-- =====================================================

CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    business_id INTEGER REFERENCES businesses(id) ON DELETE CASCADE,
    is_system BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    permissions JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Unique constraint for system roles
CREATE UNIQUE INDEX IF NOT EXISTS roles_system_name_unique
ON roles (name) WHERE business_id IS NULL;

COMMENT ON TABLE roles IS 'Roles del sistema y personalizados por negocio';
COMMENT ON COLUMN roles.is_system IS 'true = rol del sistema (no editable)';
COMMENT ON COLUMN roles.business_id IS 'NULL = rol del sistema, ID = rol personalizado';

-- =====================================================
-- SECTION 4: LOCATIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS locations (
    id SERIAL PRIMARY KEY,
    business_id INTEGER REFERENCES businesses(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(50) DEFAULT 'México',
    phone VARCHAR(20),
    email VARCHAR(100),
    manager_name VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    timezone VARCHAR(50) DEFAULT 'America/Mexico_City',
    opening_hours JSONB,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE UNIQUE INDEX IF NOT EXISTS locations_business_code_unique
ON locations (business_id, code) WHERE deleted_at IS NULL;

COMMENT ON TABLE locations IS 'Sucursales por negocio';

-- =====================================================
-- SECTION 5: USER DETAILS (PROFILE)
-- =====================================================

CREATE TABLE IF NOT EXISTS user_details (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    business_id INTEGER REFERENCES businesses(id) ON DELETE SET NULL,
    role_id INTEGER REFERENCES roles(id) ON DELETE SET NULL,
    default_location_id INTEGER REFERENCES locations(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMP WITH TIME ZONE,
    email_verified BOOLEAN DEFAULT false,
    avatar_url TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE user_details IS 'Perfiles de usuario vinculados a auth.users';

-- =====================================================
-- SECTION 6: USER LOCATIONS (ASSIGNMENTS)
-- =====================================================

CREATE TABLE IF NOT EXISTS user_locations (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES user_details(id) ON DELETE CASCADE,
    location_id INTEGER NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, location_id)
);

COMMENT ON TABLE user_locations IS 'Asignación de usuarios a ubicaciones';

-- =====================================================
-- SECTION 7: USER SESSIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES user_details(id) ON DELETE CASCADE,
    business_id INTEGER REFERENCES businesses(id) ON DELETE SET NULL,
    location_id INTEGER REFERENCES locations(id) ON DELETE SET NULL,
    ip_address INET,
    user_agent TEXT,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true
);

COMMENT ON TABLE user_sessions IS 'Sesiones de usuario para auditoría';

-- =====================================================
-- SECTION 8: CATEGORIES
-- =====================================================

CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    business_id INTEGER REFERENCES businesses(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    parent_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    icon VARCHAR(50),
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

COMMENT ON TABLE categories IS 'Categorías de productos por negocio';

-- =====================================================
-- SECTION 9: PRODUCTS
-- =====================================================

CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    business_id INTEGER REFERENCES businesses(id) ON DELETE CASCADE,
    sku VARCHAR(50) NOT NULL,
    barcode VARCHAR(50),
    name VARCHAR(200) NOT NULL,
    description TEXT,
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    unit_of_measure VARCHAR(20) DEFAULT 'pieza',
    cost_price NUMERIC(10, 2) DEFAULT 0,
    selling_price NUMERIC(10, 2) NOT NULL,
    tax_rate NUMERIC(5, 2) DEFAULT 16.00,
    is_taxable BOOLEAN DEFAULT true,
    is_active BOOLEAN DEFAULT true,
    has_variants BOOLEAN DEFAULT false,
    image_url TEXT,
    weight NUMERIC(10, 3),
    dimensions JSONB,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT positive_prices CHECK (selling_price >= 0 AND cost_price >= 0),
    CONSTRAINT valid_tax_rate CHECK (tax_rate >= 0 AND tax_rate <= 100)
);

CREATE UNIQUE INDEX IF NOT EXISTS products_business_sku_unique
ON products (business_id, sku) WHERE deleted_at IS NULL;

-- Unique constraint for barcode per business (allows same barcode in different businesses)
CREATE UNIQUE INDEX IF NOT EXISTS products_business_barcode_unique
ON products (business_id, barcode) WHERE deleted_at IS NULL AND barcode IS NOT NULL;

COMMENT ON TABLE products IS 'Productos por negocio';

-- =====================================================
-- SECTION 10: INVENTORY
-- =====================================================

CREATE TABLE IF NOT EXISTS inventory (
    id SERIAL PRIMARY KEY,
    business_id INTEGER REFERENCES businesses(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    location_id INTEGER NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
    quantity_available NUMERIC(10, 2) DEFAULT 0,
    min_stock_level NUMERIC(10, 2) DEFAULT 0,
    max_stock_level NUMERIC(10, 2),
    reorder_point NUMERIC(10, 2),
    last_restock_date TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(product_id, location_id),
    CONSTRAINT positive_quantities CHECK (quantity_available >= 0 AND min_stock_level >= 0)
);

COMMENT ON TABLE inventory IS 'Inventario por producto y ubicación';

-- =====================================================
-- SECTION 11: INVENTORY MOVEMENTS
-- =====================================================

CREATE TABLE IF NOT EXISTS inventory_movements (
    id BIGSERIAL PRIMARY KEY,
    business_id INTEGER REFERENCES businesses(id) ON DELETE CASCADE,
    inventory_id INTEGER NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
    movement_type VARCHAR(30) NOT NULL,
    quantity NUMERIC(10, 2) NOT NULL,
    quantity_before NUMERIC(10, 2),
    quantity_after NUMERIC(10, 2),
    reference_type VARCHAR(50),
    reference_id INTEGER,
    notes TEXT,
    performed_by UUID REFERENCES user_details(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE inventory_movements IS 'Historial de movimientos de inventario';

-- =====================================================
-- SECTION 12: CUSTOMERS
-- =====================================================

CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    business_id INTEGER REFERENCES businesses(id) ON DELETE CASCADE,
    customer_number VARCHAR(50),
    type VARCHAR(20) DEFAULT 'individual',
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    business_name VARCHAR(200),
    tax_id VARCHAR(50),
    email VARCHAR(100),
    phone VARCHAR(20),
    mobile VARCHAR(20),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(50) DEFAULT 'México',
    birth_date DATE,
    credit_limit NUMERIC(12, 2) DEFAULT 0,
    current_balance NUMERIC(12, 2) DEFAULT 0,
    loyalty_points INTEGER DEFAULT 0,
    preferred_location_id INTEGER REFERENCES locations(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE UNIQUE INDEX IF NOT EXISTS customers_business_number_unique
ON customers (business_id, customer_number) WHERE deleted_at IS NULL;

COMMENT ON TABLE customers IS 'Clientes por negocio';

-- =====================================================
-- SECTION 13: SALES
-- =====================================================

CREATE TABLE IF NOT EXISTS sales (
    id BIGSERIAL PRIMARY KEY,
    business_id INTEGER REFERENCES businesses(id) ON DELETE CASCADE,
    sale_number VARCHAR(50) NOT NULL,
    customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
    location_id INTEGER NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
    sale_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(30) DEFAULT 'completed',
    subtotal NUMERIC(12, 2) DEFAULT 0,
    tax_amount NUMERIC(12, 2) DEFAULT 0,
    discount_amount NUMERIC(12, 2) DEFAULT 0,
    total_amount NUMERIC(12, 2) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'MXN',
    notes TEXT,
    sold_by UUID NOT NULL REFERENCES user_details(id) ON DELETE RESTRICT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    CONSTRAINT positive_amounts CHECK (
        subtotal >= 0 AND
        tax_amount >= 0 AND
        discount_amount >= 0 AND
        total_amount >= 0
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS sales_business_number_unique
ON sales (business_id, sale_number) WHERE deleted_at IS NULL;

COMMENT ON TABLE sales IS 'Ventas por negocio';

-- =====================================================
-- SECTION 14: SALE ITEMS
-- =====================================================

CREATE TABLE IF NOT EXISTS sale_items (
    id BIGSERIAL PRIMARY KEY,
    sale_id BIGINT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity NUMERIC(10, 2) NOT NULL,
    unit_price NUMERIC(10, 2) NOT NULL,
    tax_rate NUMERIC(5, 2) DEFAULT 16.00,
    tax_amount NUMERIC(10, 2) DEFAULT 0,
    discount_amount NUMERIC(10, 2) DEFAULT 0,
    line_total NUMERIC(12, 2) NOT NULL,
    cost_price NUMERIC(10, 2),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT positive_values CHECK (
        quantity > 0 AND
        unit_price >= 0
    )
);

COMMENT ON TABLE sale_items IS 'Items de cada venta';

-- =====================================================
-- SECTION 15: PAYMENT METHODS
-- =====================================================

CREATE TABLE IF NOT EXISTS payment_methods (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    type VARCHAR(30) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    requires_reference BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

COMMENT ON TABLE payment_methods IS 'Métodos de pago disponibles';

-- =====================================================
-- SECTION 16: PAYMENT TRANSACTIONS
-- =====================================================

CREATE TABLE IF NOT EXISTS payment_transactions (
    id BIGSERIAL PRIMARY KEY,
    sale_id BIGINT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    payment_method_id INTEGER NOT NULL REFERENCES payment_methods(id) ON DELETE RESTRICT,
    amount NUMERIC(12, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'MXN',
    transaction_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(30) DEFAULT 'completed',
    reference_number VARCHAR(100),
    card_last_4 VARCHAR(4),
    card_brand VARCHAR(30),
    notes TEXT,
    processed_by UUID REFERENCES user_details(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT positive_amount CHECK (amount > 0)
);

COMMENT ON TABLE payment_transactions IS 'Transacciones de pago';

-- =====================================================
-- SECTION 17: SUPPLIERS
-- =====================================================

CREATE TABLE IF NOT EXISTS suppliers (
    id SERIAL PRIMARY KEY,
    business_id INTEGER REFERENCES businesses(id) ON DELETE CASCADE,
    code VARCHAR(50),
    name VARCHAR(200) NOT NULL,
    legal_name VARCHAR(200),
    tax_id VARCHAR(50),
    contact_person VARCHAR(100),
    email VARCHAR(100),
    phone VARCHAR(20),
    mobile VARCHAR(20),
    website VARCHAR(200),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(50) DEFAULT 'México',
    payment_terms VARCHAR(100),
    credit_limit NUMERIC(12, 2) DEFAULT 0,
    rating INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE UNIQUE INDEX IF NOT EXISTS suppliers_business_code_unique
ON suppliers (business_id, code) WHERE deleted_at IS NULL;

COMMENT ON TABLE suppliers IS 'Proveedores por negocio';

-- =====================================================
-- SECTION 18: PURCHASE ORDERS
-- =====================================================

CREATE TABLE IF NOT EXISTS purchase_orders (
    id SERIAL PRIMARY KEY,
    business_id INTEGER REFERENCES businesses(id) ON DELETE CASCADE,
    order_number VARCHAR(50) NOT NULL,
    supplier_id INTEGER REFERENCES suppliers(id) ON DELETE RESTRICT,
    location_id INTEGER REFERENCES locations(id) ON DELETE RESTRICT,
    order_date DATE DEFAULT CURRENT_DATE,
    expected_delivery_date DATE,
    actual_delivery_date DATE,
    status VARCHAR(30) DEFAULT 'draft',
    subtotal NUMERIC(12, 2) DEFAULT 0,
    tax_amount NUMERIC(12, 2) DEFAULT 0,
    shipping_cost NUMERIC(12, 2) DEFAULT 0,
    total_amount NUMERIC(12, 2) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'MXN',
    payment_status VARCHAR(30) DEFAULT 'pending',
    payment_terms VARCHAR(100),
    notes TEXT,
    created_by UUID REFERENCES user_details(id) ON DELETE SET NULL,
    approved_by UUID REFERENCES user_details(id) ON DELETE SET NULL,
    approved_at TIMESTAMP WITH TIME ZONE,
    received_by UUID REFERENCES user_details(id) ON DELETE SET NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE UNIQUE INDEX IF NOT EXISTS purchase_orders_business_number_unique
ON purchase_orders (business_id, order_number) WHERE deleted_at IS NULL;

COMMENT ON TABLE purchase_orders IS 'Órdenes de compra a proveedores';

-- =====================================================
-- SECTION 19: MATERIALIZED VIEWS
-- =====================================================

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_daily_sales_by_location AS
SELECT
  location_id,
  date(created_at) as sale_date,
  count(distinct id) as total_transactions,
  COALESCE(sum(total_amount), 0::numeric) as total_sales,
  COALESCE(sum(subtotal), 0::numeric) as total_subtotal,
  COALESCE(sum(tax_amount), 0::numeric) as total_tax,
  COALESCE(sum(discount_amount), 0::numeric) as total_discount
FROM
  sales s
WHERE
  status::text = 'completed'::text
  AND deleted_at IS NULL
GROUP BY
  location_id,
  date(created_at);

CREATE MATERIALIZED VIEW IF NOT EXISTS mv_top_selling_products AS
SELECT
  si.product_id,
  p.name as product_name,
  p.sku as product_sku,
  s.location_id,
  sum(si.quantity) as total_quantity_sold,
  COALESCE(sum(si.line_total), 0::numeric) as total_revenue,
  count(distinct s.id) as transaction_count,
  max(s.created_at) as last_sold_at
FROM
  sale_items si
  JOIN sales s ON s.id = si.sale_id
  JOIN products p ON p.id = si.product_id
WHERE
  s.status::text = 'completed'::text
  AND s.deleted_at IS NULL
  AND s.created_at >= (CURRENT_DATE - '30 days'::interval)
GROUP BY
  si.product_id,
  p.name,
  p.sku,
  s.location_id;

COMMENT ON MATERIALIZED VIEW mv_daily_sales_by_location IS 'Ventas diarias agrupadas por ubicación';
COMMENT ON MATERIALIZED VIEW mv_top_selling_products IS 'Productos más vendidos en los últimos 30 días';
