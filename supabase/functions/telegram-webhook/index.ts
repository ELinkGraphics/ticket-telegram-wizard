
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TelegramUpdate {
  update_id: number
  message?: {
    message_id: number
    from: {
      id: number
      first_name: string
      last_name?: string
      username?: string
    }
    chat: {
      id: number
      type: string
    }
    text?: string
    date: number
  }
}

interface TelegramUser {
  id: number
  first_name: string
  last_name?: string
  username?: string
}

// Command handlers
const handleStartCommand = (user: TelegramUser) => {
  return `🎫 Welcome to Event Tickets Bot, ${user.first_name}!

Available commands:
/events - View available events
/mytickets - View your tickets
/broadcast - Send message to all users (admin only)
/help - Show this help message

Get started by checking out available events with /events`
}

const handleHelpCommand = () => {
  return `🎫 Event Tickets Bot Help

Available commands:
/start - Welcome message
/events - View all available events
/mytickets - View your purchased tickets
/broadcast <message> - Send message to all users
/help - Show this help message

To purchase a ticket:
1. Use /events to see available events
2. Copy the /buy_[event_id] command for the event you want
3. Send that command to purchase your ticket`
}

const handleEventsCommand = async (supabaseClient: any) => {
  console.log('Fetching events from database...')
  const { data: events, error: eventsError } = await supabaseClient
    .from('events')
    .select('*')
    .gt('available_tickets', 0)
    .order('date', { ascending: true })

  if (eventsError) {
    console.error('❌ Events fetch error:', eventsError)
    return 'Error fetching events. Please try again.'
  }
  
  if (!events || events.length === 0) {
    console.log('No events found')
    return 'No events available at the moment.'
  }

  console.log('Found events:', events.length)
  let responseText = '🎫 Available Events:\n\n'
  events.forEach((event, index) => {
    const eventDate = new Date(event.date).toLocaleDateString()
    responseText += `${index + 1}. ${event.title}\n`
    responseText += `📅 ${eventDate}\n`
    responseText += `📍 ${event.location}\n`
    responseText += `💰 $${event.price}\n`
    responseText += `🎟️ ${event.available_tickets} tickets available\n`
    responseText += `\nTo buy: /buy_${event.id}\n\n`
  })
  
  return responseText
}

const handleMyTicketsCommand = async (supabaseClient: any, userId: number) => {
  console.log('Fetching user tickets...')
  const { data: userData } = await supabaseClient
    .from('telegram_users')
    .select('id')
    .eq('telegram_user_id', userId)
    .single()

  if (!userData) {
    return 'Please start a conversation with the bot first using /start'
  }

  const { data: tickets } = await supabaseClient
    .from('tickets')
    .select(`
      *,
      events (
        title,
        date,
        location
      )
    `)
    .eq('user_id', userData.id)
    .order('purchase_date', { ascending: false })

  if (!tickets || tickets.length === 0) {
    return `🎫 You don't have any tickets yet.

Use /events to browse available events and purchase tickets!`
  }

  let responseText = '🎫 Your Tickets:\n\n'
  tickets.forEach((ticket, index) => {
    const event = ticket.events as any
    responseText += `${index + 1}. ${event.title}\n`
    responseText += `🏷️ Code: ${ticket.ticket_code}\n`
    responseText += `📅 ${new Date(event.date).toLocaleDateString()}\n`
    responseText += `📍 ${event.location}\n`
    responseText += `📊 Status: ${ticket.status}\n\n`
  })

  return responseText
}

const handleBuyCommand = async (supabaseClient: any, eventId: string, userId: number) => {
  console.log('Processing ticket purchase for event:', eventId)
  
  const { data: event } = await supabaseClient
    .from('events')
    .select('*')
    .eq('id', eventId)
    .single()

  if (!event) {
    return 'Event not found.'
  }
  
  if (event.available_tickets <= 0) {
    return 'Sorry, this event is sold out.'
  }

  const ticketCode = Math.random().toString(36).substring(2, 15).toUpperCase()
  
  const { data: userData } = await supabaseClient
    .from('telegram_users')
    .select('id')
    .eq('telegram_user_id', userId)
    .single()

  if (!userData) {
    return 'Please start a conversation with the bot first using /start'
  }

  const { error } = await supabaseClient
    .from('tickets')
    .insert({
      user_id: userData.id,
      event_id: eventId,
      ticket_code: ticketCode,
      status: 'active'
    })

  if (error) {
    console.error('❌ Ticket creation error:', error)
    return 'Error purchasing ticket. Please try again.'
  }

  await supabaseClient
    .from('events')
    .update({ available_tickets: event.available_tickets - 1 })
    .eq('id', eventId)

  return `✅ Ticket purchased successfully!

🎫 Event: ${event.title}
🏷️ Ticket Code: ${ticketCode}
📅 Date: ${new Date(event.date).toLocaleDateString()}
📍 Location: ${event.location}
💰 Price: $${event.price}

Keep your ticket code safe! Use /mytickets to view all your tickets.`
}

