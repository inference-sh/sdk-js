/**
 * Template Agent Example (CommonJS)
 * 
 * Demonstrates using an existing agent from the workspace by namespace/name@shortid.
 * 
 * Usage:
 *   INFERENCE_API_KEY=your_key AGENT=my-org/assistant@abc123 node examples/agent-template.cjs
 * 
 * Environment variables:
 *   INFERENCE_API_KEY - Your API key
 *   AGENT - Agent reference: namespace/name@shortid (e.g., "infsh/code-assistant@abc123")
 */

const { inference } = require('@inferencesh/sdk');

async function main() {
  const apiKey = process.env.INFERENCE_API_KEY;
  const agentRef = process.env.AGENT;
  
  if (!apiKey) {
    console.error('Set INFERENCE_API_KEY environment variable');
    process.exit(1);
  }
  
  if (!agentRef) {
    console.error('Set AGENT environment variable');
    console.error('Format: namespace/name@shortid (e.g., "infsh/code-assistant@abc123")');
    console.error('Get this from your agent in the workspace: https://app.inference.sh/agents');
    process.exit(1);
  }

  // Create client and agent from template using namespace/name@shortid format
  const client = inference({ apiKey });
  const agent = client.agent(agentRef);

  console.log(`Using template agent: ${agentRef}`);
  console.log('Sending message...\n');

  // Send a message with streaming
  await agent.sendMessage('Hello! What can you help me with?', {
    onMessage: (msg) => {
      if (msg.content) {
        for (const c of msg.content) {
          if (c.type === 'text' && c.text) {
            process.stdout.write(c.text);
          }
        }
      }
    },
    onToolCall: async (call) => {
      // Handle any client tools defined on the agent
      console.log(`\n[Tool Call] ${call.name}:`, call.args);
      
      // For template agents, tool handlers depend on what tools are configured
      await agent.submitToolResult(call.id, JSON.stringify({
        status: 'not_implemented',
        message: `Tool '${call.name}' handler not implemented in this example`,
      }));
    },
  });

  console.log('\n\nChat ID:', agent.currentChatId);
  
  // Continue the conversation
  console.log('\n--- Follow-up ---\n');
  
  await agent.sendMessage('Tell me more about that.', {
    onMessage: (msg) => {
      if (msg.content) {
        for (const c of msg.content) {
          if (c.type === 'text' && c.text) {
            process.stdout.write(c.text);
          }
        }
      }
    },
  });

  console.log('\n\nDone!');
  agent.disconnect();
}

main().catch(console.error);
