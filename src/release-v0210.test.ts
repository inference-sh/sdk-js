import { Inference, HttpClient } from './index';
import type { AgentClient } from './agent/types';

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

  it('does not export curated AppTag* constants removed in 0.21.0', async () => {
    const sdk = (await import('./index')) as Record<string, unknown>;
    expect(sdk.AppTagTextToImage).toBeUndefined();
    expect(sdk.AppTagTitleTextToImage).toBeUndefined();
    expect(new HttpClient({ apiKey: 'k' }).fetch).toEqual(expect.any(Function));
  });
});