const handleBroadcastCommand = async (supabaseClient: any, message: string, botToken: string) => {
  console.log('Processing broadcast command')
  
  if (!message.trim()) {
    return 'Usage: /broadcast <your message>'
  }

  // Get all unique chat IDs from telegram_users
  const { data: users } = await supabaseClient
    .from('telegram_users')
    .select('telegram_user_id')

  if (!users || users.length === 0) {
    return 'No users found for broadcasting.'
  }

  console.log(`Broadcasting to ${users.length} users`)
  let successCount = 0
  let failCount = 0

  for (const user of users) {
    try {
      const broadcastResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: user.telegram_user_id,
          text: `📢 BROADCAST MESSAGE:\n\n${message}`
        })
      })

      if (broadcastResponse.ok) {
        successCount++
      } else {
        failCount++
        console.log(`Failed to send to user ${user.telegram_user_id}`)
      }
    } catch (error) {
      failCount++
      console.error(`Error sending to user ${user.telegram_user_id}:`, error)
    }
  }

  return `📢 Broadcast completed!\n✅ Sent to: ${successCount} users\n❌ Failed: ${failCount} users`
}

const sendTelegramMessage = async (botToken: string, chatId: number, text: string) => {
  console.log('=== SENDING TELEGRAM RESPONSE ===')
  console.log('Sending to chat:', chatId)
  console.log('Message preview:', text.substring(0, 100) + '...')

  const telegramApiUrl = `https://api.telegram.org/bot${botToken}/sendMessage`

  const telegramPayload = {
    chat_id: chatId,
    text: text,
  }

  console.log('Making request to Telegram API...')
  const telegramResponse = await fetch(telegramApiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(telegramPayload),
  })

  const telegramResponseData = await telegramResponse.json()
  console.log('Telegram API response status:', telegramResponse.status)
  console.log('Telegram API response:', telegramResponseData)
  
  if (!telegramResponse.ok || !telegramResponseData.ok) {
    console.error('❌ Telegram API error:', telegramResponseData)
    throw new Error(`Telegram API error (${telegramResponse.status}): ${JSON.stringify(telegramResponseData)}`)
  }

  console.log('✅ Message sent successfully')
  return telegramResponseData
}

// New webhook management functions
const getBotInfo = async (botToken: string) => {
  const response = await fetch(`https://api.telegram.org/bot${botToken}/getMe`)
  return await response.json()
}

const getWebhookInfo = async (botToken: string) => {
  const response = await fetch(`https://api.telegram.org/bot${botToken}/getWebhookInfo`)
  return await response.json()
}

const setWebhook = async (botToken: string, webhookUrl: string) => {
  const response = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: webhookUrl,
      allowed_updates: ['message'],
      drop_pending_updates: true
    })
  })
  return await response.json()
}

