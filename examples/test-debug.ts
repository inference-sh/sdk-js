import { inference } from '../src';
import type { ChatMessageDTO, ChatDTO } from '../src/types';

async function main() {
  const client = inference({ 
    apiKey: '1nfsh-40d0xtgj90nd2tbtxjg2s96e1p',
    baseUrl: 'https://api-dev.inference.sh'
  });
  
  const agent = client.agent({
    coreApp: 'infsh/claude-haiku-45@375bg07t',
    name: 'Simple Test',
    systemPrompt: 'You are a helpful assistant. Keep responses brief.',
  });

  console.log('Sending message...');
  
  await agent.sendMessage('Say hello in exactly 3 words', {
    onMessage: (msg: ChatMessageDTO) => {
      if (msg.content) {
        for (const c of msg.content) {
          if (c.type === 'text') {
            process.stdout.write(c.text || '');
          }
        }
      }
    },
    onChat: (chat: ChatDTO) => {
      console.log('\n[Chat status:', chat.status + ']');
    },
  });

  console.log('\n\nChat ID:', agent.currentChatId);
  console.log('Done!');
  agent.disconnect();
}

main().catch(console.error);
