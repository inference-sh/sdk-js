/**
 * Integration tests for streamable HTTP client
 *
 * Tests NDJSON streaming against the real API.
 * Run with: INFERENCE_API_KEY=xxx npm run test:integration
 *
 * Note: Format negotiation tests may be skipped if server doesn't support NDJSON yet.
 *
 * @jest-environment node
 */

import { streamable, StreamableManager } from './http/streamable';
import { Inference } from './index';

const API_KEY = process.env.INFERENCE_API_KEY;
const BASE_URL = process.env.INFERENCE_BASE_URL || 'https://api.inference.sh';

// Simple test app that completes quickly
const TEST_APP = 'infsh/text-templating@53bk0yzk';

const describeIfApiKey = API_KEY ? describe : describe.skip;

describeIfApiKey('Streamable Integration Tests', () => {
  let client: Inference;

  beforeAll(() => {
    client = new Inference({
      apiKey: API_KEY!,
      baseUrl: BASE_URL,
    });
  });

  describe('Format Negotiation', () => {
    it('should negotiate format based on Accept header', async () => {
      // Create a task using the SDK
      const task = await client.run(
        { app: TEST_APP, input: { template: 'Format {1}!', strings: ['Test'] } },
        { wait: false }
      );

      // Test NDJSON request
      const ndjsonRes = await fetch(`${BASE_URL}/tasks/${task.id}/stream`, {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Accept': 'application/x-ndjson',
        },
      });

      expect(ndjsonRes.ok).toBe(true);
      const ndjsonContentType = ndjsonRes.headers.get('content-type');

      // Test SSE request
      const sseRes = await fetch(`${BASE_URL}/tasks/${task.id}/stream`, {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Accept': 'text/event-stream',
        },
      });

      expect(sseRes.ok).toBe(true);
      const sseContentType = sseRes.headers.get('content-type');

      // Log what we got for debugging
      console.log('NDJSON request Content-Type:', ndjsonContentType);
      console.log('SSE request Content-Type:', sseContentType);

      // At minimum, SSE should work
      expect(sseContentType).toContain('text/event-stream');

      // If NDJSON is supported, it should return NDJSON content-type
      // Otherwise it falls back to SSE (server not yet updated)
      const supportsNDJSON = ndjsonContentType?.includes('application/x-ndjson');
      if (supportsNDJSON) {
        console.log('✓ Server supports NDJSON format negotiation');
      } else {
        console.log('⚠ Server does not yet support NDJSON, falling back to SSE');
      }

      // Clean up - consume the streams
      for (const res of [ndjsonRes, sseRes]) {
        const reader = res.body?.getReader();
        if (reader) {
          while (true) {
            const { done } = await reader.read();
            if (done) break;
          }
        }
      }
    }, 60000);
  });

  describe('streamable() with NDJSON server', () => {
    // These tests require the server to support NDJSON
    // Skip if server doesn't support it yet

    it('should stream task updates when server supports NDJSON', async () => {
      // Create a task using the SDK (fire and forget)
      const task = await client.run(
        { app: TEST_APP, input: { template: 'Hello {1}!', strings: ['Streamable'] } },
        { wait: false }
      );
      expect(task.id).toBeDefined();

      // Check if server supports NDJSON
      const testRes = await fetch(`${BASE_URL}/tasks/${task.id}/stream`, {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Accept': 'application/x-ndjson',
        },
      });

      const contentType = testRes.headers.get('content-type');
      if (!contentType?.includes('application/x-ndjson')) {
        console.log('⚠ Skipping NDJSON streaming test - server does not support NDJSON yet');
        // Consume and close
        const reader = testRes.body?.getReader();
        if (reader) {
          reader.cancel();
        }
        return;
      }

      // Server supports NDJSON - test the streamable client
      const updates: any[] = [];
      for await (const update of streamable<{ status: number }>(`${BASE_URL}/tasks/${task.id}/stream`, {
        headers: { 'Authorization': `Bearer ${API_KEY}` },
      })) {
        updates.push(update);
        // Stop when task reaches terminal status
        if (update.status >= 100) break;
      }

      expect(updates.length).toBeGreaterThan(0);

      // Last update should be terminal
      const lastUpdate = updates[updates.length - 1];
      expect(lastUpdate.status).toBeGreaterThanOrEqual(100);
    }, 60000);
  });

  describe('StreamableManager with NDJSON server', () => {
    it('should receive updates via callbacks when server supports NDJSON', async () => {
      // Create a task using the SDK
      const task = await client.run(
        { app: TEST_APP, input: { template: 'Manager {1}!', strings: ['Test'] } },
        { wait: false }
      );

      // Check if server supports NDJSON
      const testRes = await fetch(`${BASE_URL}/tasks/${task.id}/stream`, {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Accept': 'application/x-ndjson',
        },
      });

      const contentType = testRes.headers.get('content-type');
      if (!contentType?.includes('application/x-ndjson')) {
        console.log('⚠ Skipping StreamableManager test - server does not support NDJSON yet');
        const reader = testRes.body?.getReader();
        if (reader) {
          reader.cancel();
        }
        return;
      }

      const updates: any[] = [];
      let started = false;
      let ended = false;

      const manager = new StreamableManager<{ status: number }>({
        url: `${BASE_URL}/tasks/${task.id}/stream`,
        headers: { 'Authorization': `Bearer ${API_KEY}` },
        onStart: () => { started = true; },
        onEnd: () => { ended = true; },
        onData: (data) => {
          updates.push(data);
          // Stop when terminal
          if (data.status >= 100) {
            manager.stop();
          }
        },
        onError: (err) => {
          console.error('Stream error:', err);
        },
      });

      await manager.start();

      expect(started).toBe(true);
      expect(ended).toBe(true);
      expect(updates.length).toBeGreaterThan(0);
    }, 60000);
  });
});

// Ensure Jest doesn't complain when API key is not set
describe('Streamable Integration Setup', () => {
  it('checks for API key', () => {
    if (!API_KEY) {
      console.log('⚠️  Skipping streamable integration tests - INFERENCE_API_KEY not set');
    }
    expect(true).toBe(true);
  });
});
