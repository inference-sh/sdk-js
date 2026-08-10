import { lifecycleHook, LifecycleHookBuilder } from './hook-builder';
import {
  HookEventAgentStart,
  HookEventTurnComplete,
  HookHandlerWebhook,
  HookHandlerTask,
} from './types';

describe('LifecycleHookBuilder', () => {
  describe('webhook handler', () => {
    it('produces correct LifecycleHookConfig', () => {
      const hook = lifecycleHook(HookEventAgentStart)
        .webhook('https://example.com/hook')
        .build();

      expect(hook).toEqual({
        event: 'agent.start',
        type: 'webhook',
        handler: 'https://example.com/hook',
        async: undefined,
        timeout: undefined,
      });
    });
  });

  describe('task handler', () => {
    it('uses HookHandlerTask type', () => {
      const hook = lifecycleHook(HookEventTurnComplete)
        .task('acme/validator@v1')
        .build();

      expect(hook.type).toBe(HookHandlerTask);
      expect(hook.handler).toBe('acme/validator@v1');
    });
  });

  describe('options', () => {
    it('includes async and timeout in output', () => {
      const hook = lifecycleHook(HookEventAgentStart)
        .webhook('https://example.com/hook')
        .async(true)
        .timeout(30)
        .build();

      expect(hook.async).toBe(true);
      expect(hook.timeout).toBe(30);
    });
  });

  describe('defaults', () => {
    it('defaults handler type to webhook', () => {
      const hook = lifecycleHook(HookEventAgentStart).build();
      expect(hook.type).toBe(HookHandlerWebhook);
    });
  });

  describe('chaining', () => {
    it('returns the builder from each setter', () => {
      const builder = lifecycleHook(HookEventAgentStart);

      expect(builder.webhook('https://example.com')).toBe(builder);
      // After switching to task, same instance is returned
      expect(builder.task('acme/agent@v1')).toBe(builder);
      expect(builder.async(true)).toBe(builder);
      expect(builder.timeout(60)).toBe(builder);
    });
  });
});
