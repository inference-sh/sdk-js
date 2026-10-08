import { readFileSync } from 'fs';
import { join } from 'path';
import { Inference, HttpClient, type FailedRequest, type HttpFetchInit } from './index';
import type { AgentClient } from './agent/types';

const packageJson = JSON.parse(
  readFileSync(join(__dirname, '../package.json'), 'utf8')
) as { version: string };

const changelog = readFileSync(join(__dirname, '../CHANGELOG.md'), 'utf8');

const mockFetch = jest.fn();
global.fetch = mockFetch;

function assertAgentHttp(http: AgentClient['http']): void {
  expect(typeof http.request).toBe('function');
  expect(typeof http.fetch).toBe('function');
  expect(typeof http.getStreamDefault).toBe('function');
  expect(typeof http.getPollIntervalMs).toBe('function');
}

/**
 * Release daa9879 / changelog 2597bb7: v0.21.0 ships the http.fetch stack,
 * store/decision types, and breaking AgentClient + AppTag constant removals.
 */
describe('release v0.21.0 (daa9879)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('pins package.json to 0.21.0', () => {
    expect(packageJson.version).toBe('0.21.0');
  });

  it('documents 0.21.0 breaking changes and backfilled 0.19–0.20.1 changelog sections', () => {
    expect(changelog).toMatch(/## \[0\.21\.0\] - 2026-10-08/);
    expect(changelog).toMatch(
      /Breaking:.*`fetch`.*`AppTag\*`.*`StreamableManagerOptions`/s
    );
    expect(changelog).toMatch(/## \[0\.20\.1\] - 2026-10-08/);
    expect(changelog).toMatch(/## \[0\.20\.0\] - 2026-10-07/);
    expect(changelog).toMatch(/tasks\.files\(id\)/);
    expect(changelog).toMatch(/## \[0\.19\.0\] - 2026-10-04/);
  });

  it('exports HttpFetchInit and FailedRequest on the public barrel for custom streams', () => {
    const init: HttpFetchInit = { method: 'GET', headers: { Accept: 'text/plain' } };
    expect(init.method).toBe('GET');
    const failed: FailedRequest = { token: 'before-refresh' };
    expect(failed.token).toBe('before-refresh');
  });

  it('wires Inference.http.fetch through the shared HttpClient (AgentClient contract)', async () => {
    const response = { ok: true, status: 200 };
    mockFetch.mockResolvedValueOnce(response);

    const client = new Inference({ apiKey: 'release-key' });
    assertAgentHttp(client.http);

    await expect(client.http.fetch('/health')).resolves.toBe(response);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/health'),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer release-key',
        }),
      })
    );
  });

  it('keeps StreamableManagerOptions as a type alias (not an extendable interface)', () => {
    const source = readFileSync(join(__dirname, './http/streamable.ts'), 'utf8');
    expect(source).toMatch(/export type StreamableManagerOptions</);
    expect(source).not.toMatch(/export interface StreamableManagerOptions</);
  });

  it('requires fetch on AgentClient.http in agent/types.ts', () => {
    const source = readFileSync(join(__dirname, './agent/types.ts'), 'utf8');
    expect(source).toMatch(
      /http: Pick<HttpClient, 'request' \| 'fetch' \| 'getStreamDefault' \| 'getPollIntervalMs'>/
    );
  });

  it('does not export curated AppTag* constants removed in 0.21.0', async () => {
    const sdk = (await import('./index')) as Record<string, unknown>;
    expect(sdk.AppTagTextToImage).toBeUndefined();
    expect(sdk.AppTagTitleTextToImage).toBeUndefined();
    expect(new HttpClient({ apiKey: 'k' }).fetch).toEqual(expect.any(Function));
  });
});
