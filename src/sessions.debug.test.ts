/**
 * Debug test for session_id
 * @jest-environment node
 */

import { Inference } from './index';
import { TaskStatusCompleted } from './types';

const API_KEY = process.env.INFERENCE_API_KEY;
const BASE_URL = process.env.INFERENCE_BASE_URL || 'https://api.inference.sh';
const SESSION_TEST_APP = 'infsh/session-test';

const describeIfApiKey = API_KEY ? describe : describe.skip;

describeIfApiKey('Debug session_id', () => {
  let client: Inference;

  beforeAll(() => {
    client = new Inference({
      apiKey: API_KEY!,
      baseUrl: BASE_URL,
    });
  });

  it('should log session_id from updates and result', async () => {
    const updates: any[] = [];

    const result = await client.run({
      app: SESSION_TEST_APP,
      function: 'set_value',
      input: { key: 'debug', value: 'test' },
      session: 'new',
    }, {
      onUpdate: (update) => {
        updates.push({
          status: update.status,
          session_id: update.session_id,
          hasSessionId: 'session_id' in update,
        });
      }
    });

    console.log('UPDATES:', JSON.stringify(updates, null, 2));
    console.log('RESULT keys:', Object.keys(result));
    console.log('RESULT session_id:', result.session_id);
    console.log('RESULT status:', result.status);

    expect(result.status).toBe(TaskStatusCompleted);
  }, 60000);
});
