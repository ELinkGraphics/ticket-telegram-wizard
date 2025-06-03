
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, RefreshCw, MessageCircle } from 'lucide-react';

const WebhookDebugger = () => {
  const [webhookStatus, setWebhookStatus] = useState<'checking' | 'active' | 'error'>('checking');
  const [lastUpdate, setLastUpdate] = useState<string>('Never');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const checkWebhookStatus = async () => {
    setWebhookStatus('checking');
    try {
      // Test the webhook endpoint
      const response = await fetch('https://jxfvuhvnqgvilyskehmg.supabase.co/functions/v1/telegram-webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4ZnZ1aHZucWd2aWx5c2tlaG1nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcyMjY1NTEsImV4cCI6MjA2MjgwMjU1MX0.0GSW69tNPMPu-kXN12vljhITFUrv0I8t7dp7BTBdH28`
        },
        body: JSON.stringify({
          update_id: 1,
          message: {
            message_id: 1,
            from: {
              id: 123456789,
              first_name: "Test",
              username: "testuser"
            },
            chat: {
              id: 123456789,
              type: "private"
            },
            text: "/start",
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

  useEffect(() => {
    checkWebhookStatus();
  }, []);

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
        
        <div className="text-sm text-gray-600">
          <strong>Last Test:</strong> {lastUpdate}
        </div>

        {errorMessage && (
          <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
            <strong>Error:</strong> {errorMessage}
          </div>
        )}

        <div className="space-y-2">
          <Button 
            onClick={checkWebhookStatus}
            variant="outline"
            size="sm"
            disabled={webhookStatus === 'checking'}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${webhookStatus === 'checking' ? 'animate-spin' : ''}`} />
            Test Webhook
          </Button>
        </div>

        <div className="text-xs text-gray-500 space-y-1">
          <p><strong>Debug Steps:</strong></p>
          <p>1. Check that TELEGRAM_BOT_TOKEN is set in Supabase secrets</p>
          <p>2. Verify webhook URL is set in Telegram: /setWebhook</p>
          <p>3. Send /start to your bot and check Edge Function logs</p>
          <p>4. Look for any error messages in the console</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default WebhookDebugger;
