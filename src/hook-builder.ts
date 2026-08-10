/**
 * Hook Builder - Fluent API for defining lifecycle hooks
 */

import { LifecycleHookConfig, HookEvent, HookHandlerType, HookHandlerWebhook, HookHandlerTask } from './types';

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
