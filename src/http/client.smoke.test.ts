/**
 * Smoke tests against the live API to verify V3 envelope parsing end-to-end.
 *
 * Run with: INFERENCE_SMOKE=1 npx jest --testPathPattern=smoke
 * Uses INFERENCE_API_KEY env var, or falls back to session token from CLI config.
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const SMOKE = process.env.INFERENCE_SMOKE === '1';
const describeSmoke = SMOKE ? describe : describe.skip;

function getApiKey(): string {
  if (process.env.INFERENCE_API_KEY) return process.env.INFERENCE_API_KEY;
  const configPath = path.join(os.homedir(), '.inferencesh', 'config.json');
  try {
    const cfg = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    return cfg.session_token || cfg.api_key || '';
  } catch {
    return '';
  }
}

import { Inference } from '../index';

describeSmoke('Smoke: V3 envelope against live API', () => {
  let client: Inference;

  beforeAll(() => {
    const apiKey = getApiKey();
    if (!apiKey) {
      throw new Error('INFERENCE_API_KEY or ~/.inferencesh/config.json required for smoke tests');
    }
    client = new Inference({ apiKey });
  });

  it('GET /me returns user and team', async () => {
    const me = await client.http.request<{ user: { id: string }; team: { username: string } }>('get', '/me');
    expect(me.user).toBeDefined();
    expect(me.user.id).toBeTruthy();
    expect(me.team.username).toBeTruthy();
  });

  it('GET /plans returns array of plans', async () => {
    const plans = await client.http.request<Array<{ name: string }>>('get', '/plans');
    expect(Array.isArray(plans)).toBe(true);
    expect(plans.length).toBeGreaterThan(0);
    expect(plans[0].name).toBeTruthy();
  });

  it('POST /tasks/list returns cursor response', async () => {
    const result = await client.http.request<{ items: unknown[]; has_next: boolean }>('post', '/tasks/list', { data: { limit: 1 } });
    expect(result.items).toBeDefined();
    expect(Array.isArray(result.items)).toBe(true);
  });

  it('GET /billing/balance returns balance', async () => {
    const result = await client.http.request<{ balance: number }>('get', '/billing/balance');
    expect(typeof result.balance).toBe('number');
  });

  it('GET /teams returns array', async () => {
    const teams = await client.http.request<Array<{ id: string }>>('get', '/teams');
    expect(Array.isArray(teams)).toBe(true);
    expect(teams.length).toBeGreaterThan(0);
  });
});
