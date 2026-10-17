import { readFileSync } from 'fs';
import { join } from 'path';
import * as main from '../index.js';
import {
  ChatMessageRoleCompaction,
  ChatMessageStatusReady,
  type ChatMessageDTO,
  type CompactionMeta,
} from '../types.js';

const typesSource = readFileSync(join(__dirname, '..', 'types.ts'), 'utf8');

/**
 * types regen a1cbcb4: compaction marker messages carry CompactionMeta on
 * ChatMessageDTO.compaction_meta.
 */
describe('CompactionMeta and compaction role (a1cbcb4)', () => {
  it('exports ChatMessageRoleCompaction from the main barrel', () => {
    expect(main.ChatMessageRoleCompaction).toBe('compaction');
    expect(ChatMessageRoleCompaction).toBe('compaction');
  });

  it('accepts compaction marker payloads with required counters and optional method', () => {
    const meta: CompactionMeta = {
      compacted_up_to_order: 42,
      compacted_count: 18,
      estimated_tokens: 12_400,
      method: 'llm',
      analysis: 'Summarized tool-heavy turns 5–22.',
    };

    const message: ChatMessageDTO = {
      id: 'msg-compact-1',
      user_id: 'user-1',
      team_id: 'team-1',
      visibility: 'private',
      chat_id: 'chat-1',
      order: 43,
      status: ChatMessageStatusReady,
      role: ChatMessageRoleCompaction,
      content: [{ type: 'text', text: 'Earlier context was compacted.' }],
      compaction_meta: meta,
    };

    expect(message.role).toBe('compaction');
    expect(message.compaction_meta?.compacted_up_to_order).toBe(42);
    expect(message.compaction_meta?.method).toBe('llm');
  });

  it('allows extractive compaction without analysis', () => {
    const meta: CompactionMeta = {
      compacted_up_to_order: 10,
      compacted_count: 4,
      estimated_tokens: 900,
      method: 'extractive',
    };

    expect(meta.analysis).toBeUndefined();
  });
});

describe('types.ts regen guards for compaction markers (a1cbcb4)', () => {
  it('declares compaction_meta on ChatMessageDTO', () => {
    const block = typesSource.match(
      /export interface ChatMessageDTO(?: extends [^{]+)? \{[\s\S]*?\n\}/
    );
    expect(block).not.toBeNull();
    expect(block![0]).toMatch(/compaction_meta\?: CompactionMeta;/);
    expect(block![0]).toMatch(/CompactionMeta is what a compaction \(role compaction\) retired/);
  });

  it('declares CompactionMeta with counters and optional method/analysis', () => {
    const block = typesSource.match(/export interface CompactionMeta \{[\s\S]*?\n\}/);
    expect(block).not.toBeNull();
    expect(block![0]).toMatch(/compacted_up_to_order: number/);
    expect(block![0]).toMatch(/compacted_count: number/);
    expect(block![0]).toMatch(/estimated_tokens: number/);
    expect(block![0]).toMatch(/method\?: string;/);
    expect(block![0]).toMatch(/"extractive" or "llm"/);
    expect(block![0]).toMatch(/analysis\?: string;/);
  });
});
