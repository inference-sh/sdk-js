import { ToolTypeClient } from '../types';
import {
  isAdHocConfig,
  isTemplateConfig,
  isClientTool,
  extractToolSchemas,
  extractClientToolHandlers,
  type AdHocAgentConfig,
  type TemplateAgentConfig,
} from './types';

describe('agent/types helpers', () => {
  const adHocConfig: AdHocAgentConfig = {
    core_app: { ref: 'openrouter/claude@abc' },
    system_prompt: 'test',
  };

  const templateConfig: TemplateAgentConfig = {
    agent: 'acme/support@latest',
  };

  describe('isAdHocConfig', () => {
    it('returns true when core_app is present', () => {
      expect(isAdHocConfig(adHocConfig)).toBe(true);
    });

    it('returns false for template config', () => {
      expect(isAdHocConfig(templateConfig)).toBe(false);
    });
  });

  describe('isTemplateConfig', () => {
    it('returns true when agent reference is present', () => {
      expect(isTemplateConfig(templateConfig)).toBe(true);
    });

    it('returns false for ad-hoc config', () => {
      expect(isTemplateConfig(adHocConfig)).toBe(false);
    });
  });

  describe('isClientTool', () => {
    it('detects client tools with schema and handler', () => {
      const clientTool = {
        schema: { name: 'browser_tool', type: ToolTypeClient, description: 'x' },
        handler: jest.fn(),
      };
      expect(isClientTool(clientTool)).toBe(true);
    });

    it('returns false for plain AgentTool schemas', () => {
      expect(
        isClientTool({ name: 'server_tool', type: ToolTypeClient, description: 'x' })
      ).toBe(false);
    });
  });

  describe('extractToolSchemas', () => {
    it('unwraps client tools to schemas only', () => {
      const handler = jest.fn();
      const schemas = extractToolSchemas([
        { name: 'server', type: ToolTypeClient, description: 's' },
        {
          schema: { name: 'client', type: ToolTypeClient, description: 'c' },
          handler,
        },
      ]);

      expect(schemas).toEqual([
        { name: 'server', type: ToolTypeClient, description: 's' },
        { name: 'client', type: ToolTypeClient, description: 'c' },
      ]);
    });
  });

  describe('extractClientToolHandlers', () => {
    it('builds a name-to-handler map from mixed tools', () => {
      const handlerA = jest.fn();
      const handlerB = jest.fn();
      const map = extractClientToolHandlers([
        { name: 'ignored', type: ToolTypeClient, description: 'no handler' },
        {
          schema: { name: 'tool_a', type: ToolTypeClient, description: 'a' },
          handler: handlerA,
        },
        {
          schema: { name: 'tool_b', type: ToolTypeClient, description: 'b' },
          handler: handlerB,
        },
      ]);

      expect(map.size).toBe(2);
      expect(map.get('tool_a')).toBe(handlerA);
      expect(map.get('tool_b')).toBe(handlerB);
    });
  });
});
