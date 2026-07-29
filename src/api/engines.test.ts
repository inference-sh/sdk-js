import { HttpClient } from '../http/client';
import { EngineStatusRestarting, EngineStatusRunning } from '../types';
import { EnginesAPI } from './engines';

const mockFetch = jest.fn();
global.fetch = mockFetch;

function mockJsonResponse(body: unknown) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    status: 200,
    text: () => Promise.resolve(JSON.stringify(body)),
  });
}

function makeEngine(overrides: Record<string, unknown> = {}) {
  return {
    id: 'eng-1',
    short_id: 'eng1',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    user_id: 'user-1',
    team_id: 'team-1',
    visibility: 'private',
    name: 'local-engine',
    api_url: 'http://127.0.0.1:8080',
    status: EngineStatusRunning,
    engine_version: '2.4.1',
    config: {
      id: 'cfg-1',
      name: 'local-engine',
      api_url: 'http://127.0.0.1:8080',
      engine_port: '8080',
      workers: { gpu: [], cpu: { count: 4 } },
      api_key: 'secret',
      container_mode: false,
      network_name: 'default',
      cache_path: '/cache',
      gpus: [],
      callback_base_port: 9000,
      engine_internal_api_url: 'http://127.0.0.1:8081',
    },
    workers: [],
    ...overrides,
  };
}

describe('EnginesAPI', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const api = () => new EnginesAPI(new HttpClient({ apiKey: 'test-key' }));

  it('should POST resource ids for getForResources()', async () => {
    const engines = [makeEngine()];
    mockJsonResponse(engines);

    const result = await api().getForResources({
      app_ids: ['app-1'],
      agent_ids: ['agent-1'],
    });

    expect(result).toEqual(engines);
    expect(result[0]?.engine_version).toBe('2.4.1');
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/engines/resources');
    expect(JSON.parse(init.body as string)).toEqual({
      app_ids: ['app-1'],
      agent_ids: ['agent-1'],
    });
  });

  it('should POST /engines/{id}/stop for stop()', async () => {
    mockJsonResponse(null);

    await api().stop('eng-1');

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/engines/eng-1/stop');
    expect(init.method).toBe('POST');
  });

  it('should POST /engines/{id}/restart for restart()', async () => {
    mockJsonResponse(null);

    await api().restart('eng-1');

    const [url] = mockFetch.mock.calls[0] as [string];
    expect(url).toContain('/engines/eng-1/restart');
  });

  it('should open SSE on /engines/{id}/stream for stream()', async () => {
    const http = new HttpClient({ apiKey: 'test-key' });
    const createEventSource = jest
      .spyOn(http, 'createEventSource')
      .mockResolvedValue(null);

    const engines = new EnginesAPI(http);
    await engines.stream('eng-7');

    expect(createEventSource).toHaveBeenCalledWith('/engines/eng-7/stream');
    createEventSource.mockRestore();
  });

  it('should POST /engines/list for list()', async () => {
    const page = { items: [makeEngine()], next_cursor: null };
    mockJsonResponse(page);

    const result = await api().list();

    expect(result).toEqual(page);
    expect(result.items[0]?.engine_version).toBe('2.4.1');
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/engines/list');
    expect(init.method).toBe('POST');
  });

  it('should GET /engines/{id} for get()', async () => {
    const engine = makeEngine();
    mockJsonResponse(engine);

    const result = await api().get('eng-1');

    expect(result).toEqual(engine);
    expect(result.engine_version).toBe('2.4.1');
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/engines/eng-1');
    expect(init.method).toBe('GET');
  });

  it('should POST /engines for create()', async () => {
    const engine = { id: 'eng-new', name: 'worker' };
    mockJsonResponse(engine);

    const result = await api().create({ name: 'worker' });

    expect(result).toEqual(engine);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/engines');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({ name: 'worker' });
  });

  it('should POST /engines/{id} for update()', async () => {
    const engine = { id: 'eng-1', name: 'updated' };
    mockJsonResponse(engine);

    const result = await api().update('eng-1', { name: 'updated' });

    expect(result).toEqual(engine);
    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({ name: 'updated' });
  });

  it('should DELETE /engines/{id} for delete()', async () => {
    mockJsonResponse(null);

    await api().delete('eng-1');

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/engines/eng-1');
    expect(init.method).toBe('DELETE');
  });

  it('should POST visibility for updateVisibility()', async () => {
    const engine = { id: 'eng-1', visibility: 'team' };
    mockJsonResponse(engine);

    await api().updateVisibility('eng-1', 'team');

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({ visibility: 'team' });
  });

  it('should POST transfer with team_id for transferOwnership()', async () => {
    const engine = { id: 'eng-1' };
    mockJsonResponse(engine);

    await api().transferOwnership('eng-1', 'team-7');

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({ team_id: 'team-7' });
  });

  it('should POST /engines/{id}/extend for extend()', async () => {
    mockJsonResponse(null);

    await api().extend('eng-1');

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/engines/eng-1/extend');
    expect(init.method).toBe('POST');
  });

  it('should POST /engines/{id}/drain for drain()', async () => {
    mockJsonResponse(null);

    await api().drain('eng-1');

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/engines/eng-1/drain');
    expect(init.method).toBe('POST');
  });

  it('should POST /engines/{id}/update for updateBinary()', async () => {
    mockJsonResponse(null);

    await api().updateBinary('eng-1');

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/engines/eng-1/update');
    expect(init.method).toBe('POST');
  });

  it('should preserve restarting status on get() during engine restart transitions', async () => {
    const engine = makeEngine({ status: EngineStatusRestarting });
    mockJsonResponse(engine);

    const result = await api().get('eng-1');

    expect(result.status).toBe(EngineStatusRestarting);
  });

  it('should preserve restarting status in list() responses', async () => {
    const page = {
      items: [makeEngine({ status: EngineStatusRestarting })],
      next_cursor: null,
    };
    mockJsonResponse(page);

    const result = await api().list();

    expect(result.items[0]?.status).toBe(EngineStatusRestarting);
  });

  it('should preserve top-level engine_version independently of system_info.engine_version', async () => {
    const engine = makeEngine({
      engine_version: '3.0.0',
      system_info: {
        hostname: 'node-1',
        engine_version: '2.9.9',
        ipv4: '10.0.0.1',
        ipv6: '::1',
        mac_address: 'aa:bb:cc:dd:ee:ff',
        os: 'linux',
        docker: { binary_path: '', installed: false, socket_path: '' },
        wsl2: { installed: false },
        cpus: [],
        ram: { total: 0, used: 0 },
        volumes: [],
        hf_cache: { path: '', size: 0 },
        gpus: [],
      },
    });
    mockJsonResponse(engine);

    const result = await api().get('eng-1');

    expect(result.engine_version).toBe('3.0.0');
    expect(result.system_info?.engine_version).toBe('2.9.9');
  });
});
