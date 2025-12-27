// Follow this setup guide to integrate the Deno runtime into your project:
// https://supabase.com/docs/guides/functions/quickstart

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Anthropic from 'https://esm.sh/@anthropic-ai/sdk@0.30.1'

// ============================================================================
// Types
// ============================================================================

interface ConversationMessage {
    role: 'user' | 'assistant'
    content: string
    timestamp: string
}

interface ExtractedItem {
    productId?: number
    productName: string
    quantity: number
    unitPrice?: number
    matched: boolean
}

interface RequestBody {
    businessId: number
    customerPhone?: string
    customerEmail?: string
    customerName?: string
    message: string
    channel: 'whatsapp' | 'email' | 'web' | 'telegram'
    sessionId?: string
}

interface Product {
    id: number
    name: string
    sku: string
    selling_price: number
    description?: string
    category_name?: string
    available_stock?: number
}

// ============================================================================
// Environment & Clients
// ============================================================================

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')

// ============================================================================
// Tool Definitions for Claude
// ============================================================================

const tools: Anthropic.Tool[] = [
    {
        name: 'search_products',
        description: 'Buscar productos en el catálogo por nombre, SKU o descripción. Usar cuando el cliente menciona productos que quiere cotizar.',
        input_schema: {
            type: 'object',
            properties: {
                query: {
                    type: 'string',
                    description: 'Término de búsqueda para encontrar el producto'
                },
                businessId: {
                    type: 'number',
                    description: 'ID del negocio'
                }
            },
            required: ['query', 'businessId']
        }
    },
    {
        name: 'create_quote',
        description: 'Crear una cotización con los productos seleccionados. Usar cuando el cliente confirma los productos y cantidades.',
        input_schema: {
            type: 'object',
            properties: {
                businessId: {
                    type: 'number',
                    description: 'ID del negocio'
                },
                customerId: {
                    type: 'number',
                    description: 'ID del cliente (si existe)'
                },
                customerName: {
                    type: 'string',
                    description: 'Nombre del cliente'
                },
                customerPhone: {
                    type: 'string',
                    description: 'Teléfono del cliente'
                },
                items: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            productId: { type: 'number' },
                            productName: { type: 'string' },
                            quantity: { type: 'number' },
                            unitPrice: { type: 'number' }
                        },
                        required: ['productId', 'quantity', 'unitPrice']
                    },
                    description: 'Lista de productos con cantidades'
                },
                notes: {
                    type: 'string',
                    description: 'Notas adicionales de la cotización'
                }
            },
            required: ['businessId', 'items']
        }
    },
    {
        name: 'request_clarification',
        description: 'Solicitar más información al cliente cuando la solicitud es ambigua o falta información.',
        input_schema: {
            type: 'object',
            properties: {
                question: {
                    type: 'string',
                    description: 'Pregunta específica para el cliente'
                },
                context: {
                    type: 'string',
                    description: 'Contexto de por qué se necesita esta información'
                }
            },
            required: ['question']
        }
    }
]

// ============================================================================
// Tool Implementations
// ============================================================================

async function searchProducts(
    supabase: ReturnType<typeof createClient>,
    query: string,
    businessId: number
): Promise<Product[]> {
    const { data, error } = await supabase
        .from('products')
        .select(`
      id,
      name,
      sku,
      selling_price,
      description,
      categories!inner(name)
    `)
        .eq('business_id', businessId)
        .eq('is_active', true)
        .is('deleted_at', null)
        .or(`name.ilike.%${query}%,sku.ilike.%${query}%,description.ilike.%${query}%`)
        .limit(10)

    if (error) {
        console.error('Error searching products:', error)
        return []
    }

    return (data || []).map(p => ({
        id: p.id,
        name: p.name,
        sku: p.sku,
        selling_price: p.selling_price,
        description: p.description,
        category_name: p.categories?.name
    }))
}

