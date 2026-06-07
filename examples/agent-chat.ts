/**
 * Agent Chat Example
 * 
 * Demonstrates headless agent chat with client tools.
 * 
 * Usage:
 *   npx ts-node examples/agent-chat.ts
 * 
 * Set INFERENCE_API_KEY environment variable first.
 */

import {
  inference,
  tool,
  appTool,
  internalTools,
  string,
  number,
  enumOf,
  boolean,
} from '../src';

// =============================================================================
// Define Client Tools
// =============================================================================

// Simple calculator tool
const calculatorTool = tool('calculator')
  .describe('Performs basic math operations')
  .param('a', number('First number'))
  .param('b', number('Second number'))
  .param('operation', enumOf(['add', 'subtract', 'multiply', 'divide'], 'Operation to perform'))
  .build();

// Weather lookup tool (simulated)
const weatherTool = tool('get_weather')
  .describe('Gets current weather for a location')
  .param('location', string('City name'))
  .param('units', enumOf(['celsius', 'fahrenheit'], 'Temperature units'))
  .build();

// File search tool (simulated)
const searchTool = tool('search_files')
  .describe('Searches for files matching a pattern')
  .param('pattern', string('Search pattern (glob)'))
  .param('recursive', boolean('Search subdirectories'))
  .requireApproval() // Requires user approval (HIL)
  .build();

// =============================================================================
// Tool Handlers (executed client-side)
// =============================================================================

const toolHandlers: Record<string, (args: Record<string, unknown>) => Promise<string>> = {
  calculator: async ({ a, b, operation }) => {
    const numA = Number(a);
    const numB = Number(b);
    let result: number;
    
    switch (operation) {
      case 'add': result = numA + numB; break;
      case 'subtract': result = numA - numB; break;
      case 'multiply': result = numA * numB; break;
      case 'divide': result = numB !== 0 ? numA / numB : NaN; break;
      default: return JSON.stringify({ error: `Unknown operation: ${operation}` });
    }
    
    return JSON.stringify({ result, expression: `${numA} ${operation} ${numB} = ${result}` });
  },
  
  get_weather: async ({ location, units }) => {
    // Simulated weather data
    const temp = units === 'celsius' ? 22 : 72;
    return JSON.stringify({
      location,
      temperature: temp,
      units,
      conditions: 'Partly cloudy',
      humidity: 65,
    });
  },
  
  search_files: async ({ pattern, recursive }) => {
    // Simulated file search
    return JSON.stringify({
      pattern,
      recursive,
      results: [
        { path: '/home/user/docs/report.md', size: 1024 },
        { path: '/home/user/docs/notes.txt', size: 512 },
      ],
    });
  },
};

// =============================================================================
// Main
// =============================================================================

async function main() {
  const apiKey = process.env.INFERENCE_API_KEY;
  const baseUrl = process.env.INFERENCE_BASE_URL || 'https://api.inference.sh';
  if (!apiKey) {
    console.error('Set INFERENCE_API_KEY environment variable');
    process.exit(1);
  }

  // Create client and ad-hoc agent
  const client = inference({ apiKey, baseUrl });
  const agent = client.agent({
    core_app: { ref: 'infsh/claude-haiku-45@375bg07t' },
    name: 'Tool Assistant',
    system_prompt: `You are a helpful assistant with access to tools.
Available tools:
- calculator: Performs math operations
- get_weather: Gets weather for a location
- search_files: Searches files (requires approval)

Use tools when appropriate to help the user.`,
    tools: [calculatorTool, weatherTool, searchTool],
    internal_tools: internalTools().memory().build(),
  });

  console.log('Agent ready. Sending message...\n');

  // Send a message and handle streaming
  const response = await agent.sendMessage(
    'What is 42 * 17? Also, what\'s the weather in Paris?',
    {
      onMessage: (msg) => {
        // Handle streaming message updates
        if (msg.content) {
          for (const c of msg.content) {
            if (c.type === 'text' && c.text) {
              process.stdout.write(c.text);
            }
          }
        }
      },
      
      onToolCall: async (call) => {
        console.log(`\n[Tool Call] ${call.name}:`, call.args);
        
        // Execute the tool handler
        const handler = toolHandlers[call.name];
        if (handler) {
          try {
            const result = await handler(call.args);
            console.log(`[Tool Result] ${result}`);
            await agent.submitToolResult(call.id, result);
          } catch (e) {
            const error = JSON.stringify({ error: String(e) });
            await agent.submitToolResult(call.id, error);
          }
        } else {
          await agent.submitToolResult(call.id, JSON.stringify({ error: `Unknown tool: ${call.name}` }));
        }
      },
    }
  );

  console.log('\n\nChat ID:', agent.currentChatId);
  
  // Continue the conversation
  console.log('\n--- Second message ---\n');
  
  await agent.sendMessage('Now convert that temperature to Fahrenheit', {
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
      console.log(`\n[Tool Call] ${call.name}:`, call.args);
      const handler = toolHandlers[call.name];
      if (handler) {
        const result = await handler(call.args);
        console.log(`[Tool Result] ${result}`);
        await agent.submitToolResult(call.id, result);
      }
    },
  });

  console.log('\n\nDone!');
  agent.disconnect();
}

main().catch(console.error);

