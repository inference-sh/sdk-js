import type { InternalActions } from './types.js';

/**
 * Remember the current internal actions and reopen streaming when they are
 * rebound (for example after `AgentChatProvider` gets a new `client` prop).
 */
export function trackInternalActionsForStreaming(
  previous: InternalActions,
  next: InternalActions,
  activeChatId: string | null,
): InternalActions {
  if (previous === next) return next;
  if (activeChatId) next.streamChat(activeChatId);
  return next;
}
