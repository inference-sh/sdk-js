import { readFileSync } from 'fs';
import { join } from 'path';
import * as main from '../index.js';
import {
  ContentGuardAnnotate,
  ContentGuardOff,
  ContentGuardShadow,
  ContentGuardStrict,
  ContentTierContent,
  ContentTierInternal,
  ContentTierThirdParty,
  type AgentConfigInput,
  type AgentTool,
  type AgentToolDTO,
  type AgentVersionDTO,
  type ContentGuardConfig,
  type ContentGuardMode,
  type ContentTier,
} from '../types.js';

const typesSource = readFileSync(join(__dirname, '../types.ts'), 'utf8');

/**
 * Types regen 4087e83: tool-result content guard (content_guard on agents,
 * content_tier on tools) for shadow/annotate/strict scanning before the model reads tool output.
 */
describe('content guard and content tier types (4087e83)', () => {
  it('exports ContentGuardMode constants from the main barrel', () => {
    expect(ContentGuardShadow).toBe('shadow');
    expect(ContentGuardOff).toBe('off');
    expect(ContentGuardAnnotate).toBe('annotate');
    expect(ContentGuardStrict).toBe('strict');
    expect(main.ContentGuardShadow).toBe('shadow');
    expect(main.ContentGuardOff).toBe('off');
    expect(main.ContentGuardAnnotate).toBe('annotate');
    expect(main.ContentGuardStrict).toBe('strict');
  });

  it('keeps ContentGuardMode literals stable for agent version payloads', () => {
    const modes: ContentGuardMode[] = [
      ContentGuardShadow,
      ContentGuardOff,
      ContentGuardAnnotate,
      ContentGuardStrict,
    ];
    expect(modes).toEqual(['shadow', 'off', 'annotate', 'strict']);
  });

  it('exports ContentTier constants from the main barrel', () => {
    expect(ContentTierInternal).toBe('internal');
    expect(ContentTierContent).toBe('content');
    expect(ContentTierThirdParty).toBe('third_party');
    expect(main.ContentTierInternal).toBe('internal');
    expect(main.ContentTierContent).toBe('content');
    expect(main.ContentTierThirdParty).toBe('third_party');
  });

  it('keeps ContentTier literals stable for per-tool guard overrides', () => {
    const tiers: ContentTier[] = [
      ContentTierInternal,
      ContentTierContent,
      ContentTierThirdParty,
    ];
    expect(tiers).toEqual(['internal', 'content', 'third_party']);
  });

  it('types ContentGuardConfig on agent create/update and version DTOs', () => {
    const guard: ContentGuardConfig = {
      mode: ContentGuardStrict,
      ignore_rules: ['INF-PI-005'],
    };

    const version: Pick<AgentVersionDTO, 'content_guard'> = { content_guard: guard };
    const input: Pick<AgentConfigInput, 'content_guard'> = { content_guard: guard };

    expect(version.content_guard?.mode).toBe('strict');
    expect(version.content_guard?.ignore_rules).toEqual(['INF-PI-005']);
    expect(input.content_guard).toEqual(guard);
  });

  it('types optional content_tier on AgentTool and AgentToolDTO schemas', () => {
    const tool: Pick<AgentTool, 'name' | 'type' | 'content_tier'> = {
      name: 'slack_read',
      type: 'mcp',
      content_tier: ContentTierThirdParty,
    };
    const dto: Pick<AgentToolDTO, 'name' | 'type' | 'content_tier'> = {
      name: 'knowledge_search',
      type: 'app',
      content_tier: ContentTierContent,
    };

    expect(tool.content_tier).toBe('third_party');
    expect(dto.content_tier).toBe('content');
  });

  it('documents default shadow mode and ignore_rules on content_guard in types.ts', () => {
    expect(typesSource).toMatch(/content_guard\?: ContentGuardConfig;/);
    expect(typesSource).toMatch(/content_tier\?: ContentTier;/);
    expect(typesSource).toMatch(/export type ContentGuardMode = "shadow" \| "off" \| "annotate" \| "strict";/);
    expect(typesSource).toMatch(/export type ContentTier = "internal" \| "content" \| "third_party";/);
    expect(typesSource).toMatch(/ignore_rules\?: string\[\];/);
    expect(typesSource).toMatch(/ContentGuardShadow scans and logs/);
  });
});
