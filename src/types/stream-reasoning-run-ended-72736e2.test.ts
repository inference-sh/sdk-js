import { readFileSync } from 'fs';
import { join } from 'path';
import * as main from '../index.js';
import { chatReducer, initialState } from '../agent/reducer.js';
import {
  AgentRunStateCompleted,
  ChatEventTypeHook,
  ChatEventTypeRunEnded,
  ChatEventTypeRunFailed,
  ChatMessageContentTypeEvent,
  ChatMessageRoleEvent,
  InfraCloud,
  InfraPrivate,
  InfraPrivateFirst,
  InfraRemote,
  RunEndReasonNoReply,
  RunEndReasonOutputLimit,
  type ChatEventType,
  type ChatMessageDTO,
  type Infra,
  type RunEndReason,
} from '../types.js';

/**
 * Commit 72736e2: streamed reasoning in the agent reducer, plus types regen for
 * run_ended chat events, RunEndReason, and InfraRemote.
 */
describe('ChatEventTypeRunEnded and RunEndReason (72736e2)', () => {
  it('exports run_ended constants from types and the main barrel', () => {
    expect(ChatEventTypeRunEnded).toBe('run_ended');
    expect(main.ChatEventTypeRunEnded).toBe('run_ended');
    expect(RunEndReasonOutputLimit).toBe('output_limit');
    expect(RunEndReasonNoReply).toBe('no_reply');
    expect(main.RunEndReasonOutputLimit).toBe('output_limit');
    expect(main.RunEndReasonNoReply).toBe('no_reply');
  });

  it('keeps hook, run_failed, and run_ended distinct on ChatEventType', () => {
    const kinds: ChatEventType[] = [ChatEventTypeHook, ChatEventTypeRunFailed, ChatEventTypeRunEnded];
    expect(kinds).toEqual(['hook', 'run_failed', 'run_ended']);
    expect(new Set(kinds).size).toBe(3);
  });

  it('types run_ended event messages with ChatRunEvent on content.event.run', () => {
    const eventMessage: Pick<ChatMessageDTO, 'role' | 'content'> = {
      role: ChatMessageRoleEvent,
      content: [
        {
          type: ChatMessageContentTypeEvent,
          text: 'stopped by user',
          event: {
            type: ChatEventTypeRunEnded,
            run: {
              run_id: 'run-abc',
              state: AgentRunStateCompleted,
              reason: RunEndReasonNoReply,
            },
          },
        },
      ],
    };
    expect(eventMessage.content[0]?.event?.type).toBe('run_ended');
    expect(eventMessage.content[0]?.event?.run).toEqual({
      run_id: 'run-abc',
      state: AgentRunStateCompleted,
      reason: 'no_reply',
    });
    expect(eventMessage.content[0]?.event?.hook).toBeUndefined();
  });

  it('keeps RunEndReason literals stable for run_ended payloads', () => {
    const reasons: RunEndReason[] = [RunEndReasonOutputLimit, RunEndReasonNoReply];
    expect(reasons).toEqual(['output_limit', 'no_reply']);
  });
});

describe('InfraRemote (72736e2)', () => {
  it('exports InfraRemote from types and the main barrel', () => {
    expect(InfraRemote).toBe('remote');
    expect(main.InfraRemote).toBe('remote');
  });

  it('keeps infra literals including remote for task scheduling payloads', () => {
    const values: Infra[] = [InfraPrivate, InfraCloud, InfraPrivateFirst, InfraRemote];
    expect(values).toEqual(['private', 'cloud', 'private_first', 'remote']);
  });
});

describe('chat reducer run_ended event messages (72736e2)', () => {
  it('SET_CHAT keeps display-only run_ended event-role messages', () => {
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
          text: 'output limit reached',
          event: {
            type: ChatEventTypeRunEnded,
            run: {
              run_id: 'run-1',
              state: AgentRunStateCompleted,
              reason: RunEndReasonOutputLimit,
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
    expect(next.messages[0]?.content[0]?.event?.run?.reason).toBe('output_limit');
  });
});

describe('chatReducer interleaved text and reasoning streams (72736e2)', () => {
  const generating = (content: ChatMessageDTO['content']) =>
    ({ ...({ id: 'a1', order: 2, chat_id: 'c1' } as ChatMessageDTO), role: 'assistant', status: 'generating', content }) as ChatMessageDTO;
  const delta = (state: ReturnType<typeof chatReducer>, output: Record<string, string>) =>
    chatReducer(state, { type: 'DELTA_TOKEN', payload: { messageId: 'a1', output } });
  const block = (s: ReturnType<typeof chatReducer>, type: 'text' | 'reasoning') =>
    s.messages[0].content.find((c) => c.type === type)?.text;

  it('grows text and reasoning independently from the same delta sequence', () => {
    let s = chatReducer({ ...initialState, messages: [generating([])] }, { type: 'DELTA_TOKEN', payload: { messageId: 'a1', output: { response: '', reasoning: 'think' } } });
    s = delta(s, { response: 'Hi', reasoning: 'think' });
    expect(block(s, 'reasoning')).toBe('think');
    expect(block(s, 'text')).toBe('Hi');
    s = delta(s, { response: 'Hi there', reasoning: 'think harder' });
    expect(block(s, 'text')).toBe('Hi there');
    expect(block(s, 'reasoning')).toBe('think harder');
  });
});

describe('types.ts regen guards (72736e2)', () => {
  const typesSource = readFileSync(join(__dirname, '../types.ts'), 'utf8');

  it('adds run_ended to ChatEventType and exports RunEndReason constants', () => {
    expect(typesSource).toMatch(/export type ChatEventType = "hook" \| "run_failed" \| "run_ended";/);
    expect(typesSource).toMatch(/export const ChatEventTypeRunEnded: ChatEventType = "run_ended";/);
    expect(typesSource).toMatch(/export type RunEndReason = "output_limit" \| "no_reply";/);
    expect(typesSource).toMatch(/export interface ChatRunEvent/);
    expect(typesSource).toMatch(/run\?: ChatRunEvent;/);
  });

  it('adds InfraRemote to Infra and documents remote harness scheduling', () => {
    expect(typesSource).toMatch(/export type Infra = "private" \| "cloud" \| "private_first" \| "remote";/);
    expect(typesSource).toMatch(/export const InfraRemote: Infra = "remote";/);
    expect(typesSource).toMatch(/InfraRemote is a model call a harness on the caller's own remote/);
  });

  it('keeps reasoning on LLMDelta_fieldTags with concat merge', () => {
    expect(typesSource).toMatch(/reasoning: \{merge: "concat"\}/);
  });
});

describe('agent reducer streamed block guards (72736e2)', () => {
  const reducerSource = readFileSync(join(__dirname, '../agent/reducer.ts'), 'utf8');

  it('streams text and reasoning through shared streamedBlocks helpers', () => {
    expect(reducerSource).toMatch(/const streamedBlocks = \[/);
    expect(reducerSource).toMatch(/field: 'response'/);
    expect(reducerSource).toMatch(/field: 'reasoning', optional: true/);
    expect(reducerSource).toMatch(/function applyStreamedOutput/);
    expect(reducerSource).toMatch(/function keepStreamedBlocks/);
    expect(reducerSource).toMatch(/case 'DELTA_TOKEN':[\s\S]*applyStreamedOutput\(target, output\)/);
  });
});
