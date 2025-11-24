-- =====================================================
-- USER ARCHIVE SYSTEM
-- For maintaining history of removed team members
-- =====================================================

-- Create archive table for removed users
CREATE TABLE IF NOT EXISTS user_details_archive (
    id UUID PRIMARY KEY,
    email VARCHAR(255),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    business_id INTEGER,
    role_id INTEGER,
    default_location_id INTEGER,
    is_active BOOLEAN DEFAULT false,
    last_login_at TIMESTAMPTZ,
    
    -- Archive metadata
    archived_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    archived_by UUID REFERENCES auth.users(id),
    removal_reason TEXT,
    
    -- Original timestamps
    original_created_at TIMESTAMPTZ,
    original_updated_at TIMESTAMPTZ,
    
    -- Store assigned locations as JSONB
    assigned_locations JSONB
);

-- Add indexes
CREATE INDEX idx_user_archive_business ON user_details_archive(business_id);
CREATE INDEX idx_user_archive_email ON user_details_archive(email);
CREATE INDEX idx_user_archive_archived_at ON user_details_archive(archived_at);

-- Enable RLS
ALTER TABLE user_details_archive ENABLE ROW LEVEL SECURITY;

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

COMMENT ON TABLE user_details_archive IS 'Archive of removed team members for record keeping';
COMMENT ON FUNCTION archive_and_remove_user IS 'Archives a user and removes them from active tables';
COMMENT ON FUNCTION get_archived_users IS 'Retrieves archived users for a business';
