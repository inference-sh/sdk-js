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

  it('should POST /chats/list for list()', async () => {
    const chats = { items: [{ id: 'chat-1' }], next_cursor: null };
    mockJsonResponse({ success: true, data: chats });

    const result = await api().list({ limit: 5 });

    expect(result).toEqual(chats);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/chats/list');
    expect(JSON.parse(init.body as string)).toEqual({ limit: 5 });
  });

  it('should GET /chats/{id} for get()', async () => {
    const chat = { id: 'chat-1' };
    mockJsonResponse({ success: true, data: chat });

    const result = await api().get('chat-1');

    expect(result).toEqual(chat);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/chats/chat-1');
    expect(init.method).toBe('GET');
  });

  it('should POST /chats/{id} for update()', async () => {
    const chat = { id: 'chat-1', name: 'renamed' };
    mockJsonResponse({ success: true, data: chat });

    await api().update('chat-1', { name: 'renamed' });

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({ name: 'renamed' });
  });

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
});
