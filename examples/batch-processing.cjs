/**
 * Example showing batch processing of multiple items
 *
 * Run with: node examples/batch-processing.cjs
 */
const { Inference, TaskStatusCompleted, TaskStatusFailed } = require('@inferencesh/sdk');

const client = new Inference({
  apiKey: process.env.INFERENCE_API_KEY || 'your-api-key',
});

async function processBatch(items) {
  const results = [];

  for (const [index, item] of items.entries()) {
    console.log(`\n📦 Processing item ${index + 1}/${items.length}: "${item}"`);

    try {
      const result = await client.run(
        {
          app: 'infsh/echo', // Replace with your app
          input: { message: item },
        },
        {
          onUpdate: (update) => {
            process.stdout.write(`   Status: ${update.status}\r`);
          },
        }
      );

      console.log(`   ✅ Completed!`);
      results.push({ input: item, output: result.output, success: true });
    } catch (error) {
      console.log(`   ❌ Failed: ${error.message}`);
      results.push({ input: item, error: error.message, success: false });
    }
  }

  return results;
}

async function main() {
  console.log('🚀 Running batch processing example...');

  const items = ['First item', 'Second item', 'Third item'];

  const results = await processBatch(items);

  console.log('\n📊 Summary:');
  console.log(`   Total: ${results.length}`);
  console.log(`   Success: ${results.filter((r) => r.success).length}`);
  console.log(`   Failed: ${results.filter((r) => !r.success).length}`);
}

main();

