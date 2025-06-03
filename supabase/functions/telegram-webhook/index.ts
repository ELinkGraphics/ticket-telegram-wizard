
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

serve(async (req) => {
  console.log('=== NEW WEBHOOK REQUEST ===')
  console.log('Timestamp:', new Date().toISOString())
  console.log('Method:', req.method)
  console.log('URL:', req.url)
  console.log('Headers:', Object.fromEntries(req.headers.entries()))

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
    console.log('BOT_TOKEN length:', botToken ? botToken.length : 0)
    console.log('BOT_TOKEN starts with:', botToken ? botToken.substring(0, 10) + '...' : 'null')
    
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
    console.log('Supabase client created successfully')

    console.log('=== PARSING REQUEST BODY ===')
    const requestText = await req.text()
    console.log('Raw request body:', requestText)
    
    if (!requestText) {
      console.log('❌ Empty request body')
      return new Response('Empty request body', { status: 400, headers: corsHeaders })
    }

    let update: TelegramUpdate
    try {
      update = JSON.parse(requestText)
      console.log('✅ Successfully parsed JSON:', JSON.stringify(update, null, 2))
    } catch (parseError) {
      console.error('❌ JSON parsing error:', parseError)
      return new Response('Invalid JSON', { status: 400, headers: corsHeaders })
    }
    
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
    console.log('Chat ID type:', typeof chatId)
    console.log('Message text:', text)
    console.log('User ID:', user.id)
    console.log('Username:', user.username)
    console.log('First name:', user.first_name)
    console.log('Chat type:', message.chat.type)

    console.log('=== DATABASE OPERATIONS ===')
    console.log('Attempting to upsert user...')
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
      console.log('✅ User upserted successfully')
    }

    let responseText = ''

    console.log('=== PROCESSING COMMAND ===')
    if (text.startsWith('/start')) {
      console.log('Processing /start command')
      responseText = `🎫 Welcome to Event Tickets Bot!

Available commands:
/events - View available events
/mytickets - View your tickets
/help - Show this help message

Get started by checking out available events with /events`
    } else if (text.startsWith('/events')) {
      console.log('Processing /events command')
      const { data: events, error: eventsError } = await supabaseClient
        .from('events')
        .select('*')
        .gt('available_tickets', 0)
        .order('date', { ascending: true })

      if (eventsError) {
        console.error('❌ Events fetch error:', eventsError)
        responseText = 'Error fetching events. Please try again.'
      } else if (!events || events.length === 0) {
        console.log('No events found')
        responseText = 'No events available at the moment.'
      } else {
        console.log('Found events:', events.length)
        responseText = '🎫 Available Events:\n\n'
        events.forEach((event, index) => {
          const eventDate = new Date(event.date).toLocaleDateString()
          responseText += `${index + 1}. ${event.title}\n`
          responseText += `📅 ${eventDate}\n`
          responseText += `📍 ${event.location}\n`
          responseText += `💰 $${event.price}\n`
          responseText += `🎟️ ${event.available_tickets} tickets available\n`
          responseText += `\nTo buy: /buy_${event.id}\n\n`
        })
      }
    } else if (text.startsWith('/buy_')) {
      console.log('Processing /buy command')
      const eventId = text.replace('/buy_', '')
      console.log('Event ID:', eventId)
      
      const { data: event } = await supabaseClient
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single()

      if (!event) {
        console.log('Event not found for ID:', eventId)
        responseText = 'Event not found.'
      } else if (event.available_tickets <= 0) {
        console.log('Event sold out:', event.title)
        responseText = 'Sorry, this event is sold out.'
      } else {
        console.log('Processing ticket purchase for event:', event.title)
        const ticketCode = Math.random().toString(36).substring(2, 15).toUpperCase()
        
        const { data: userData } = await supabaseClient
          .from('telegram_users')
          .select('id')
          .eq('telegram_user_id', user.id)
          .single()

        const { error } = await supabaseClient
          .from('tickets')
          .insert({
            user_id: userData?.id,
            event_id: eventId,
            ticket_code: ticketCode,
            status: 'active'
          })

        if (error) {
          console.error('❌ Ticket creation error:', error)
          responseText = 'Error purchasing ticket. Please try again.'
        } else {
          await supabaseClient
            .from('events')
            .update({ available_tickets: event.available_tickets - 1 })
            .eq('id', eventId)

          console.log('✅ Ticket created successfully:', ticketCode)
          responseText = `✅ Ticket purchased successfully!

🎫 Event: ${event.title}
🏷️ Ticket Code: ${ticketCode}
📅 Date: ${new Date(event.date).toLocaleDateString()}
📍 Location: ${event.location}
💰 Price: $${event.price}

Keep your ticket code safe! Use /mytickets to view all your tickets.`
        }
      }
    } else if (text.startsWith('/mytickets')) {
      console.log('Processing /mytickets command')
      const { data: userData } = await supabaseClient
        .from('telegram_users')
        .select('id')
        .eq('telegram_user_id', user.id)
        .single()

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
        .eq('user_id', userData?.id)
        .order('purchase_date', { ascending: false })

      if (!tickets || tickets.length === 0) {
        console.log('No tickets found for user')
        responseText = `🎫 You don't have any tickets yet.

Use /events to browse available events and purchase tickets!`
      } else {
        console.log('Found tickets for user:', tickets.length)
        responseText = '🎫 Your Tickets:\n\n'
        tickets.forEach((ticket, index) => {
          const event = ticket.events as any
          responseText += `${index + 1}. ${event.title}\n`
          responseText += `🏷️ Code: ${ticket.ticket_code}\n`
          responseText += `📅 ${new Date(event.date).toLocaleDateString()}\n`
          responseText += `📍 ${event.location}\n`
          responseText += `📊 Status: ${ticket.status}\n\n`
        })
      }
    } else if (text.startsWith('/help')) {
      console.log('Processing /help command')
      responseText = `🎫 Event Tickets Bot Help

Available commands:
/start - Welcome message
/events - View all available events
/mytickets - View your purchased tickets
/help - Show this help message

To purchase a ticket:
1. Use /events to see available events
2. Copy the /buy_[event_id] command for the event you want
3. Send that command to purchase your ticket

Need support? Contact the event organizers.`
    } else {
      console.log('Unknown command received:', text)
      responseText = `❓ Unknown command. Use /help to see available commands.`
    }

    console.log('=== SENDING TELEGRAM RESPONSE ===')
    console.log('Response text length:', responseText.length)
    console.log('Response preview:', responseText.substring(0, 100) + '...')

    // First, let's test if the bot token is valid by calling getMe
    console.log('=== TESTING BOT TOKEN ===')
    const getMeUrl = `https://api.telegram.org/bot${botToken}/getMe`
    console.log('Testing bot with getMe API call...')
    
    const getMeResponse = await fetch(getMeUrl)
    const getMeData = await getMeResponse.json()
    console.log('GetMe response:', getMeData)
    
    if (!getMeResponse.ok || !getMeData.ok) {
      console.error('❌ Bot token is invalid or bot not found')
      throw new Error(`Invalid bot token: ${JSON.stringify(getMeData)}`)
    }
    
    console.log('✅ Bot token is valid. Bot info:', getMeData.result)

    const telegramApiUrl = `https://api.telegram.org/bot${botToken}/sendMessage`
    console.log('Telegram API URL constructed')

    const telegramPayload = {
      chat_id: chatId,
      text: responseText,
    }
    console.log('Telegram payload chat_id:', telegramPayload.chat_id)
    console.log('Telegram payload text preview:', telegramPayload.text.substring(0, 50) + '...')

    const telegramResponse = await fetch(telegramApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(telegramPayload),
    })

    console.log('Telegram API response status:', telegramResponse.status)
    console.log('Telegram API response headers:', Object.fromEntries(telegramResponse.headers.entries()))
    
    const telegramResponseData = await telegramResponse.json()
    console.log('Telegram API full response:', telegramResponseData)
    
    if (!telegramResponse.ok || !telegramResponseData.ok) {
      console.error('❌ Telegram API error response:', telegramResponseData)
      throw new Error(`Telegram API error (${telegramResponse.status}): ${JSON.stringify(telegramResponseData)}`)
    }

    console.log('✅ Message sent successfully to Telegram')
    console.log('=== WEBHOOK COMPLETED SUCCESSFULLY ===')
    return new Response('OK', { 
      status: 200,
      headers: corsHeaders
    })

  } catch (error) {
    console.error('=== CRITICAL ERROR ===')
    console.error('Error type:', error.constructor.name)
    console.error('Error message:', error.message)
    console.error('Error stack:', error.stack)
    console.error('Timestamp:', new Date().toISOString())
    
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
