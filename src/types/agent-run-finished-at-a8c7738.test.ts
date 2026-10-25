import { readFileSync } from 'fs';
import { join } from 'path';
import { chatReducer, initialState } from '../agent/reducer.js';
import {
  AgentRunStateCompleted,
  AgentRunStateWorking,
  ChatStatusBusy,
  type AgentRunDTO,
  type ChatDTO,
} from '../types.js';

/**
 * types regen a8c7738: AgentRunDTO may include optional finished_at (RFC3339)
 * when the run reaches a terminal state; absent while the run is in flight.
 */
describe('AgentRunDTO.finished_at (a8c7738)', () => {
  it('types optional terminal timestamp on completed runs', () => {
    const run: AgentRunDTO = {
      id: 'run-done',
      short_id: 'run-done',
      created_at: '2026-10-25T18:00:00Z',
      updated_at: '2026-10-25T18:05:00Z',
      agent_id: 'agent-1',
      chat_id: 'chat-1',
      state: AgentRunStateCompleted,
      finished_at: '2026-10-25T18:04:59Z',
      output: { ok: true },
    };
    expect(run.finished_at).toBe('2026-10-25T18:04:59Z');
    expect(run.updated_at).not.toBe(run.finished_at);
  });

  it('allows in-flight runs without finished_at', () => {
    const working: AgentRunDTO = {
      id: 'run-live',
      short_id: 'run-live',
      created_at: '2026-10-25T18:00:00Z',
      updated_at: '2026-10-25T18:01:00Z',
      agent_id: 'agent-1',
      chat_id: 'chat-1',
      state: AgentRunStateWorking,
    };
    expect(working).not.toHaveProperty('finished_at');
  });

  it('allows legacy completed payloads without finished_at', () => {
    const legacy: Pick<AgentRunDTO, 'state' | 'output'> = {
      state: AgentRunStateCompleted,
      output: {},
    };
    expect(legacy).not.toHaveProperty('finished_at');
  });

  it('types finished_at on chat.active_run for UI duration and history', () => {
    const chat: Pick<ChatDTO, 'id' | 'status' | 'active_run'> = {
      id: 'chat-1',
      status: ChatStatusBusy,
      active_run: {
        id: 'run-1',
        short_id: 'run-1',
        created_at: '2026-10-25T18:00:00Z',
        updated_at: '2026-10-25T18:02:00Z',
        agent_id: 'agent-1',
        chat_id: 'chat-1',
        state: AgentRunStateCompleted,
        finished_at: '2026-10-25T18:01:55Z',
      },
    };
    expect(chat.active_run?.finished_at).toBe('2026-10-25T18:01:55Z');
  });
});

describe('chat reducer AgentRunDTO.finished_at (a8c7738)', () => {
  const baseChat = {
    id: 'chat-1',
    status: ChatStatusBusy,
    chat_messages: [],
    active_run: {
      id: 'run-1',
      short_id: 'run-1',
      created_at: '2026-10-25T18:00:00Z',
      updated_at: '2026-10-25T18:01:00Z',
      agent_id: 'agent-1',
      chat_id: 'chat-1',
      state: AgentRunStateWorking,
    } as AgentRunDTO,
  } as ChatDTO;

  it('SET_CHAT keeps finished_at on active_run', () => {
    const chat = {
      ...baseChat,
      status: 'idle',
      active_run: {
        ...baseChat.active_run!,
        state: AgentRunStateCompleted,
        finished_at: '2026-10-25T18:03:00Z',
      },
    } as ChatDTO;

    const next = chatReducer(initialState, { type: 'SET_CHAT', payload: chat });

    expect(next.chat?.active_run?.finished_at).toBe('2026-10-25T18:03:00Z');
    expect(next.chat?.active_run?.state).toBe(AgentRunStateCompleted);
  });

  it('merges finished_at from a partial agent_runs update into the active run', () => {
    let state = chatReducer(initialState, { type: 'SET_CHAT', payload: baseChat });

    state = chatReducer(state, {
      type: 'UPDATE_ACTIVE_RUN',
      payload: {
        id: 'run-1',
        state: AgentRunStateCompleted,
        finished_at: '2026-10-25T18:03:30Z',
        output: { answer: 1 },
      } as AgentRunDTO,
      fields: ['id', 'state', 'finished_at', 'output'],
    });

    expect(state.chat?.active_run?.state).toBe(AgentRunStateCompleted);
    expect(state.chat?.active_run?.finished_at).toBe('2026-10-25T18:03:30Z');
    expect(state.chat?.active_run?.output).toEqual({ answer: 1 });
    expect(state.chat?.active_run?.agent_id).toBe('agent-1');
  });
});

describe('types.ts regen guards (a8c7738)', () => {
  const typesSource = readFileSync(join(__dirname, '../types.ts'), 'utf8');

  function interfaceBlock(name: string): string {
    const start = typesSource.indexOf(`export interface ${name}`);
    expect(start).toBeGreaterThanOrEqual(0);
    const slice = typesSource.slice(start);
    const end = slice.indexOf('\nexport ');
    return end === -1 ? slice : slice.slice(0, end);
  }

  it('documents FinishedAt on AgentRunDTO for terminal runs only', () => {
    const block = interfaceBlock('AgentRunDTO');
    expect(block).toMatch(/FinishedAt is when the run reached a terminal state/);
    expect(block).toMatch(/\bfinished_at\?: string/);
    expect(block).toMatch(/RFC3339/);
  });

  it('does not require finished_at on every AgentRunDTO payload', () => {
    const block = interfaceBlock('AgentRunDTO');
    expect(block).not.toMatch(/\bfinished_at: string/);
  });

  it('keeps finished_at on AgentRunDTO, not on unrelated run event DTOs only', () => {
    const runDto = interfaceBlock('AgentRunDTO');
    expect(runDto).toMatch(/\bfinished_at\?:/);

    const runEvent = interfaceBlock('ChatRunEvent');
    expect(runEvent).not.toMatch(/\bfinished_at\b/);
  });
});