async function createQuote(
    supabase: ReturnType<typeof createClient>,
    businessId: number,
    customerId: number | null,
    customerName: string | undefined,
    customerPhone: string | undefined,
    items: Array<{ productId: number; quantity: number; unitPrice: number; productName?: string }>,
    notes?: string
): Promise<{ quoteId: number; quoteNumber: string }> {
    // Generate quote number
    const year = new Date().getFullYear()
    const { count } = await supabase
        .from('quotes')
        .select('*', { count: 'exact', head: true })
        .eq('business_id', businessId)
        .gte('created_at', `${year}-01-01`)

    const sequence = (count || 0) + 1
    const quoteNumber = `QT-${year}-${sequence.toString().padStart(5, '0')}`

    // Calculate totals
    let subtotal = 0
    let taxAmount = 0
    const taxRate = 16 // Default tax rate

    const calculatedItems = items.map(item => {
        const itemSubtotal = item.quantity * item.unitPrice
        const itemTax = itemSubtotal * (taxRate / 100)
        subtotal += itemSubtotal
        taxAmount += itemTax
        return {
            product_id: item.productId,
            quantity: item.quantity,
            unit_price: item.unitPrice,
            subtotal: itemSubtotal,
            tax_rate: taxRate,
            tax_amount: itemTax,
            discount_amount: 0
        }
    })

    const totalAmount = subtotal + taxAmount

    // Set expiry date (7 days from now)
    const expiryDate = new Date()
    expiryDate.setDate(expiryDate.getDate() + 7)

    // Create quote
    const { data: quote, error: quoteError } = await supabase
        .from('quotes')
        .insert({
            business_id: businessId,
            quote_number: quoteNumber,
            customer_id: customerId,
            quote_date: new Date().toISOString().split('T')[0],
            expiry_date: expiryDate.toISOString().split('T')[0],
            status: 'sent',
            subtotal,
            discount_amount: 0,
            tax_amount: taxAmount,
            total_amount: totalAmount,
            notes: notes || `Cotización generada automáticamente para ${customerName || customerPhone || 'cliente'}`,
            metadata: {
                generated_by: 'ai_assistant',
                customer_phone: customerPhone,
                customer_name: customerName
            }
        })
        .select()
        .single()

    if (quoteError) throw quoteError

    // Create quote items
    if (calculatedItems.length > 0) {
        const { error: itemsError } = await supabase
            .from('quote_items')
            .insert(
                calculatedItems.map(item => ({
                    quote_id: quote.id,
                    ...item
                }))
            )

        if (itemsError) throw itemsError
    }

    return { quoteId: quote.id, quoteNumber }
}

// ============================================================================
// Process Tool Calls
// ============================================================================

async function processToolCall(
    supabase: ReturnType<typeof createClient>,
    toolName: string,
    toolInput: Record<string, any>,
    context: { businessId: number; customerId?: number; customerPhone?: string; customerName?: string }
): Promise<string> {
    switch (toolName) {
        case 'search_products': {
            const products = await searchProducts(supabase, toolInput.query, context.businessId)
            if (products.length === 0) {
                return JSON.stringify({
                    success: false,
                    message: `No se encontraron productos para "${toolInput.query}"`
                })
            }
            return JSON.stringify({
                success: true,
                products: products.map(p => ({
                    id: p.id,
                    name: p.name,
                    sku: p.sku,
                    price: p.selling_price,
                    category: p.category_name
                }))
            })
        }

        case 'create_quote': {
            try {
                const result = await createQuote(
                    supabase,
                    context.businessId,
                    context.customerId || null,
                    context.customerName,
                    context.customerPhone,
                    toolInput.items,
                    toolInput.notes
                )
                return JSON.stringify({
                    success: true,
                    quoteId: result.quoteId,
                    quoteNumber: result.quoteNumber,
                    message: `Cotización ${result.quoteNumber} creada exitosamente`
                })
            } catch (error: any) {
                return JSON.stringify({
                    success: false,
                    message: `Error al crear cotización: ${error.message}`
                })
            }
        }

        case 'request_clarification': {
            return JSON.stringify({
                success: true,
                question: toolInput.question,
                context: toolInput.context
            })
        }

        default:
            return JSON.stringify({ success: false, message: `Herramienta desconocida: ${toolName}` })
    }
}

