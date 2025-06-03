
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

    let update: TelegramUpdate
    try {
      update = JSON.parse(requestText)
      console.log('✅ Successfully parsed JSON update')
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
    console.log('Chat type:', message.chat.type)
    console.log('Message text:', text)
    console.log('User:', user.first_name, user.username)

    // Store/update chat information in database
    console.log('=== STORING CHAT INFORMATION ===')
    const { error: chatError } = await supabaseClient
      .from('telegram_chats')
      .upsert({
        chat_id: chatId,
        chat_type: message.chat.type,
        username: user.username || null,
        first_name: user.first_name,
        last_name: user.last_name || null,
        is_active: true,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'chat_id'
      })

    if (chatError) {
      console.error('❌ Chat storage error:', chatError)
    } else {
      console.log('✅ Chat information stored/updated successfully')
    }

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

    let responseText = ''

    console.log('=== PROCESSING COMMAND ===')
    if (text.startsWith('/start')) {
      console.log('Processing /start command')
      responseText = `🎫 Welcome to Event Tickets Bot!

Available commands:
/events - View available events
/mytickets - View your tickets
/broadcast - Send message to all users (admin only)
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
      
      const { data: event } = await supabaseClient
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single()

      if (!event) {
        responseText = 'Event not found.'
      } else if (event.available_tickets <= 0) {
        responseText = 'Sorry, this event is sold out.'
      } else {
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
        responseText = `🎫 You don't have any tickets yet.

Use /events to browse available events and purchase tickets!`
      } else {
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
    } else if (text.startsWith('/broadcast ')) {
      console.log('Processing /broadcast command')
      const broadcastMessage = text.replace('/broadcast ', '')
      
      if (broadcastMessage.trim()) {
        // Get all active chats
        const { data: activeChats } = await supabaseClient
          .from('telegram_chats')
          .select('chat_id')
          .eq('is_active', true)

        if (activeChats && activeChats.length > 0) {
          console.log(`Broadcasting to ${activeChats.length} chats`)
          let successCount = 0
          let failCount = 0

          for (const chat of activeChats) {
            try {
              const broadcastResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  chat_id: chat.chat_id,
                  text: `📢 BROADCAST MESSAGE:\n\n${broadcastMessage}`
                })
              })

              if (broadcastResponse.ok) {
                successCount++
              } else {
                failCount++
                console.log(`Failed to send to chat ${chat.chat_id}`)
              }
            } catch (error) {
              failCount++
              console.error(`Error sending to chat ${chat.chat_id}:`, error)
            }
          }

          responseText = `📢 Broadcast completed!\n✅ Sent to: ${successCount} chats\n❌ Failed: ${failCount} chats`
        } else {
          responseText = 'No active chats found for broadcasting.'
        }
      } else {
        responseText = 'Usage: /broadcast <your message>'
      }
    } else if (text.startsWith('/help')) {
      responseText = `🎫 Event Tickets Bot Help

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
    } else {
      responseText = `❓ Unknown command. Use /help to see available commands.`
    }

    // Send response to the current chat
    console.log('=== SENDING TELEGRAM RESPONSE ===')
    const telegramApiUrl = `https://api.telegram.org/bot${botToken}/sendMessage`

    const telegramPayload = {
      chat_id: chatId,
      text: responseText,
    }

    const telegramResponse = await fetch(telegramApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(telegramPayload),
    })

    const telegramResponseData = await telegramResponse.json()
    
    if (!telegramResponse.ok || !telegramResponseData.ok) {
      console.error('❌ Telegram API error:', telegramResponseData)
      throw new Error(`Telegram API error: ${JSON.stringify(telegramResponseData)}`)
    }

    console.log('✅ Message sent successfully')
    return new Response('OK', { status: 200, headers: corsHeaders })

  } catch (error) {
    console.error('=== CRITICAL ERROR ===')
    console.error('Error:', error.message)
    
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
