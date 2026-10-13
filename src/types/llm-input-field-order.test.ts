import { readFileSync } from 'fs';
import { join } from 'path';
import {
  ChatMessageRoleAssistant,
  ChatMessageRoleUser,
  type LLMContextMessage,
  type LLMInput,
} from '../types.js';

const typesSource = readFileSync(join(__dirname, '..', 'types.ts'), 'utf8');

function declaredFieldOrder(interfaceBody: string): string[] {
  return [...interfaceBody.matchAll(/^\s+(\w+)\??:/gm)].map((m) => m[1]);
}

function indexBefore(fields: string[], earlier: string, later: string): void {
  expect(fields.indexOf(earlier)).toBeGreaterThanOrEqual(0);
  expect(fields.indexOf(later)).toBeGreaterThanOrEqual(0);
  expect(fields.indexOf(earlier)).toBeLessThan(fields.indexOf(later));
}

/**
 * types regen c92094d (gotypegen v0.8.6): LLMInput turn fields precede context;
 * LLMSettings lists system_prompt before sampling knobs so input forms match schema.
 */
describe('LLMInput turn envelope (c92094d)', () => {
  it('accepts a minimal provider task payload with turn before history', () => {
    const context: LLMContextMessage[] = [
      { role: ChatMessageRoleUser, text: 'Prior question' },
      { role: ChatMessageRoleAssistant, text: 'Prior answer' },
    ];

    const input: LLMInput = {
      text: 'Follow-up',
      context,
      role: ChatMessageRoleUser,
      system_prompt: 'You are helpful.',
      context_size: 8192,
    };

    expect(input.text).toBe('Follow-up');
    expect(input.context).toHaveLength(2);
    expect(input.system_prompt).toBe('You are helpful.');
  });

  it('keeps schema field order when building a literal (turn fields before settings)', () => {
    const ordered: LLMInput = {
      text: 'hello',
      images: ['img-1'],
      files: ['file-1'],
      attachments: [
        {
          id: 'att-1',
          uri: 'inference://files/att-1',
          filename: 'note.txt',
          content_type: 'text/plain',
        },
      ],
      context: [{ role: ChatMessageRoleUser, text: 'hi' }],
      role: ChatMessageRoleUser,
      reasoning: 'thought',
      tool_call_id: 'call-1',
      system_prompt: '',
      context_size: 4096,
      temperature: 0.2,
    };

    const keys = Object.keys(ordered);
    indexBefore(keys, 'text', 'context');
    indexBefore(keys, 'attachments', 'context');
    indexBefore(keys, 'tool_call_id', 'system_prompt');
    indexBefore(keys, 'system_prompt', 'context_size');
    indexBefore(keys, 'context_size', 'temperature');
  });
});

describe('types.ts regen guards for LLM field order (c92094d)', () => {
  it('documents schema-order on LLMSettings and puts system_prompt first', () => {
    const section = typesSource.match(
      /\/\*\*[\s\S]*?Field order is schema order[\s\S]*?export interface LLMSettings \{[\s\S]*?\n\}/,
    );
    expect(section).not.toBeNull();

    const block = section![0].match(/export interface LLMSettings \{[\s\S]*?\n\}/)!;
    const fields = declaredFieldOrder(block[0]);
    expect(fields[0]).toBe('system_prompt');
    indexBefore(fields, 'system_prompt', 'context_size');
    expect(fields).not.toContainEqual(undefined);
    expect(fields.filter((f) => f === 'system_prompt')).toHaveLength(1);
  });

  it('documents turn-before-settings on LLMInput and orders turn fields before context', () => {
    const section = typesSource.match(
      /\/\*\*[\s\S]*?turn comes first[\s\S]*?settings last[\s\S]*?export interface LLMInput extends LLMSettings \{[\s\S]*?\n\}/,
    );
    expect(section).not.toBeNull();

    const block = section![0].match(/export interface LLMInput extends LLMSettings \{[\s\S]*?\n\}/)!;
    const fields = declaredFieldOrder(block[0]);
    indexBefore(fields, 'text', 'images');
    indexBefore(fields, 'images', 'files');
    indexBefore(fields, 'files', 'attachments');
    indexBefore(fields, 'attachments', 'context');
    indexBefore(fields, 'context', 'role');
    indexBefore(fields, 'role', 'reasoning');
    indexBefore(fields, 'reasoning', 'tool_call_id');
  });
});
