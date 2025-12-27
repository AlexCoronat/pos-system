-- Migration: Add Evolution API support to whatsapp_numbers
-- Run this in Supabase SQL Editor

-- Add Evolution API columns to whatsapp_numbers
ALTER TABLE whatsapp_numbers 
ADD COLUMN IF NOT EXISTS evolution_instance_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS evolution_api_url VARCHAR(255) DEFAULT 'http://evolution_api_pos:8080',
ADD COLUMN IF NOT EXISTS connection_type VARCHAR(20) DEFAULT 'twilio' CHECK (connection_type IN ('twilio', 'evolution'));

-- Add index for Evolution API lookup
CREATE INDEX IF NOT EXISTS idx_whatsapp_numbers_evolution_instance 
ON whatsapp_numbers(evolution_instance_name) 
WHERE evolution_instance_name IS NOT NULL;

-- Update RPC function to support Evolution API lookup
CREATE OR REPLACE FUNCTION get_business_by_whatsapp_number(p_whatsapp_number TEXT)
RETURNS TABLE (
    business_id INTEGER,
    business_name TEXT,
    subscription_plan_id INTEGER,
    plan_name TEXT,
    whatsapp_enabled BOOLEAN,
    monthly_quote_limit INTEGER,
    ai_provider TEXT,
    ai_model TEXT,
    ai_temperature NUMERIC,
    system_prompt TEXT,
    greeting_message TEXT,
    is_enabled BOOLEAN
) AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create new function to lookup by Evolution instance name
CREATE OR REPLACE FUNCTION get_business_by_evolution_instance(p_instance_name TEXT)
RETURNS TABLE (
    business_id INTEGER,
    business_name TEXT,
    subscription_plan_id INTEGER,
    plan_name TEXT,
    whatsapp_enabled BOOLEAN,
    monthly_quote_limit INTEGER,
    ai_provider TEXT,
    ai_model TEXT,
    ai_temperature NUMERIC,
    system_prompt TEXT,
    greeting_message TEXT,
    is_enabled BOOLEAN
) AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comment
COMMENT ON COLUMN whatsapp_numbers.evolution_instance_name IS 'Name of the Evolution API instance for this number';
COMMENT ON COLUMN whatsapp_numbers.connection_type IS 'Type of WhatsApp connection: twilio or evolution';
