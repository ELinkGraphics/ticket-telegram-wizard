
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
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')
    if (!botToken) {
      throw new Error('TELEGRAM_BOT_TOKEN not set')
    }

    const update: TelegramUpdate = await req.json()
    
    if (!update.message || !update.message.text) {
      return new Response('No message text', { status: 200 })
    }

    const { message } = update
    const chatId = message.chat.id
    const text = message.text
    const user = message.from

    // Ensure user exists in database
    await supabaseClient
      .from('telegram_users')
      .upsert({
        telegram_user_id: user.id,
        username: user.username || null,
        first_name: user.first_name,
        last_name: user.last_name || null,
      }, {
        onConflict: 'telegram_user_id'
      })

    let responseText = ''

    if (text.startsWith('/start')) {
      responseText = `🎫 Welcome to Event Tickets Bot!

Available commands:
/events - View available events
/mytickets - View your tickets
/help - Show this help message

Get started by checking out available events with /events`
    } else if (text.startsWith('/events')) {
      const { data: events } = await supabaseClient
        .from('events')
        .select('*')
        .gt('available_tickets', 0)
        .order('date', { ascending: true })

      if (!events || events.length === 0) {
        responseText = 'No events available at the moment.'
      } else {
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
        // Generate ticket code
        const ticketCode = Math.random().toString(36).substring(2, 15).toUpperCase()
        
        const { data: userData } = await supabaseClient
          .from('telegram_users')
          .select('id')
          .eq('telegram_user_id', user.id)
          .single()

        // Create ticket
        const { error } = await supabaseClient
          .from('tickets')
          .insert({
            user_id: userData?.id,
            event_id: eventId,
            ticket_code: ticketCode,
            status: 'active'
          })

        if (error) {
          responseText = 'Error purchasing ticket. Please try again.'
        } else {
          // Update available tickets
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
    } else if (text.startsWith('/help')) {
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
      responseText = `❓ Unknown command. Use /help to see available commands.`
    }

    // Send response to Telegram
    const telegramResponse = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text: responseText,
        parse_mode: 'HTML'
      }),
    })

    if (!telegramResponse.ok) {
      throw new Error('Failed to send message to Telegram')
    }

    return new Response('OK', { 
      status: 200,
      headers: corsHeaders
    })

  } catch (error) {
    console.error('Error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
