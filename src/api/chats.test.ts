import { HttpClient } from '../http/client';
import { ChatsAPI } from './chats';

const mockFetch = jest.fn();
global.fetch = mockFetch;

function mockJsonResponse(body: unknown) {
  mockFetch.mockResolvedValueOnce({
    ok: true,
    status: 200,
    text: () => Promise.resolve(JSON.stringify(body)),
  });
}

describe('ChatsAPI', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const api = () => new ChatsAPI(new HttpClient({ apiKey: 'test-key' }));

  it('should GET /chats/{id}/trace for getTrace()', async () => {
    const trace = { chat_id: 'chat-1', spans: [] };
    mockJsonResponse({ success: true, data: trace });

    const result = await api().getTrace('chat-1');

    expect(result).toEqual(trace);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/chats/chat-1/trace');
    expect(init.method).toBe('GET');
  });

  it('should DELETE /chats/{id} for delete()', async () => {
    mockJsonResponse({ success: true, data: null });

    await api().delete('chat-9');

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/chats/chat-9');
    expect(init.method).toBe('DELETE');
  });

  it('should POST /chats/list for list()', async () => {
    const page = { items: [{ id: 'chat-1' }], next_cursor: null };
    mockJsonResponse({ success: true, data: page });

    const result = await api().list({ limit: 25 });

    expect(result).toEqual(page);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/chats/list');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({ limit: 25 });
  });

  it('should GET /chats/{id} for get()', async () => {
    const chat = { id: 'chat-1', status: 'open' };
    mockJsonResponse({ success: true, data: chat });

    const result = await api().get('chat-1');

    expect(result).toEqual(chat);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/chats/chat-1');
    expect(init.method).toBe('GET');
  });

  it('should POST /chats/{id} for update()', async () => {
    const chat = { id: 'chat-1', name: 'Renamed' };
    mockJsonResponse({ success: true, data: chat });

    const result = await api().update('chat-1', { name: 'Renamed' });

    expect(result).toEqual(chat);
    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({ name: 'Renamed' });
  });
});
