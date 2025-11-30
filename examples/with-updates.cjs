/**
 * Example showing real-time status updates
 *
 * Run with: node examples/with-updates.cjs
 */
const { Inference, TaskStatusCompleted, TaskStatusFailed, TaskStatusRunning } = require('@inferencesh/sdk');

const client = new Inference({
  apiKey: process.env.INFERENCE_API_KEY || 'your-api-key',
});

async function main() {
  console.log('🚀 Running example with status updates...\n');

  try {
    const result = await client.run(
      {
        app: 'infsh/echo', // Replace with your app
        input: {
          message: 'Processing with updates...',
        },
      },
      {
        onUpdate: (update) => {
          const statusEmoji = {
            [TaskStatusRunning]: '⏳',
            [TaskStatusCompleted]: '✅',
            [TaskStatusFailed]: '❌',
          };
          console.log(`${statusEmoji[update.status] || '📋'} Status: ${update.status}`);
        },
      }
    );

    console.log('\n✅ Final result:');
    console.log('   Output:', JSON.stringify(result.output, null, 2));
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

main();

