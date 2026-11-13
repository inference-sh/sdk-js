import type { InternalActions } from './types.js';
import { trackInternalActionsForStreaming } from './provider-client-bind.js';

function mockInternalActions(): InternalActions {
  return {
    streamChat: jest.fn(),
    stopStream: jest.fn(),
    setChatId: jest.fn(),
  };
}

describe('trackInternalActionsForStreaming', () => {
  it('does not stream when internal actions are unchanged', () => {
    const actions = mockInternalActions();
    expect(trackInternalActionsForStreaming(actions, actions, 'chat-1')).toBe(actions);
    expect(actions.streamChat).not.toHaveBeenCalled();
  });

  it('does not stream when actions were rebound but there is no active chat', () => {
    const first = mockInternalActions();
    const second = mockInternalActions();
    expect(trackInternalActionsForStreaming(first, second, null)).toBe(second);
    expect(second.streamChat).not.toHaveBeenCalled();
  });

  it('reopens the stream on the new actions when rebound with an active chat', () => {
    const first = mockInternalActions();
    const second = mockInternalActions();
    expect(trackInternalActionsForStreaming(first, second, 'chat-9')).toBe(second);
    expect(second.streamChat).toHaveBeenCalledWith('chat-9');
    expect(first.streamChat).not.toHaveBeenCalled();
  });
});
