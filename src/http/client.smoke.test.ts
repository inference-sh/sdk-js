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
    client = new Inference({ apiKey: getApiKey() });
  });

  it('GET /me returns user and team', async () => {
    const resp = await client.http.request<{ user: { id: string }; team: { username: string } }>('get', '/me');
    expect(resp.data.user).toBeDefined();
    expect(resp.data.user.id).toBeTruthy();
    expect(resp.data.team.username).toBeTruthy();
  });

  it('GET /plans returns array of plans', async () => {
    const resp = await client.http.request<Array<{ name: string }>>('get', '/plans');
    expect(Array.isArray(resp.data)).toBe(true);
    expect(resp.data.length).toBeGreaterThan(0);
    expect(resp.data[0].name).toBeTruthy();
  });

  it('POST /tasks/list returns cursor response', async () => {
    const resp = await client.http.request<{ items: unknown[]; has_next: boolean }>('post', '/tasks/list', { data: { limit: 1 } });
    expect(resp.data.items).toBeDefined();
    expect(Array.isArray(resp.data.items)).toBe(true);
  });

  it('GET /billing/balance returns balance', async () => {
    const resp = await client.http.request<{ balance: number }>('get', '/billing/balance');
    expect(typeof resp.data.balance).toBe('number');
  });

  it('GET /teams returns array', async () => {
    const resp = await client.http.request<Array<{ id: string }>>('get', '/teams');
    expect(Array.isArray(resp.data)).toBe(true);
    expect(resp.data.length).toBeGreaterThan(0);
  });
});
