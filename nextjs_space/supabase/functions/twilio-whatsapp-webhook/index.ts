// Twilio WhatsApp Webhook Handler - Centralized Model
// One Twilio account for the platform, multiple numbers assigned to businesses
// https://supabase.com/docs/guides/functions/quickstart

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ============================================================================
// Types
// ============================================================================

interface TwilioWebhookBody {
    MessageSid: string
    AccountSid: string
    From: string      // WhatsApp number of sender (e.g., whatsapp:+521234567890)
    To: string        // Platform's Twilio WhatsApp number (e.g., whatsapp:+14155238886)
    Body: string      // Message content
    NumMedia: string
    ProfileName?: string
}

interface BusinessConfig {
    business_id: number
    business_name: string
    subscription_plan_id: number
    plan_name: string
    whatsapp_enabled: boolean
    monthly_quote_limit: number
    ai_provider: string
    ai_model: string
    ai_temperature: number
    system_prompt: string | null
    greeting_message: string
    is_enabled: boolean
}

// ============================================================================
// Environment & Clients
// Platform-wide Twilio credentials (your credentials)
// ============================================================================

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const QUOTE_AI_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/quote-ai-assistant`

// Centralized Twilio credentials (Platform owner's)
const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID')!
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN')!

// ============================================================================
// Helper Functions
// ============================================================================

function parseWhatsAppNumber(twilioNumber: string): string {
    return twilioNumber.replace('whatsapp:', '')
}

async function sendWhatsAppReply(
    to: string,
    from: string,
    message: string
): Promise<boolean> {
    try {
        const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`

        const formData = new URLSearchParams()
        formData.append('To', to)
        formData.append('From', from)
        formData.append('Body', message)

        const response = await fetch(twilioUrl, {
            method: 'POST',
            headers: {
                'Authorization': 'Basic ' + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`),
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: formData.toString()
        })

        if (!response.ok) {
            const error = await response.text()
            console.error('Twilio API error:', error)
            return false
        }

        return true
    } catch (error) {
        console.error('Error sending WhatsApp message:', error)
        return false
    }
}

// ============================================================================
// Main Handler
// ============================================================================

serve(async (req: Request) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
            }
        })
    }

    try {
        // Parse Twilio webhook (form-urlencoded)
        const formData = await req.formData()
        const body: TwilioWebhookBody = {
            MessageSid: formData.get('MessageSid') as string,
            AccountSid: formData.get('AccountSid') as string,
            From: formData.get('From') as string,
            To: formData.get('To') as string,
            Body: formData.get('Body') as string,
            NumMedia: formData.get('NumMedia') as string,
            ProfileName: formData.get('ProfileName') as string || undefined
        }

        console.log('Received WhatsApp message:', {
            from: body.From,
            to: body.To,
            body: body.Body?.substring(0, 50)
        })

        // Validate required fields
        if (!body.From || !body.To || !body.Body) {
            return new Response(
                '<Response><Message>Invalid request</Message></Response>',
                { status: 400, headers: { 'Content-Type': 'application/xml' } }
            )
        }

        // Initialize Supabase client
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

        // Parse phone numbers
        const customerPhone = parseWhatsAppNumber(body.From)
        const businessWhatsAppNumber = parseWhatsAppNumber(body.To)

        // Find which business owns this WhatsApp number
        const { data: businessConfig, error: businessError } = await supabase
            .rpc('get_business_by_whatsapp_number', {
                p_whatsapp_number: businessWhatsAppNumber
            })
            .single()

        if (businessError || !businessConfig) {
            console.error('Business not found for number:', businessWhatsAppNumber)
            return new Response(
                '<Response></Response>',
                { headers: { 'Content-Type': 'application/xml' } }
            )
        }

        const config = businessConfig as BusinessConfig

        // Check if automation is enabled
        if (!config.is_enabled) {
            console.log('Automation disabled for business:', config.business_id)
            return new Response(
                '<Response></Response>',
                { headers: { 'Content-Type': 'application/xml' } }
            )
        }

        // Check monthly quote limit
        const { data: limitCheck } = await supabase
            .rpc('check_monthly_quote_limit', {
                p_business_id: config.business_id
            })

        if (limitCheck && !limitCheck.allowed) {
            // Send limit reached message
            await sendWhatsAppReply(
                body.From,
                body.To,
                limitCheck.message || 'Lo siento, este negocio ha alcanzado su límite mensual de cotizaciones.'
            )
            return new Response(
                '<Response></Response>',
                { headers: { 'Content-Type': 'application/xml' } }
            )
        }

        // Call the quote-ai-assistant function
        const aiResponse = await fetch(QUOTE_AI_FUNCTION_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                businessId: config.business_id,
                customerPhone: customerPhone,
                customerName: body.ProfileName,
                message: body.Body,
                channel: 'whatsapp',
                channelSessionId: body.MessageSid
            })
        })

        if (!aiResponse.ok) {
            const errorText = await aiResponse.text()
            console.error('AI assistant error:', errorText)

            await sendWhatsAppReply(
                body.From,
                body.To,
                'Lo siento, hubo un error procesando tu solicitud. Por favor intenta de nuevo.'
            )

            return new Response(
                '<Response></Response>',
                { headers: { 'Content-Type': 'application/xml' } }
            )
        }

        const aiResult = await aiResponse.json()

        // If quote was created, increment usage counter
        if (aiResult.quoteId) {
            await supabase.rpc('increment_quote_usage', {
                p_business_id: config.business_id
            })
        }

        // Send the AI response back via Twilio
        const sent = await sendWhatsAppReply(
            body.From,
            body.To,
            aiResult.response
        )

        if (!sent) {
            console.error('Failed to send WhatsApp reply')
        }

        return new Response(
            '<Response></Response>',
            { headers: { 'Content-Type': 'application/xml' } }
        )

    } catch (error) {
        console.error('Webhook error:', error)
        return new Response(
            '<Response></Response>',
            { headers: { 'Content-Type': 'application/xml' } }
        )
    }
})
