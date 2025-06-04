
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, Settings, ExternalLink, RefreshCw } from 'lucide-react';

const WebhookSetup = () => {
  const [webhookStatus, setWebhookStatus] = useState<'checking' | 'configured' | 'not-configured' | 'error'>('checking');
  const [botInfo, setBotInfo] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [isActivating, setIsActivating] = useState(false);

  const webhookUrl = 'https://jxfvuhvnqgvilyskehmg.supabase.co/functions/v1/telegram-webhook';

  const checkBotInfo = async () => {
    setWebhookStatus('checking');
    try {
      const response = await fetch('https://jxfvuhvnqgvilyskehmg.supabase.co/functions/v1/telegram-webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4ZnZ1aHZucWd2aWx5c2tlaG1nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcyMjY1NTEsImV4cCI6MjA2MjgwMjU1MX0.0GSW69tNPMPu-kXN12vljhITFUrv0I8t7dp7BTBdH28`
        },
        body: JSON.stringify({
          action: 'check_bot_info'
        })
      });

      const result = await response.json();
      
      if (response.ok && result.success) {
        setBotInfo(result.bot_info);
        setWebhookStatus(result.webhook_configured ? 'configured' : 'not-configured');
        setErrorMessage('');
      } else {
        setWebhookStatus('error');
        setErrorMessage(result.error || 'Failed to check bot status');
      }
    } catch (error) {
      setWebhookStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Unknown error');
    }
  };

  const activateBot = async () => {
    setIsActivating(true);
    try {
      const response = await fetch('https://jxfvuhvnqgvilyskehmg.supabase.co/functions/v1/telegram-webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4ZnZ1aHZucWd2aWx5c2tlaG1nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcyMjY1NTEsImV4cCI6MjA2MjgwMjU1MX0.0GSW69tNPMPu-kXN12vljhITFUrv0I8t7dp7BTBdH28`
        },
        body: JSON.stringify({
          action: 'activate_bot'
        })
      });

      const result = await response.json();
      
      if (response.ok && result.success) {
        setErrorMessage('');
        // Refresh bot info after activation
        setTimeout(checkBotInfo, 1000);
      } else {
        setErrorMessage(result.error || 'Failed to activate bot');
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsActivating(false);
    }
  };

  const configureWebhook = async () => {
    setIsConfiguring(true);
    try {
      const response = await fetch('https://jxfvuhvnqgvilyskehmg.supabase.co/functions/v1/telegram-webhook', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4ZnZ1aHZucWd2aWx5c2tlaG1nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcyMjY1NTEsImV4cCI6MjA2MjgwMjU1MX0.0GSW69tNPMPu-kXN12vljhITFUrv0I8t7dp7BTBdH28`
        },
        body: JSON.stringify({
          action: 'set_webhook',
          webhook_url: webhookUrl
        })
      });

      const result = await response.json();
      
      if (response.ok && result.success) {
        setWebhookStatus('configured');
        setErrorMessage('');
        // Refresh bot info to confirm webhook is set
        setTimeout(checkBotInfo, 1000);
      } else {
        setErrorMessage(result.error || 'Failed to configure webhook');
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsConfiguring(false);
    }
  };

  React.useEffect(() => {
    checkBotInfo();
  }, []);

  const getStatusBadge = () => {
    switch (webhookStatus) {
      case 'configured':
        return <Badge className="bg-green-100 text-green-700">Webhook Configured</Badge>;
      case 'not-configured':
        return <Badge variant="destructive">Webhook Not Set</Badge>;
      case 'error':
        return <Badge variant="destructive">Error</Badge>;
      default:
        return <Badge variant="secondary">Checking...</Badge>;
    }
  };

  const getBotStatusBadge = () => {
    if (!botInfo) return null;
    
    const isActive = botInfo.can_receive_updates;
    return (
      <Badge className={isActive ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}>
        {isActive ? 'Active' : 'Inactive'}
      </Badge>
    );
  };

  return (
    <Card className="mb-6 border-2 border-purple-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-purple-600" />
          Telegram Webhook Configuration
          {getStatusBadge()}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {botInfo && (
          <div className="p-3 bg-blue-50 border border-blue-200 rounded">
            <h4 className="font-medium text-blue-800 mb-2 flex items-center gap-2">
              Bot Information
              {getBotStatusBadge()}
            </h4>
            <div className="text-sm space-y-1">
              <p><strong>Bot Name:</strong> {botInfo.first_name}</p>
              <p><strong>Username:</strong> @{botInfo.username}</p>
              <p><strong>Bot ID:</strong> {botInfo.id}</p>
              <p><strong>Can Receive Updates:</strong> {botInfo.can_receive_updates ? 'Yes' : 'No'}</p>
              {!botInfo.can_receive_updates && (
                <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-yellow-800">
                  <p className="text-xs">⚠️ Bot appears inactive. This might be due to:</p>
                  <ul className="text-xs mt-1 list-disc list-inside">
                    <li>Bot token issues</li>
                    <li>Bot not started by BotFather</li>
                    <li>Webhook not properly configured</li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <p className="text-sm font-medium">Webhook URL:</p>
          <div className="p-2 bg-gray-100 rounded text-sm font-mono break-all">
            {webhookUrl}
          </div>
        </div>

        {errorMessage && (
          <div className="p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5" />
              <div>
                <strong>Error:</strong> {errorMessage}
              </div>
            </div>
          </div>
        )}

        <div className="flex gap-2 flex-wrap">
          <Button 
            onClick={checkBotInfo}
            variant="outline"
            size="sm"
            disabled={webhookStatus === 'checking'}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${webhookStatus === 'checking' ? 'animate-spin' : ''}`} />
            {webhookStatus === 'checking' ? 'Checking...' : 'Refresh Status'}
          </Button>

          {botInfo && !botInfo.can_receive_updates && (
            <Button 
              onClick={activateBot}
              variant="default"
              size="sm"
              disabled={isActivating}
              className="bg-green-600 hover:bg-green-700"
            >
              {isActivating ? 'Activating...' : 'Activate Bot'}
            </Button>
          )}
          
          {webhookStatus === 'not-configured' && (
            <Button 
              onClick={configureWebhook}
              variant="default"
              size="sm"
              disabled={isConfiguring}
            >
              {isConfiguring ? 'Configuring...' : 'Configure Webhook'}
            </Button>
          )}

          {webhookStatus === 'configured' && (
            <Button 
              onClick={configureWebhook}
              variant="outline"
              size="sm"
              disabled={isConfiguring}
            >
              {isConfiguring ? 'Updating...' : 'Update Webhook'}
            </Button>
          )}
        </div>

        {webhookStatus === 'configured' && botInfo?.can_receive_updates && (
          <div className="p-3 bg-green-50 border border-green-200 rounded">
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm font-medium">Bot is active and webhook is configured!</span>
            </div>
            <p className="text-xs text-green-600 mt-1">
              Your bot should now respond to commands sent directly in Telegram.
            </p>
          </div>
        )}

        <div className="text-xs text-gray-500 space-y-1">
          <p><strong>Activation Steps:</strong></p>
          <p>1. Click "Refresh Status" to check current bot state</p>
          <p>2. If bot is inactive, click "Activate Bot"</p>
          <p>3. If webhook is not configured, click "Configure Webhook"</p>
          <p>4. Test by sending /start to your bot in Telegram</p>
          <p>5. Bot should respond immediately with the welcome message</p>
        </div>

        <div className="pt-2 border-t">
          <Button 
            variant="ghost" 
            size="sm"
            className="text-xs"
            onClick={() => window.open('https://t.me/' + botInfo?.username, '_blank')}
            disabled={!botInfo?.username}
          >
            <ExternalLink className="w-3 h-3 mr-1" />
            Open Bot in Telegram
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default WebhookSetup;
