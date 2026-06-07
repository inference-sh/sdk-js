/**
 * Template Agent Example
 * 
 * Demonstrates using an existing agent from the workspace (not ad-hoc).
 * 
 * Usage:
 *   npx ts-node examples/agent-template.ts
 * 
 * Set environment variables:
 *   INFERENCE_API_KEY - Your API key
 *   AGENT_ID - Agent ID from workspace (e.g., agent_abc123)
 *   AGENT_VERSION_ID - Optional version ID for pinning
 */

import { Agent } from '../src';

async function main() {
  const apiKey = process.env.INFERENCE_API_KEY;
  const agentId = process.env.AGENT_ID;
  
  if (!apiKey) {
    console.error('Set INFERENCE_API_KEY environment variable');
    process.exit(1);
  }
  
  if (!agentId) {
    console.error('Set AGENT_ID environment variable (e.g., agent_abc123)');
    console.error('Get this from your agent in the workspace: https://app.inference.sh/agents');
    process.exit(1);
  }

  // Create agent from template (existing agent in workspace)
  const agent = new Agent(
    { apiKey },
    {
      agentId: agentId,
      // Optional: pin to specific version for production stability
      versionId: process.env.AGENT_VERSION_ID,
    }
  );

  console.log(`Using template agent: ${agentId}`);
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
      // You would implement handlers for any client tools the agent uses
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