// ============================================================================
// Main Handler
// ============================================================================

serve(async (req) => {
    // Handle CORS
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
        // Parse request
        const body: RequestBody = await req.json()
        const { businessId, customerPhone, customerEmail, customerName, message, channel, sessionId } = body

        if (!businessId || !message) {
            return new Response(
                JSON.stringify({ error: 'businessId and message are required' }),
                { status: 400, headers: { 'Content-Type': 'application/json' } }
            )
        }

        // Initialize Supabase client with service role
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

        // Check if Anthropic key is configured
        if (!ANTHROPIC_API_KEY) {
            return new Response(
                JSON.stringify({ error: 'AI provider not configured' }),
                { status: 500, headers: { 'Content-Type': 'application/json' } }
            )
        }

        // Get or create session
        let session: any
        let conversationHistory: ConversationMessage[] = []

        if (sessionId) {
            const { data: existingSession } = await supabase
                .from('quote_conversation_sessions')
                .select('*')
                .eq('id', sessionId)
                .single()

            if (existingSession) {
                session = existingSession
                conversationHistory = existingSession.messages || []
            }
        }

        if (!session) {
            console.log('[AI-ASSISTANT] Creating new session for business:', businessId)

            // Look for existing customer
            let customerId: number | null = null
            if (customerPhone) {
                console.log('[AI-ASSISTANT] Looking up customer by phone:', customerPhone)
                try {
                    const { data: customer, error: custError } = await supabase
                        .rpc('find_customer_by_phone', {
                            p_business_id: businessId,
                            p_phone: customerPhone
                        })
                    if (custError) {
                        console.error('[AI-ASSISTANT] Error finding customer:', custError)
                    }
                    if (customer && customer.length > 0) {
                        customerId = customer[0].id
                        console.log('[AI-ASSISTANT] Found customer:', customerId)
                    }
                } catch (e) {
                    console.error('[AI-ASSISTANT] Exception finding customer:', e)
                }
            }

            // Check daily limit
            console.log('[AI-ASSISTANT] Checking quote limit...')
            try {
                const { data: limitCheck, error: limitError } = await supabase
                    .rpc('check_quote_automation_limit', {
                        p_business_id: businessId,
                        p_customer_phone: customerPhone || null,
                        p_customer_email: customerEmail || null
                    })

                if (limitError) {
                    console.error('[AI-ASSISTANT] Limit check error:', limitError)
                    // Continue anyway - don't block on limit check error
                } else if (limitCheck && !limitCheck.allowed) {
                    return new Response(
                        JSON.stringify({
                            sessionId: null,
                            response: `Has alcanzado el límite de ${limitCheck.daily_limit} cotizaciones por día. Por favor intenta mañana o contacta directamente con nosotros.`,
                            completed: true,
                            extractedItems: []
                        }),
                        { headers: { 'Content-Type': 'application/json' } }
                    )
                }
            } catch (e) {
                console.error('[AI-ASSISTANT] Exception checking limit:', e)
                // Continue anyway
            }

            // Create new session
            const { data: newSession, error: sessionError } = await supabase
                .from('quote_conversation_sessions')
                .insert({
                    business_id: businessId,
                    customer_id: customerId,
                    customer_phone: customerPhone,
                    customer_email: customerEmail,
                    customer_name: customerName,
                    channel,
                    messages: [],
                    extracted_items: [],
                    status: 'active'
                })
                .select()
                .single()

            if (sessionError) throw sessionError
            session = newSession
        }

        // Add user message to history
        conversationHistory.push({
            role: 'user',
            content: message,
            timestamp: new Date().toISOString()
        })

        // Get business settings for AI config
        const { data: settings } = await supabase
            .from('quote_automation_settings')
            .select('*')
            .eq('business_id', businessId)
            .single()

        const systemPrompt = settings?.system_prompt || `Eres un asistente de cotizaciones amable y profesional. Tu trabajo es:

1. Entender qué productos necesita el cliente
2. Buscar los productos en el catálogo usando la herramienta search_products
3. Confirmar productos y cantidades con el cliente
4. Crear la cotización cuando el cliente confirme

REGLAS IMPORTANTES:
- Siempre sé amable y profesional
- Si el cliente menciona productos, SIEMPRE usa search_products para buscarlos
- Presenta los productos encontrados con sus precios
- Pide confirmación antes de crear la cotización
- Si hay ambigüedad, usa request_clarification para pedir más detalles
- Cuando el cliente confirme, usa create_quote para generar la cotización
- Los precios están en pesos mexicanos (MXN)
- Después de crear la cotización, confirma al cliente y pregunta si necesita algo más`

        // Initialize Anthropic client
        const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY })

        // Build messages for Claude
        const claudeMessages = conversationHistory.map(m => ({
            role: m.role as 'user' | 'assistant',
            content: m.content
        }))

        // Call Claude with tools
        let response = await anthropic.messages.create({
            model: 'claude-3-5-sonnet-latest', // Use latest alias
            max_tokens: 1024,
            system: systemPrompt,
            tools,
            messages: claudeMessages
        })

        // Handle tool use
        let finalResponse = ''
        let quoteId: number | undefined
        let quoteNumber: string | undefined
        let extractedItems: ExtractedItem[] = session.extracted_items || []

        while (response.stop_reason === 'tool_use') {
            const toolUseBlock = response.content.find(
                (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
            )

            if (!toolUseBlock) break

            // Process the tool call
            const toolResult = await processToolCall(
                supabase,
                toolUseBlock.name,
                toolUseBlock.input as Record<string, any>,
                {
                    businessId,
                    customerId: session.customer_id,
                    customerPhone,
                    customerName
                }
            )

            const parsedResult = JSON.parse(toolResult)

            // Track extracted items from search
            if (toolUseBlock.name === 'search_products' && parsedResult.success && parsedResult.products) {
                // Update extracted items tracking
                for (const product of parsedResult.products) {
                    if (!extractedItems.find(i => i.productId === product.id)) {
                        extractedItems.push({
                            productId: product.id,
                            productName: product.name,
                            quantity: 0,
                            unitPrice: product.price,
                            matched: true
                        })
                    }
                }
            }

            // Track quote creation
            if (toolUseBlock.name === 'create_quote' && parsedResult.success) {
                quoteId = parsedResult.quoteId
                quoteNumber = parsedResult.quoteNumber
            }

            // Continue the conversation with tool result
            claudeMessages.push({
                role: 'assistant',
                content: response.content
            })
            claudeMessages.push({
                role: 'user',
                content: [
                    {
                        type: 'tool_result',
                        tool_use_id: toolUseBlock.id,
                        content: toolResult
                    }
                ]
            } as any)

            response = await anthropic.messages.create({
                model: 'claude-3-5-sonnet-latest', // Use latest alias
                max_tokens: 1024,
                system: systemPrompt,
                tools,
                messages: claudeMessages
            })
        }

        // Extract final text response
        const textBlock = response.content.find(
            (block): block is Anthropic.TextBlock => block.type === 'text'
        )
        finalResponse = textBlock?.text || 'Lo siento, no pude procesar tu solicitud.'

        // Add assistant response to history
        conversationHistory.push({
            role: 'assistant',
            content: finalResponse,
            timestamp: new Date().toISOString()
        })

        // Update session
        const sessionUpdate: any = {
            messages: conversationHistory,
            extracted_items: extractedItems,
            updated_at: new Date().toISOString()
        }

        if (quoteId) {
            sessionUpdate.quote_id = quoteId
            sessionUpdate.status = 'completed'
        }

        await supabase
            .from('quote_conversation_sessions')
            .update(sessionUpdate)
            .eq('id', session.id)

        // Return response
        return new Response(
            JSON.stringify({
                sessionId: session.id,
                response: finalResponse,
                quoteId,
                quoteNumber,
                completed: !!quoteId,
                extractedItems
            }),
            { headers: { 'Content-Type': 'application/json' } }
        )

    } catch (error: any) {
        console.error('Error in quote-ai-assistant:', error)
        return new Response(
            JSON.stringify({ error: error.message || 'Internal server error' }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
        )
    }
})
