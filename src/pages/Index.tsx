
import TelegramBotInterface from '@/components/TelegramBotInterface';
import WebhookDebugger from '@/components/WebhookDebugger';
import WebhookSetup from '@/components/WebhookSetup';

const Index = () => {
  return (
    <div className="space-y-6">
      <WebhookSetup />
      <WebhookDebugger />
      <TelegramBotInterface />
    </div>
  );
};

export default Index;
