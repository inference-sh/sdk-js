import * as main from '../index.js';
import {
  ChatOriginUI,
  ChatOriginAPI,
  ChatOriginTrigger,
  ChatOriginIntegration,
  ChatOriginOpenAIClient,
  ChatOriginEmbed,
  ChatOriginHook,
  ChatOriginSubagent,
  ChatOriginBranch,
} from '../types.js';

/** types regen 272d91f: ChatOrigin + ChatDTO.origin */
describe('ChatOrigin constants (272d91f)', () => {
  it('exports each constant with its correct string value', () => {
    expect(ChatOriginUI).toBe('ui');
    expect(ChatOriginAPI).toBe('api');
    expect(ChatOriginTrigger).toBe('trigger');
    expect(ChatOriginIntegration).toBe('integration');
    expect(ChatOriginOpenAIClient).toBe('openai_client');
    expect(ChatOriginEmbed).toBe('embed');
    expect(ChatOriginHook).toBe('hook');
    expect(ChatOriginSubagent).toBe('subagent');
    expect(ChatOriginBranch).toBe('branch');
  });

  it('re-exports all ChatOrigin constants from the main barrel', () => {
    expect(main.ChatOriginUI).toBe('ui');
    expect(main.ChatOriginAPI).toBe('api');
    expect(main.ChatOriginTrigger).toBe('trigger');
    expect(main.ChatOriginIntegration).toBe('integration');
    expect(main.ChatOriginOpenAIClient).toBe('openai_client');
    expect(main.ChatOriginEmbed).toBe('embed');
    expect(main.ChatOriginHook).toBe('hook');
    expect(main.ChatOriginSubagent).toBe('subagent');
    expect(main.ChatOriginBranch).toBe('branch');
  });
});
