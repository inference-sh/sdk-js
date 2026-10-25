import { readFileSync } from 'fs';
import { join } from 'path';
import { chatReducer, initialState } from '../agent/reducer.js';
import {
  AgentRunStateCompleted,
  ChatEventTypeHook,
  ChatEventTypeRunEnded,
  ChatMessageContentTypeEvent,
  ChatMessageRoleEvent,
  HookEventAgentStart,
  HookHandlerWebhook,
  RunEndReasonNoReply,
  type ChatHookEvent,
  type ChatMessageDTO,
  type ChatRunEvent,
} from '../types.js';

/**
 * types regen 3da0f91: run_ended ChatRunEvent payloads may include optional
 * duration_ms (run wall time); hook events still use required duration_ms on
 * ChatHookEvent.
 */
describe('ChatRunEvent.duration_ms (3da0f91)', () => {
  it('types optional run duration on run_ended payloads', () => {
    const run: ChatRunEvent = {
      run_id: 'run-42',
      state: AgentRunStateCompleted,
      reason: RunEndReasonNoReply,
      duration_ms: 12_345,
    };
    expect(run.duration_ms).toBe(12_345);
  });

  it('allows run_ended events without duration_ms for older API rows', () => {
    const legacy: ChatRunEvent = {
      run_id: 'run-legacy',
      state: AgentRunStateCompleted,
    };
    expect(legacy).toEqual({
      run_id: 'run-legacy',
      state: AgentRunStateCompleted,
    });
    expect(legacy).not.toHaveProperty('duration_ms');
  });

  it('keeps hook handler duration required on ChatHookEvent, separate from run timing', () => {
    const hook: ChatHookEvent = {
      event: HookEventAgentStart,
      handler_type: HookHandlerWebhook,
      handler: 'hooks.example.com',
      duration_ms: 88,
    };
    const runEnded: ChatRunEvent = {
      run_id: 'run-1',
      state: AgentRunStateCompleted,
      duration_ms: 5_000,
    };
    expect(hook.duration_ms).toBe(88);
    expect(runEnded.duration_ms).toBe(5_000);
  });

  it('types run_ended event messages with duration_ms on content.event.run', () => {
    const eventMessage: Pick<ChatMessageDTO, 'role' | 'content'> = {
      role: ChatMessageRoleEvent,
      content: [
        {
          type: ChatMessageContentTypeEvent,
          text: 'run finished',
          event: {
            type: ChatEventTypeRunEnded,
            run: {
              run_id: 'run-abc',
              state: AgentRunStateCompleted,
              reason: RunEndReasonNoReply,
              duration_ms: 999,
            },
          },
        },
      ],
    };
    expect(eventMessage.content[0]?.event?.type).toBe('run_ended');
    expect(eventMessage.content[0]?.event?.run?.duration_ms).toBe(999);
    expect(eventMessage.content[0]?.event?.hook).toBeUndefined();
  });
});

describe('chat reducer run_ended duration_ms (3da0f91)', () => {
  it('SET_CHAT keeps display-only run_ended messages with run duration_ms', () => {
    const eventMessage = {
      id: 'msg-run-ended',
      short_id: 'msg-run-ended',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
      user_id: 'user-1',
      team_id: 'team-1',
      chat_id: 'chat-1',
      order: 1,
      role: ChatMessageRoleEvent,
      content: [
        {
          type: ChatMessageContentTypeEvent,
          text: 'completed',
          event: {
            type: ChatEventTypeRunEnded,
            run: {
              run_id: 'run-1',
              state: AgentRunStateCompleted,
              duration_ms: 4_200,
            },
          },
        },
      ],
    } as ChatMessageDTO;

    const chat = {
      id: 'chat-1',
      status: 'idle',
      chat_messages: [eventMessage],
    };

    const next = chatReducer(initialState, { type: 'SET_CHAT', payload: chat as never });

    expect(next.messages).toHaveLength(1);
    expect(next.messages[0]?.content[0]?.event?.run?.duration_ms).toBe(4_200);
  });
});

describe('types.ts regen guards (3da0f91)', () => {
  const typesSource = readFileSync(join(__dirname, '../types.ts'), 'utf8');

  function interfaceBlock(name: string): string {
    const start = typesSource.indexOf(`export interface ${name}`);
    expect(start).toBeGreaterThanOrEqual(0);
    const slice = typesSource.slice(start);
    const end = slice.indexOf('\nexport ');
    return end === -1 ? slice : slice.slice(0, end);
  }

  it('documents optional DurationMs on ChatRunEvent for run_ended events', () => {
    const block = interfaceBlock('ChatRunEvent');
    expect(block).toMatch(/DurationMs is how long the run took/);
    expect(block).toMatch(/\bduration_ms\?: number/);
  });

  it('does not move hook timing onto ChatRunEvent as a required field', () => {
    const runBlock = interfaceBlock('ChatRunEvent');
    expect(runBlock).not.toMatch(/\bduration_ms: number/);

    const hookBlock = interfaceBlock('ChatHookEvent');
    expect(hookBlock).toMatch(/\bduration_ms: number/);
  });

  it('keeps hook and run_ended event kinds separate on ChatEvent', () => {
    const block = interfaceBlock('ChatEvent');
    expect(block).toMatch(/\bhook\?: ChatHookEvent/);
    expect(block).toMatch(/\brun\?: ChatRunEvent/);
    expect(typesSource).toMatch(/ChatRunEvent is how a run ended, on a run_ended event/);
    expect(ChatEventTypeHook).toBe('hook');
    expect(ChatEventTypeRunEnded).toBe('run_ended');
  });
});
