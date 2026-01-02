/**
 * Example showing fire-and-forget pattern (don't wait for completion)
 *
 * Run with: node examples/fire-and-forget.cjs
 */
const { inference } = require('@inferencesh/sdk');

const client = inference({
  apiKey: process.env.INFERENCE_API_KEY || 'your-api-key',
});

async function main() {
  console.log('🚀 Running fire-and-forget example...\n');

  try {
    // Start task without waiting for completion
    const task = await client.run(
      {
        app: 'infsh/echo', // Replace with your app
        input: {
          message: 'This will run in the background',
        },
      },
      { wait: false }
    );

    console.log('✅ Task started!');
    console.log('   ID:', task.id);
    console.log('   Status:', task.status);
    console.log('\n💡 Task is running in the background.');
    console.log('   You can check status later or cancel it with:');
    console.log(`   await client.cancel('${task.id}')`);
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

main();

