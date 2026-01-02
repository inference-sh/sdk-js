/**
 * Basic usage example for @inferencesh/sdk
 *
 * Run with: node examples/basic.cjs
 */
const { inference, TaskStatusCompleted, TaskStatusFailed } = require('@inferencesh/sdk');

// Initialize client
const client = inference({
  apiKey: process.env.INFERENCE_API_KEY || 'your-api-key',
});

async function main() {
  console.log('🚀 Running basic example...\n');

  try {
    // Run a task and wait for completion
    const result = await client.run({
      app: 'infsh/echo', // Replace with your app
      input: {
        message: 'Hello from the SDK!',
      },
    });

    console.log('✅ Task completed!');
    console.log('   ID:', result.id);
    console.log('   Status:', result.status);
    console.log('   Output:', JSON.stringify(result.output, null, 2));
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

main();

