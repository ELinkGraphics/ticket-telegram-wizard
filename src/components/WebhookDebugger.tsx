
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, RefreshCw, MessageCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const WebhookDebugger = () => {
  const [webhookStatus, setWebhookStatus] = useState<'checking' | 'active' | 'error'>('checking');
  const [lastUpdate, setLastUpdate] = useState<string>('Never');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [availableChats, setAvailableChats] = useState<any[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string>('');

  const fetchAvailableChats = async () => {
    try {
      // Use telegram_users table since telegram_chats might not be in the types yet
      const { data: users, error } = await supabase
        .from('telegram_users')
        .select('telegram_user_id, username, first_name, last_name')
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error fetching users:', error);
        return;
      }

      setAvailableChats(users || []);
      if (users && users.length > 0 && !selectedChatId) {
        setSelectedChatId(users[0].telegram_user_id.toString());
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  const checkWebhookStatus = async () => {
    setWebhookStatus('checking');
    
    if (!selectedChatId) {
      setWebhookStatus('error');
      setErrorMessage('No chat ID available. Please start a conversation with the bot first.');
      return;
    }

    try {
      // Test the webhook endpoint with a real chat ID
      const response = await fetch('https://jxfvuhvnqgvilyskehmg.supabase.co/functions/v1/telegram-webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4ZnZ1aHZucWd2aWx5c2tlaG1nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcyMjY1NTEsImV4cCI6MjA2MjgwMjU1MX0.0GSW69tNPMPu-kXN12vljhITFUrv0I8t7dp7BTBdH28`
        },
        body: JSON.stringify({
          update_id: Date.now(),
          message: {
            message_id: Date.now(),
            from: {
              id: parseInt(selectedChatId),
              first_name: "Test",
              username: "debugger"
            },
            chat: {
              id: parseInt(selectedChatId),
              type: "private"
            },
            text: "/help",
            date: Math.floor(Date.now() / 1000)
          }
        })
      });

      if (response.ok) {
        setWebhookStatus('active');
        setLastUpdate(new Date().toLocaleTimeString());
        setErrorMessage('');
      } else {
        const errorText = await response.text();
        setWebhookStatus('error');
        setErrorMessage(`HTTP ${response.status}: ${errorText}`);
      }
    } catch (error) {
      setWebhookStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const sendTestCommand = async (command: string) => {
    if (!selectedChatId) {
      setErrorMessage('No chat ID selected');
      return;
    }

    try {
      const response = await fetch('https://jxfvuhvnqgvilyskehmg.supabase.co/functions/v1/telegram-webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4ZnZ1aHZucWd2aWx5c2tlaG1nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcyMjY1NTEsImV4cCI6MjA2MjgwMjU1MX0.0GSW69tNPMPu-kXN12vljhITFUrv0I8t7dp7BTBdH28`
        },
        body: JSON.stringify({
          update_id: Date.now(),
          message: {
            message_id: Date.now(),
            from: {
              id: parseInt(selectedChatId),
              first_name: "Debugger",
              username: "debugger"
            },
            chat: {
              id: parseInt(selectedChatId),
              type: "private"
            },
            text: command,
            date: Math.floor(Date.now() / 1000)
          }
        })
      });

      if (response.ok) {
        setLastUpdate(new Date().toLocaleTimeString());
        setErrorMessage('');
      } else {
        const errorText = await response.text();
        setErrorMessage(`Command failed: ${errorText}`);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unknown error');
    }
  };

  useEffect(() => {
    fetchAvailableChats();
  }, []);

  useEffect(() => {
    if (selectedChatId) {
      checkWebhookStatus();
    }
  }, [selectedChatId]);

  return (
    <Card className="mb-6 border-2 border-blue-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-blue-600" />
          Webhook Debugger
          <Badge 
            variant={webhookStatus === 'active' ? 'default' : webhookStatus === 'error' ? 'destructive' : 'secondary'}
            className={webhookStatus === 'active' ? 'bg-green-100 text-green-700' : ''}
          >
            {webhookStatus === 'checking' && 'Checking...'}
            {webhookStatus === 'active' && 'Active'}
            {webhookStatus === 'error' && 'Error'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          {webhookStatus === 'active' && <CheckCircle className="w-5 h-5 text-green-600" />}
          {webhookStatus === 'error' && <AlertCircle className="w-5 h-5 text-red-600" />}
          {webhookStatus === 'checking' && <RefreshCw className="w-5 h-5 text-blue-600 animate-spin" />}
          <span className="text-sm">
            Webhook URL: https://jxfvuhvnqgvilyskehmg.supabase.co/functions/v1/telegram-webhook
          </span>
        </div>

        {availableChats.length > 0 && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Select Chat for Testing:</label>
            <select 
              value={selectedChatId} 
              onChange={(e) => setSelectedChatId(e.target.value)}
              className="w-full p-2 border rounded text-sm"
            >
              {availableChats.map((user) => (
                <option key={user.telegram_user_id} value={user.telegram_user_id}>
                  {user.first_name} {user.last_name} (@{user.username || 'no username'}) - ID: {user.telegram_user_id}
                </option>
              ))}
            </select>
          </div>
        )}
        
        <div className="text-sm text-gray-600">
          <strong>Last Test:</strong> {lastUpdate}
        </div>

        {errorMessage && (
          <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
            <strong>Error:</strong> {errorMessage}
          </div>
        )}

        <div className="space-y-2">
          <div className="flex gap-2 flex-wrap">
            <Button 
              onClick={checkWebhookStatus}
              variant="outline"
              size="sm"
              disabled={webhookStatus === 'checking' || !selectedChatId}
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${webhookStatus === 'checking' ? 'animate-spin' : ''}`} />
              Test Webhook
            </Button>
            
            <Button 
              onClick={() => sendTestCommand('/start')}
              variant="outline"
              size="sm"
              disabled={!selectedChatId}
            >
              Test /start
            </Button>
            
            <Button 
              onClick={() => sendTestCommand('/events')}
              variant="outline"
              size="sm"
              disabled={!selectedChatId}
            >
              Test /events
            </Button>
            
            <Button 
              onClick={() => sendTestCommand('/mytickets')}
              variant="outline"
              size="sm"
              disabled={!selectedChatId}
            >
              Test /mytickets
            </Button>
          </div>
          
          <Button 
            onClick={fetchAvailableChats}
            variant="ghost"
            size="sm"
          >
            Refresh Chat List
          </Button>
        </div>

        <div className="text-xs text-gray-500 space-y-1">
          <p><strong>Debug Steps:</strong></p>
          <p>1. Start a conversation with your bot on Telegram</p>
          <p>2. Send /start to register your chat ID</p>
          <p>3. Select your chat from the dropdown above</p>
          <p>4. Use the test buttons to simulate commands</p>
          <p>5. Check Edge Function logs for detailed debugging</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default WebhookDebugger;
