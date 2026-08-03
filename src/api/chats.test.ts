import { HttpClient } from '../http/client';
import {
  AgentRunStateInputRequired,
  AgentRunStateWorking,
  ChatStatusBusy,
  GraphEdgeTypeInput,
  GraphEdgeTypeOutput,
  GraphEdgeTypeReferences,
  GraphEdgeTypeSupersedes,
  GraphNodeStatusCompleted,
  GraphNodeTypeResource,
  InterruptReasonToolApproval,
} from '../types';
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
    const trace = {
      graph_id: 'graph-1',
      nodes: [],
      edges: [],
      total_steps: 0,
      completed_steps: 0,
      running_steps: 0,
      failed_steps: 0,
    };
    mockJsonResponse(trace);

    const result = await api().getTrace('chat-1');

    expect(result).toEqual(trace);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/chats/chat-1/trace');
    expect(init.method).toBe('GET');
  });

  it('should preserve supersedes graph edges in getTrace() responses', async () => {
    const baseNode = {
      graph_id: 'graph-1',
      type: GraphNodeTypeResource,
      label: 'agent',
      resource_id: 'agent-1',
      resource_type: 'agent',
      status: GraphNodeStatusCompleted,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    };
    const trace = {
      graph_id: 'graph-1',
      nodes: [
        { ...baseNode, id: 'node-v1', short_id: 'nv1', label: 'v1.0.0' },
        { ...baseNode, id: 'node-v2', short_id: 'nv2', label: 'v2.0.0' },
      ],
      edges: [
        {
          id: 'edge-supersedes',
          short_id: 'es1',
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
          type: GraphEdgeTypeSupersedes,
          from_node: 'node-v1',
          to_node: 'node-v2',
        },
        {
          id: 'edge-ref',
          short_id: 'er1',
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
          type: GraphEdgeTypeReferences,
          from_node: 'node-v2',
          to_node: 'node-v1',
        },
      ],
      total_steps: 2,
      completed_steps: 2,
      running_steps: 0,
      failed_steps: 0,
    };
    mockJsonResponse(trace);

    const result = await api().getTrace('chat-1');

    expect(result.edges[0]?.type).toBe(GraphEdgeTypeSupersedes);
    expect(result.edges[0]?.from_node).toBe('node-v1');
    expect(result.edges[0]?.to_node).toBe('node-v2');
    expect(result.edges[1]?.type).toBe(GraphEdgeTypeReferences);
  });

  it('should preserve input and output graph edges in getTrace() responses', async () => {
    const baseNode = {
      graph_id: 'graph-1',
      type: GraphNodeTypeResource,
      label: 'step',
      resource_id: 'task-1',
      resource_type: 'task',
      status: GraphNodeStatusCompleted,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    };
    const trace = {
      graph_id: 'graph-1',
      nodes: [
        { ...baseNode, id: 'node-source', short_id: 'ns', label: 'source' },
        { ...baseNode, id: 'node-step', short_id: 'nst', label: 'transform' },
        { ...baseNode, id: 'node-sink', short_id: 'nsk', label: 'sink' },
      ],
      edges: [
        {
          id: 'edge-input',
          short_id: 'ei1',
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
          type: GraphEdgeTypeInput,
          from_node: 'node-source',
          to_node: 'node-step',
        },
        {
          id: 'edge-output',
          short_id: 'eo1',
          created_at: '2026-01-01T00:00:00Z',
          updated_at: '2026-01-01T00:00:00Z',
          type: GraphEdgeTypeOutput,
          from_node: 'node-step',
          to_node: 'node-sink',
        },
      ],
      total_steps: 3,
      completed_steps: 3,
      running_steps: 0,
      failed_steps: 0,
    };
    mockJsonResponse(trace);

    const result = await api().getTrace('chat-1');

    expect(result.edges[0]?.type).toBe(GraphEdgeTypeInput);
    expect(result.edges[0]?.from_node).toBe('node-source');
    expect(result.edges[0]?.to_node).toBe('node-step');
    expect(result.edges[1]?.type).toBe(GraphEdgeTypeOutput);
    expect(result.edges[1]?.from_node).toBe('node-step');
    expect(result.edges[1]?.to_node).toBe('node-sink');
  });

  it('should DELETE /chats/{id} for delete()', async () => {
    mockJsonResponse(null);

    await api().delete('chat-9');

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/chats/chat-9');
    expect(init.method).toBe('DELETE');
  });

  it('should POST /chats/list for list()', async () => {
    const page = { items: [{ id: 'chat-1' }], next_cursor: null };
    mockJsonResponse(page);

    const result = await api().list({ limit: 25 });

    expect(result).toEqual(page);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/chats/list');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body as string)).toEqual({ limit: 25 });
  });

  it('should GET /chats/{id} for get()', async () => {
    const chat = { id: 'chat-1', status: 'open' };
    mockJsonResponse(chat);

    const result = await api().get('chat-1');

    expect(result).toEqual(chat);
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/chats/chat-1');
    expect(init.method).toBe('GET');
  });

  it('should preserve active_run with interrupt details in get() responses', async () => {
    const chat = {
      id: 'chat-1',
      status: ChatStatusBusy,
      active_run: {
        id: 'run-1',
        agent_id: 'agent-1',
        chat_id: 'chat-1',
        state: AgentRunStateInputRequired,
        interrupt_reason: InterruptReasonToolApproval,
        interrupt_tool_id: 'tool-call-7',
      },
    };
    mockJsonResponse(chat);

    const result = await api().get('chat-1');

    expect(result.active_run?.state).toBe(AgentRunStateInputRequired);
    expect(result.active_run?.interrupt_reason).toBe(InterruptReasonToolApproval);
    expect(result.active_run?.interrupt_tool_id).toBe('tool-call-7');
  });

  it('should preserve agent_run_id on chat messages in get() responses', async () => {
    const chat = {
      id: 'chat-1',
      status: ChatStatusBusy,
      chat_messages: [
        {
          id: 'msg-1',
          chat_id: 'chat-1',
          agent_run_id: 'run-1',
          order: 1,
          status: 'ready',
          role: 'user',
          content: [{ type: 'text', text: 'Run this tool' }],
        },
      ],
      active_run: {
        id: 'run-1',
        agent_id: 'agent-1',
        chat_id: 'chat-1',
        state: AgentRunStateWorking,
      },
    };
    mockJsonResponse(chat);

    const result = await api().get('chat-1');

    expect(result.chat_messages[0]?.agent_run_id).toBe('run-1');
    expect(result.active_run?.state).toBe(AgentRunStateWorking);
  });

  it('should POST /chats/{id} for update()', async () => {
    const chat = { id: 'chat-1', name: 'Renamed' };
    mockJsonResponse(chat);

    const result = await api().update('chat-1', { name: 'Renamed' });

    expect(result).toEqual(chat);
    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toEqual({ name: 'Renamed' });
  });

  it('should GET /chats/{id}/status for getStatus()', async () => {
    mockJsonResponse({ status: 'busy' });

    const result = await api().getStatus('chat-1');

    expect(result).toEqual({ status: 'busy' });
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/chats/chat-1/status');
    expect(init.method).toBe('GET');
  });

  it('should POST /chats/{id}/stop for stop()', async () => {
    mockJsonResponse(null);

    await api().stop('chat-1');

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/chats/chat-1/stop');
    expect(init.method).toBe('POST');
  });

  it('should open SSE on /chats/{id}/stream for stream()', async () => {
    const http = new HttpClient({ apiKey: 'test-key' });
    const createEventSource = jest
      .spyOn(http, 'createEventSource')
      .mockResolvedValue(null);

    const chats = new ChatsAPI(http);
    await chats.stream('chat-42');

    expect(createEventSource).toHaveBeenCalledWith('/chats/chat-42/stream');
    createEventSource.mockRestore();
  });
});
