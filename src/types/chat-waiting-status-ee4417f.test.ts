import { readFileSync } from 'fs';
import { join } from 'path';
import * as main from '../index.js';
import { chatReducer, initialState } from '../agent/reducer.js';
import {
  AgentRunStateAuthRequired,
  AgentRunStateInputRequired,
  ChatStatusAwaitingInput,
  ChatStatusWaiting,
  InterruptReasonWait,
  type AgentRunDTO,
  type ChatDTO,
  type ChatStatus,
} from '../types.js';
import { isAwaitingHuman, isChatBusy, isRunWaiting } from '../utils.js';

/**
 * ee4417f: chat waiting status — run paused on the agent's own wait call.
 */
describe('isRunWaiting and chat busy/human predicates (ee4417f)', () => {
  const waitRun = {
    state: AgentRunStateInputRequired,
    interrupt_reason: InterruptReasonWait,
  } as AgentRunDTO;

  it('exports isRunWaiting and ChatStatusWaiting from the main barrel', () => {
    expect(main.isRunWaiting).toBe(isRunWaiting);
    expect(main.ChatStatusWaiting).toBe('waiting');
  });

  it('isRunWaiting only when interrupted with InterruptReasonWait', () => {
    expect(isRunWaiting(waitRun)).toBe(true);
    expect(isRunWaiting({ state: AgentRunStateAuthRequired, interrupt_reason: InterruptReasonWait } as AgentRunDTO)).toBe(
      true,
    );
    expect(isRunWaiting({ state: AgentRunStateInputRequired } as AgentRunDTO)).toBe(false);
    expect(isRunWaiting({ state: AgentRunStateInputRequired, interrupt_reason: 'tool_approval' } as AgentRunDTO)).toBe(
      false,
    );
    expect(isRunWaiting(null)).toBe(false);
    expect(isRunWaiting(undefined)).toBe(false);
  });

  it('keeps a wait pause busy but not awaiting a human (active_run wins over chat.status)', () => {
    const chat = {
      active_run: waitRun,
      status: 'awaiting_input',
    } as unknown as ChatDTO;
    expect(isChatBusy(chat)).toBe(true);
    expect(isAwaitingHuman(chat)).toBe(false);
  });

  it('still treats chat.status=waiting as busy when there is no active_run', () => {
    expect(isChatBusy({ status: ChatStatusWaiting } as unknown as ChatDTO)).toBe(true);
    expect(isAwaitingHuman({ status: ChatStatusWaiting } as unknown as ChatDTO)).toBe(false);
  });
});

describe('deriveChatStatus waiting before awaiting_input (ee4417f)', () => {
  it('UPDATE_ACTIVE_RUN maps auth_required + wait to waiting, not awaiting_input', () => {
    const chat = { id: 'chat-1', status: 'busy' } as ChatDTO;
    const state = chatReducer(initialState, { type: 'SET_CHAT', payload: chat });
    const next = chatReducer(state, {
      type: 'UPDATE_ACTIVE_RUN',
      payload: { state: AgentRunStateAuthRequired, interrupt_reason: InterruptReasonWait } as AgentRunDTO,
    });
    expect(next.chat?.status).toBe(ChatStatusWaiting);
    expect(next.chat?.status).not.toBe(ChatStatusAwaitingInput);
  });
});

describe('types.ts regen guards (ee4417f)', () => {
  const typesSource = readFileSync(join(__dirname, '../types.ts'), 'utf8');

  it('adds waiting to ChatStatus and documents ChatStatusWaiting', () => {
    expect(typesSource).toMatch(
      /export type ChatStatus =[\s\S]*\| "awaiting_input"[\s\S]*\| "waiting"[\s\S]*\| "completed"/,
    );
    expect(typesSource).toMatch(/export const ChatStatusWaiting: ChatStatus = "waiting";/);
    expect(typesSource).toMatch(/ChatStatusWaiting: the run is paused on the agent's own wait call/);
  });

  it('types ChatDTO.status as waiting for projected chat rows', () => {
    const status: ChatStatus = ChatStatusWaiting;
    expect(status).toBe('waiting');
  });
});

describe('reducer deriveChatStatus ordering (ee4417f)', () => {
  const reducerSource = readFileSync(join(__dirname, '../agent/reducer.ts'), 'utf8');

  it('checks isRunWaiting before isRunInterrupted so wait is not awaiting_input', () => {
    const derive = reducerSource.match(/function deriveChatStatus[\s\S]*?^}/m)?.[0] ?? '';
    expect(derive.indexOf('isRunWaiting')).toBeGreaterThan(-1);
    expect(derive.indexOf('isRunWaiting')).toBeLessThan(derive.indexOf('isRunInterrupted'));
  });
});
