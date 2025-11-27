-- Migration: Move address from businesses to locations table
-- This migration adds main_location field to locations and removes address fields from businesses

-- Step 1: Add main_location field to locations table
ALTER TABLE public.locations 
ADD COLUMN IF NOT EXISTS main_location INTEGER DEFAULT NULL;

-- Add comment to explain the field
COMMENT ON COLUMN public.locations.main_location IS 'Marks the main/primary location of the business. 1 = main location, NULL = secondary location. Only one location per business should have value 1.';

-- Step 2: Create a unique constraint to ensure only one main location per business
-- This prevents having multiple main locations for the same business
CREATE UNIQUE INDEX IF NOT EXISTS idx_locations_main_per_business 
ON public.locations (business_id, main_location) 
WHERE main_location = 1;

-- Step 3: Migrate existing address data from businesses to locations (if any exists)
-- This creates a main location for businesses that have address information but no locations yet
INSERT INTO public.locations (
    business_id,
    code,
    name,
    address,
    city,
    state,
    postal_code,
    country,
    phone,
    email,
    is_active,
    main_location,
    created_at,
    updated_at
)
SELECT 
    b.id as business_id,
    'MAIN' as code,
    b.name || ' - Oficina Principal' as name,
    b.address,
    b.city,
    b.state,
    b.postal_code,
    b.country,
    b.phone,
    b.email,
    true as is_active,
    1 as main_location,
    NOW() as created_at,
    NOW() as updated_at
FROM public.businesses b
WHERE (b.address IS NOT NULL OR b.city IS NOT NULL OR b.state IS NOT NULL)
  AND NOT EXISTS (
      SELECT 1 FROM public.locations l 
      WHERE l.business_id = b.id
  )
ON CONFLICT DO NOTHING;

-- Step 4: Drop address-related columns from businesses table
-- First backup the data in a comment or separate backup table if needed
ALTER TABLE public.businesses 
DROP COLUMN IF EXISTS address,
DROP COLUMN IF EXISTS city,
DROP COLUMN IF EXISTS state,
DROP COLUMN IF EXISTS postal_code;

-- Note: We keep country, phone, and email in businesses as they can be business-level info
-- separate from location-specific contact information

-- Step 5: Create a function to ensure only one main location per business
-- This function will be used as a trigger to automatically switch main_location
CREATE OR REPLACE FUNCTION public.ensure_single_main_location()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Step 6: Create trigger to enforce single main location
DROP TRIGGER IF EXISTS trigger_ensure_single_main_location ON public.locations;
CREATE TRIGGER trigger_ensure_single_main_location
    BEFORE INSERT OR UPDATE ON public.locations
    FOR EACH ROW
    WHEN (NEW.main_location = 1)
    EXECUTE FUNCTION public.ensure_single_main_location();

-- Step 7: Create a helper function to get main location for a business
CREATE OR REPLACE FUNCTION public.get_main_location(p_business_id INTEGER)
RETURNS TABLE (
    id INTEGER,
    code VARCHAR(20),
    name VARCHAR(100),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    postal_code VARCHAR(20),
    country VARCHAR(50),
    phone VARCHAR(20),
    email VARCHAR(100)
) AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_main_location(INTEGER) IS 'Returns the main/primary location for a business';

-- Migration complete!
-- Summary:
-- 1. Added main_location field to locations
-- 2. Created unique constraint for one main location per business
-- 3. Migrated existing address data from businesses to locations
-- 4. Removed address fields from businesses table
-- 5. Created trigger to ensure only one main location
-- 6. Created helper function to get main location
