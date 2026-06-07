/**
 * Sessions integration tests for @inferencesh/sdk
 *
 * These tests hit the real API and require INFERENCE_API_KEY to be set.
 * Run with: npm run test:integration
 *
 * Prerequisites:
 *   - API and scheduler must be running
 *   - Test app deployed: infsh/session-test
 *
 * @jest-environment node
 */

import { Inference } from './index';
import { TaskStatusCompleted, AppSession } from './types';

const API_KEY = process.env.INFERENCE_API_KEY;
const BASE_URL = process.env.INFERENCE_BASE_URL || 'https://api.inference.sh';

// Session test app with multi-function support
const SESSION_TEST_APP = 'infsh/session-test';

const describeIfApiKey = API_KEY ? describe : describe.skip;

// Output types for session-test app functions
interface SetValueOutput {
  success: boolean;
  key: string;
  value: string;
}

interface GetValueOutput {
  found: boolean;
  key: string;
  value?: string;
}

interface IncrementOutput {
  key: string;
  previous: number;
  current: number;
}

interface GetAllOutput {
  state: Record<string, string>;
  call_count: number;
}

describeIfApiKey('Sessions Integration Tests', () => {
  let client: Inference;

  beforeAll(() => {
    client = new Inference({
      apiKey: API_KEY!,
      baseUrl: BASE_URL,
    });
  });

  // ==========================================================================
  // Session Creation Tests
  // ==========================================================================

  describe('Session Creation', () => {
    it('should create a new session and return real session ID', async () => {
      const result = await client.run({
        app: SESSION_TEST_APP,
        function: 'set_value',
        input: { key: 'test_create', value: 'hello' },
        session: 'new',
      });

      expect(result.status).toBe(TaskStatusCompleted);
      expect(result.session_id).toBeDefined();
      expect(result.session_id).not.toBe('new');
      expect(result.session_id).toMatch(/^sess_/);
    }, 60000);

    it('should return correct output data', async () => {
      const result = await client.run({
        app: SESSION_TEST_APP,
        function: 'set_value',
        input: { key: 'output_test', value: 'test_value' },
        session: 'new',
      });

      expect(result.status).toBe(TaskStatusCompleted);

      const output = result.output as SetValueOutput;
      expect(output.success).toBe(true);
      expect(output.key).toBe('output_test');
      expect(output.value).toBe('test_value');
    }, 60000);
  });

  // ==========================================================================
  // Session Continuity Tests
  // ==========================================================================

  describe('Session Continuity', () => {
    it('should persist state across calls in same session', async () => {
      // Create session with initial value
      const result1 = await client.run({
        app: SESSION_TEST_APP,
        function: 'set_value',
        input: { key: 'persist_key', value: 'persist_value' },
        session: 'new',
      });

      expect(result1.status).toBe(TaskStatusCompleted);
      const sessionId = result1.session_id!;
      expect(sessionId).toMatch(/^sess_/);

      // Retrieve value from same session
      const result2 = await client.run({
        app: SESSION_TEST_APP,
        function: 'get_value',
        input: { key: 'persist_key' },
        session: sessionId,
      });

      expect(result2.status).toBe(TaskStatusCompleted);
      expect(result2.session_id).toBe(sessionId);

      const output = result2.output as GetValueOutput;
      expect(output.found).toBe(true);
      expect(output.value).toBe('persist_value');
    }, 120000);

    it('should accumulate multiple values in session', async () => {
      // Create session
      const result1 = await client.run({
        app: SESSION_TEST_APP,
        function: 'set_value',
        input: { key: 'key1', value: 'value1' },
        session: 'new',
      });

      expect(result1.status).toBe(TaskStatusCompleted);
      const sessionId = result1.session_id!;

      // Add second value
      const result2 = await client.run({
        app: SESSION_TEST_APP,
        function: 'set_value',
        input: { key: 'key2', value: 'value2' },
        session: sessionId,
      });

      expect(result2.status).toBe(TaskStatusCompleted);

      // Get all state
      const result3 = await client.run({
        app: SESSION_TEST_APP,
        function: 'get_all',
        input: {},
        session: sessionId,
      });

      expect(result3.status).toBe(TaskStatusCompleted);

      const output = result3.output as GetAllOutput;
      expect(output.state.key1).toBe('value1');
      expect(output.state.key2).toBe('value2');
    }, 120000);
  });

  // ==========================================================================
  // Multi-Function Routing Tests
  // ==========================================================================

  describe('Multi-Function Routing', () => {
    it('should route to increment function correctly', async () => {
      const result = await client.run({
        app: SESSION_TEST_APP,
        function: 'increment',
        input: { key: 'counter', amount: 5 },
        session: 'new',
      });

      expect(result.status).toBe(TaskStatusCompleted);

      const output = result.output as IncrementOutput;
      expect(output.key).toBe('counter');
      expect(output.previous).toBe(0);
      expect(output.current).toBe(5);
    }, 60000);

    it('should handle different input schemas per function', async () => {
      // Create session
      const result1 = await client.run({
        app: SESSION_TEST_APP,
        function: 'set_value',
        input: { key: 'schema_test', value: 'v1' },
        session: 'new',
      });

      expect(result1.status).toBe(TaskStatusCompleted);
      const sessionId = result1.session_id!;

      // get_value has different schema (no 'value' field)
      const result2 = await client.run({
        app: SESSION_TEST_APP,
        function: 'get_value',
        input: { key: 'schema_test' },
        session: sessionId,
      });

      expect(result2.status).toBe(TaskStatusCompleted);

      // increment has different schema (amount field)
      const result3 = await client.run({
        app: SESSION_TEST_APP,
        function: 'increment',
        input: { key: 'cnt', amount: 10 },
        session: sessionId,
      });

      expect(result3.status).toBe(TaskStatusCompleted);

      // get_all has empty schema
      const result4 = await client.run({
        app: SESSION_TEST_APP,
        function: 'get_all',
        input: {},
        session: sessionId,
      });

      expect(result4.status).toBe(TaskStatusCompleted);
    }, 120000);
  });

  // ==========================================================================
  // Session Isolation Tests
  // ==========================================================================

  describe('Session Isolation', () => {
    it('should create different sessions for different "new" requests', async () => {
      // Create first session
      const result1 = await client.run({
        app: SESSION_TEST_APP,
        function: 'set_value',
        input: { key: 'isolated', value: 'session1' },
        session: 'new',
      });

      expect(result1.status).toBe(TaskStatusCompleted);
      const session1 = result1.session_id!;

      // Create second session
      const result2 = await client.run({
        app: SESSION_TEST_APP,
        function: 'set_value',
        input: { key: 'isolated', value: 'session2' },
        session: 'new',
      });

      expect(result2.status).toBe(TaskStatusCompleted);
      const session2 = result2.session_id!;

      // Sessions should be different
      expect(session1).not.toBe(session2);
    }, 120000);
  });

  // ==========================================================================
  // Sessions API Tests
  // ==========================================================================

  describe('Sessions API', () => {
    it('should get session info', async () => {
      // Create a session
      const result = await client.run({
        app: SESSION_TEST_APP,
        function: 'set_value',
        input: { key: 'api_test', value: 'hello' },
        session: 'new',
      });

      expect(result.status).toBe(TaskStatusCompleted);
      const sessionId = result.session_id!;

      // Get session info via API
      const sessionInfo = await client.sessions.get(sessionId);

      expect(sessionInfo.BaseModel.id).toBe(sessionId);
      expect(sessionInfo.status).toBe('active');
      expect(sessionInfo.call_count).toBeGreaterThanOrEqual(1);
    }, 60000);

    it('should list sessions', async () => {
      const sessions = await client.sessions.list();

      expect(Array.isArray(sessions)).toBe(true);
      // Should have at least one session from previous tests
    }, 30000);

    it('should keepalive a session', async () => {
      // Create a session
      const result = await client.run({
        app: SESSION_TEST_APP,
        function: 'set_value',
        input: { key: 'keepalive_test', value: 'hello' },
        session: 'new',
      });

      expect(result.status).toBe(TaskStatusCompleted);
      const sessionId = result.session_id!;

      // Keepalive
      const updated = await client.sessions.keepalive(sessionId);

      expect(updated.BaseModel.id).toBe(sessionId);
      expect(updated.status).toBe('active');
    }, 60000);

    it('should end a session', async () => {
      // Create a session
      const result = await client.run({
        app: SESSION_TEST_APP,
        function: 'set_value',
        input: { key: 'end_test', value: 'goodbye' },
        session: 'new',
      });

      expect(result.status).toBe(TaskStatusCompleted);
      const sessionId = result.session_id!;

      // End the session
      await client.sessions.end(sessionId);

      // Trying to use ended session should fail
      await expect(
        client.run({
          app: SESSION_TEST_APP,
          function: 'get_value',
          input: { key: 'end_test' },
          session: sessionId,
        })
      ).rejects.toThrow();
    }, 60000);
  });

  // ==========================================================================
  // Error Cases
  // ==========================================================================

  describe('Error Cases', () => {
    it('should fail with invalid session ID', async () => {
      await expect(
        client.run({
          app: SESSION_TEST_APP,
          function: 'get_value',
          input: { key: 'foo' },
          session: 'sess_invalid_does_not_exist_12345',
        })
      ).rejects.toThrow();
    }, 30000);
  });

  // ==========================================================================
  // Performance Tests
  // ==========================================================================

  describe('Performance', () => {
    it('should be faster on warm worker', async () => {
      // Create session (cold start)
      const result1 = await client.run({
        app: SESSION_TEST_APP,
        function: 'set_value',
        input: { key: 'perf_test', value: '1' },
        session: 'new',
      });

      expect(result1.status).toBe(TaskStatusCompleted);
      const sessionId = result1.session_id!;

      // Second call should be fast (warm worker)
      const start = Date.now();
      const result2 = await client.run({
        app: SESSION_TEST_APP,
        function: 'set_value',
        input: { key: 'perf_test', value: '2' },
        session: sessionId,
      });
      const elapsed = Date.now() - start;

      expect(result2.status).toBe(TaskStatusCompleted);

      // Log for visibility
      console.log(`Warm worker call took: ${elapsed}ms`);

      // Should be under 2 seconds for warm worker
      expect(elapsed).toBeLessThan(2000);
    }, 120000);
  });
});

// Placeholder test that always runs
describe('Sessions Integration Test Setup', () => {
  it('should have API key check', () => {
    if (!API_KEY) {
      console.log('⚠️  Skipping sessions integration tests - INFERENCE_API_KEY not set');
    }
    expect(true).toBe(true);
  });
});
