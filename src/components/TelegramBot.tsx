
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Ticket, TicketCheck, TicketPlus } from 'lucide-react';

interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  location: string;
  price: number;
  availableTickets: number;
  image: string;
}

interface UserTicket {
  id: string;
  eventId: string;
  eventTitle: string;
  purchaseDate: string;
  ticketCode: string;
  status: 'active' | 'used' | 'expired';
}

const TelegramBot = () => {
  const [currentView, setCurrentView] = useState<'events' | 'myTickets' | 'eventDetails' | 'purchase'>('events');
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [userTickets, setUserTickets] = useState<UserTicket[]>([]);
  const [events] = useState<Event[]>([
    {
      id: '1',
      title: 'Tech Conference 2024',
      description: 'Join us for the biggest tech event of the year featuring industry leaders and cutting-edge innovations.',
      date: '2024-06-15',
      location: 'San Francisco Convention Center',
      price: 299,
      availableTickets: 150,
      image: '/placeholder.svg'
    },
    {
      id: '2',
      title: 'Music Festival Summer',
      description: 'Three days of amazing music from top artists around the world.',
      date: '2024-07-20',
      location: 'Central Park, NYC',
      price: 199,
      availableTickets: 500,
      image: '/placeholder.svg'
    },
    {
      id: '3',
      title: 'Startup Pitch Night',
      description: 'Watch innovative startups pitch their ideas to top investors.',
      date: '2024-06-01',
      location: 'Innovation Hub, Austin',
      price: 49,
      availableTickets: 75,
      image: '/placeholder.svg'
    }
  ]);

  const generateTicketCode = () => {
    return Math.random().toString(36).substring(2, 15).toUpperCase();
  };

  const handleBuyTicket = (event: Event) => {
    const newTicket: UserTicket = {
      id: Math.random().toString(36).substring(2, 15),
      eventId: event.id,
      eventTitle: event.title,
      purchaseDate: new Date().toISOString(),
      ticketCode: generateTicketCode(),
      status: 'active'
    };
    setUserTickets([...userTickets, newTicket]);
    setCurrentView('myTickets');
  };

  const EventCard = ({ event }: { event: Event }) => (
    <Card className="mb-4 hover:shadow-lg transition-shadow duration-200 bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg font-bold text-gray-800">{event.title}</CardTitle>
          <Badge variant="secondary" className="bg-purple-100 text-purple-700">
            ${event.price}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-gray-600 text-sm mb-3">{event.description}</p>
        <div className="space-y-2 mb-4">
          <p className="text-sm"><strong>Date:</strong> {new Date(event.date).toLocaleDateString()}</p>
          <p className="text-sm"><strong>Location:</strong> {event.location}</p>
          <p className="text-sm"><strong>Available:</strong> {event.availableTickets} tickets</p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => {setSelectedEvent(event); setCurrentView('eventDetails');}}
            variant="outline"
            size="sm"
            className="flex-1"
          >
            View Details
          </Button>
          <Button 
            onClick={() => handleBuyTicket(event)}
            className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            size="sm"
          >
            <TicketPlus className="w-4 h-4 mr-1" />
            Buy Ticket
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const TicketCard = ({ ticket }: { ticket: UserTicket }) => (
    <Card className="mb-4 bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg font-bold text-gray-800">{ticket.eventTitle}</CardTitle>
          <Badge 
            variant={ticket.status === 'active' ? 'default' : 'secondary'}
            className={ticket.status === 'active' ? 'bg-green-100 text-green-700' : ''}
          >
            {ticket.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 mb-4">
          <p className="text-sm"><strong>Ticket Code:</strong> <code className="bg-gray-100 px-2 py-1 rounded">{ticket.ticketCode}</code></p>
          <p className="text-sm"><strong>Purchased:</strong> {new Date(ticket.purchaseDate).toLocaleDateString()}</p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full"
          disabled={ticket.status !== 'active'}
        >
          <TicketCheck className="w-4 h-4 mr-1" />
          Validate Ticket
        </Button>
      </CardContent>
    </Card>
  );

  const NavigationButtons = () => (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4">
      <div className="max-w-md mx-auto flex gap-2">
        <Button 
          onClick={() => setCurrentView('events')}
          variant={currentView === 'events' ? 'default' : 'outline'}
          className="flex-1"
          size="sm"
        >
          Events
        </Button>
        <Button 
          onClick={() => setCurrentView('myTickets')}
          variant={currentView === 'myTickets' ? 'default' : 'outline'}
          className="flex-1"
          size="sm"
        >
          <Ticket className="w-4 h-4 mr-1" />
          My Tickets ({userTickets.length})
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 via-blue-50 to-indigo-100">
      <div className="max-w-md mx-auto bg-white min-h-screen shadow-xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-4">
          <h1 className="text-xl font-bold text-center">🎫 Event Tickets Bot</h1>
          <p className="text-center text-purple-100 text-sm mt-1">Buy and manage your event tickets</p>
        </div>

        {/* Content */}
        <div className="p-4 pb-20">
          {currentView === 'events' && (
            <div>
              <h2 className="text-lg font-semibold mb-4 text-gray-800">Available Events</h2>
              {events.map(event => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          )}

          {currentView === 'myTickets' && (
            <div>
              <h2 className="text-lg font-semibold mb-4 text-gray-800">My Tickets</h2>
              {userTickets.length === 0 ? (
                <Card className="text-center p-8">
                  <CardContent>
                    <Ticket className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-500">No tickets yet</p>
                    <Button 
                      onClick={() => setCurrentView('events')}
                      className="mt-4 bg-gradient-to-r from-purple-600 to-blue-600"
                    >
                      Browse Events
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                userTickets.map(ticket => (
                  <TicketCard key={ticket.id} ticket={ticket} />
                ))
              )}
            </div>
          )}

          {currentView === 'eventDetails' && selectedEvent && (
            <div>
              <Button 
                onClick={() => setCurrentView('events')}
                variant="outline"
                size="sm"
                className="mb-4"
              >
                ← Back to Events
              </Button>
              <Card className="bg-gradient-to-br from-purple-50 to-blue-50 border-purple-200">
                <CardHeader>
                  <CardTitle className="text-xl text-gray-800">{selectedEvent.title}</CardTitle>
                  <Badge className="w-fit bg-purple-100 text-purple-700">
                    ${selectedEvent.price}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <p className="text-gray-700">{selectedEvent.description}</p>
                    <div className="bg-white p-4 rounded-lg space-y-2">
                      <p><strong>Date:</strong> {new Date(selectedEvent.date).toLocaleDateString()}</p>
                      <p><strong>Location:</strong> {selectedEvent.location}</p>
                      <p><strong>Available Tickets:</strong> {selectedEvent.availableTickets}</p>
                    </div>
                    <Button 
                      onClick={() => handleBuyTicket(selectedEvent)}
                      className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                    >
                      <TicketPlus className="w-4 h-4 mr-2" />
                      Buy Ticket - ${selectedEvent.price}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        <NavigationButtons />
      </div>
    </div>
  );
};

export default TelegramBot;
