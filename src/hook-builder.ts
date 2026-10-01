/**
 * Hook Builder - Fluent API for defining lifecycle hooks
 */

import {
  LifecycleHookConfig,
  HookEvent,
  HookHandlerType,
  HookHandlerWebhook,
  HookHandlerTask,
  HookHandlerBuiltin,
  BuiltinHook,
  BuiltinHookBeltSuggest,
  BuiltinHookBeltExtract,
  HookEventTurnStart,
  HookEventAgentComplete,
  HookEventPreCompact,
} from './types';

// =============================================================================
// Hook Builder
// =============================================================================

export class LifecycleHookBuilder {
  private event: HookEvent;
  private handlerType: HookHandlerType = HookHandlerWebhook;
  private handlerRef = '';
  private isAsync?: boolean;
  private timeoutSeconds?: number;

  constructor(event: HookEvent) {
    this.event = event;
  }

  /** Set handler to a webhook URL */
  webhook(url: string): this {
    this.handlerType = HookHandlerWebhook;
    this.handlerRef = url;
    return this;
  }

  /** Set handler to a task (agent ref) */
  task(agentRef: string): this {
    this.handlerType = HookHandlerTask;
    this.handlerRef = agentRef;
    return this;
  }

  /** Set handler to a builtin the platform runs itself (e.g. belt:suggest) */
  builtin(name: BuiltinHook): this {
    this.handlerType = HookHandlerBuiltin;
    this.handlerRef = name;
    return this;
  }

  /** Set async execution */
  async(enabled: boolean): this {
    this.isAsync = enabled;
    return this;
  }

  /** Set handler timeout in seconds */
  timeout(seconds: number): this {
    this.timeoutSeconds = seconds;
    return this;
  }

  build(): LifecycleHookConfig {
    return {
      event: this.event,
      type: this.handlerType,
      handler: this.handlerRef,
      async: this.isAsync,
      timeout: this.timeoutSeconds,
    };
  }
}

// =============================================================================
// Public API
// =============================================================================

/** Create a lifecycle hook for an agent event */
export const lifecycleHook = (event: HookEvent) => new LifecycleHookBuilder(event);

/**
 * The built-in learning hooks, attached to the events each one runs on.
 * - `suggest`: before each turn, add the team's matching skills, knowledge and apps to context.
 * - `learn`: every 10th user turn and before compaction, save reusable knowledge from the
 *   conversation to the team's registry, deduplicated. Runs on the agent's own model, and only
 *   for chats by the agent's owning team.
 */
export function learningHooks(opts: { suggest?: boolean; learn?: boolean }): LifecycleHookConfig[] {
  const hooks: LifecycleHookConfig[] = [];
  if (opts.suggest) {
    hooks.push(lifecycleHook(HookEventTurnStart).builtin(BuiltinHookBeltSuggest).build());
  }
  if (opts.learn) {
    for (const event of [HookEventAgentComplete, HookEventPreCompact]) {
      hooks.push(lifecycleHook(event).builtin(BuiltinHookBeltExtract).build());
    }
  }
  return hooks;
}
