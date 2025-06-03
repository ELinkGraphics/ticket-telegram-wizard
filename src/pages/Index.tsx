
import TelegramBotInterface from '@/components/TelegramBotInterface';
import WebhookDebugger from '@/components/WebhookDebugger';

const Index = () => {
  return (
    <div className="space-y-6">
      <WebhookDebugger />
      <TelegramBotInterface />
    </div>
  );
};

export default Index;