serve(async (req) => {
  console.log('=== NEW WEBHOOK REQUEST ===')
  console.log('Timestamp:', new Date().toISOString())
  console.log('Method:', req.method)

  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight request')
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('=== ENVIRONMENT CHECK ===')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')
    
    console.log('SUPABASE_URL exists:', !!supabaseUrl)
    console.log('SUPABASE_SERVICE_ROLE_KEY exists:', !!supabaseKey)
    console.log('TELEGRAM_BOT_TOKEN exists:', !!botToken)
    
    if (!botToken) {
      console.error('❌ TELEGRAM_BOT_TOKEN not found in environment')
      return new Response(JSON.stringify({ 
        error: 'TELEGRAM_BOT_TOKEN not configured',
        timestamp: new Date().toISOString()
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    console.log('=== CREATING SUPABASE CLIENT ===')
    const supabaseClient = createClient(supabaseUrl ?? '', supabaseKey ?? '')

    console.log('=== PARSING REQUEST BODY ===')
    const requestText = await req.text()
    console.log('Raw request body length:', requestText.length)
    
    if (!requestText) {
      console.log('❌ Empty request body')
      return new Response('Empty request body', { status: 400, headers: corsHeaders })
    }

    let requestData: any
    try {
      requestData = JSON.parse(requestText)
      console.log('✅ Successfully parsed JSON request')
    } catch (parseError) {
      console.error('❌ JSON parsing error:', parseError)
      return new Response('Invalid JSON', { status: 400, headers: corsHeaders })
    }

    // Handle webhook management requests
    if (requestData.action) {
      console.log('=== WEBHOOK MANAGEMENT REQUEST ===')
      console.log('Action:', requestData.action)
      
      try {
        if (requestData.action === 'check_bot_info') {
          const botInfo = await getBotInfo(botToken)
          const webhookInfo = await getWebhookInfo(botToken)
          
          if (botInfo.ok) {
            return new Response(JSON.stringify({
              success: true,
              bot_info: botInfo.result,
              webhook_configured: !!webhookInfo.result?.url,
              webhook_info: webhookInfo.result
            }), {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
          } else {
            return new Response(JSON.stringify({
              success: false,
              error: botInfo.description || 'Failed to get bot info'
            }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
          }
        }
        
        if (requestData.action === 'set_webhook') {
          const result = await setWebhook(botToken, requestData.webhook_url)
          
          if (result.ok) {
            return new Response(JSON.stringify({
              success: true,
              message: 'Webhook configured successfully'
            }), {
              status: 200,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
          } else {
            return new Response(JSON.stringify({
              success: false,
              error: result.description || 'Failed to set webhook'
            }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            })
          }
        }
      } catch (error) {
        console.error('❌ Webhook management error:', error)
        return new Response(JSON.stringify({
          success: false,
          error: error.message || 'Unknown error'
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    }

    // Handle regular Telegram updates
    const update: TelegramUpdate = requestData
    
    if (!update.message) {
      console.log('ℹ️ No message in update, skipping')
      return new Response('No message', { status: 200, headers: corsHeaders })
    }

    if (!update.message.text) {
      console.log('ℹ️ No text in message, skipping')
      return new Response('No message text', { status: 200, headers: corsHeaders })
    }

    const { message } = update
    const chatId = message.chat.id
    const text = message.text
    const user = message.from

    console.log('=== MESSAGE DETAILS ===')
    console.log('Chat ID:', chatId)
    console.log('Chat type:', message.chat.type)
    console.log('Message text:', text)
    console.log('User:', user.first_name, user.username)

    // Store/update user information
    console.log('=== STORING USER INFORMATION ===')
    const { error: userError } = await supabaseClient
      .from('telegram_users')
      .upsert({
        telegram_user_id: user.id,
        username: user.username || null,
        first_name: user.first_name,
        last_name: user.last_name || null,
      }, {
        onConflict: 'telegram_user_id'
      })

    if (userError) {
      console.error('❌ User upsert error:', userError)
    } else {
      console.log('✅ User information stored successfully')
    }

    // Process commands dynamically
    console.log('=== PROCESSING COMMAND ===')
    let responseText = ''

    if (text.startsWith('/start')) {
      console.log('Processing /start command')
      responseText = handleStartCommand(user)
    } else if (text.startsWith('/events')) {
      console.log('Processing /events command')
      responseText = await handleEventsCommand(supabaseClient)
    } else if (text.startsWith('/buy_')) {
      console.log('Processing /buy command')
      const eventId = text.replace('/buy_', '')
      responseText = await handleBuyCommand(supabaseClient, eventId, user.id)
    } else if (text.startsWith('/mytickets')) {
      console.log('Processing /mytickets command')
      responseText = await handleMyTicketsCommand(supabaseClient, user.id)
    } else if (text.startsWith('/broadcast ')) {
      console.log('Processing /broadcast command')
      const broadcastMessage = text.replace('/broadcast ', '')
      responseText = await handleBroadcastCommand(supabaseClient, broadcastMessage, botToken)
    } else if (text.startsWith('/help')) {
      console.log('Processing /help command')
      responseText = handleHelpCommand()
    } else {
      console.log('Unknown command:', text)
      responseText = `❓ Unknown command: "${text}"\n\nUse /help to see available commands.`
    }

    // Send response to the current chat
    await sendTelegramMessage(botToken, chatId, responseText)

    return new Response('OK', { status: 200, headers: corsHeaders })

  } catch (error) {
    console.error('=== CRITICAL ERROR ===')
    console.error('Error:', error.message)
    console.error('Stack:', error.stack)
    
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error.message,
      timestamp: new Date().toISOString()
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
