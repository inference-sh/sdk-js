import { inference } from '../src';
import type { ChatMessageDTO, ChatDTO } from '../src/types';

async function main() {
  const apiKey = process.env.INFERENCE_API_KEY;
  if (!apiKey) {
    console.error('Set INFERENCE_API_KEY');
    process.exit(1);
  }

  const client = inference({
    apiKey,
    baseUrl: process.env.INFERENCE_BASE_URL || 'https://api.inference.sh',
  });

  const agent = client.agent({
    core_app: { ref: process.env.CORE_APP || 'infsh/claude-haiku-45@375bg07t' },
    name: 'Simple Test',
    system_prompt: 'You are a helpful assistant. Keep responses brief.',
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
