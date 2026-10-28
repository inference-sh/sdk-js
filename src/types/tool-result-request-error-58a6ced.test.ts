import { readFileSync } from 'fs';
import { join } from 'path';
import type { ClientToolResult } from '../tool-builder.js';
import type { ToolResultRequest } from '../types.js';

/**
 * 42e0216 / types regen 58a6ced: client tools fail via ToolResultRequest.error
 * instead of JSON error blobs in result. Handlers may return `{ error: string }`.
 */
describe('ToolResultRequest.error (58a6ced)', () => {
  it('types optional error on the tool result POST body', () => {
    const failure: ToolResultRequest = {
      result: '',
      error: 'node "x" does not exist',
    };
    const success: ToolResultRequest = { result: 'done' };
    expect(failure.error).toBe('node "x" does not exist');
    expect(success).not.toHaveProperty('error');
  });

  it('documents error on ToolResultRequest in generated types', () => {
    const src = readFileSync(join(__dirname, '../types.ts'), 'utf8');
    expect(src).toMatch(/export interface ToolResultRequest[\s\S]*error\?: string/);
    expect(src).toMatch(/completes as failed/);
    expect(src).toMatch(/reads Error in place of Result/);
  });

  it('allows ClientToolResult handlers to return { error }', () => {
    const outputs: ClientToolResult[] = [
      'plain text',
      { result: 'with files', attachments: [{ uri: 'https://cdn/x.png' }] },
      { error: 'missing handler' },
    ];
    expect(outputs[2]).toEqual({ error: 'missing handler' });
  });

  it('documents { error } on ClientToolResult in tool-builder', () => {
    const src = readFileSync(join(__dirname, '../tool-builder.ts'), 'utf8');
    expect(src).toMatch(/\{ error: string \}/);
    expect(src).toMatch(/error fails the/);
  });
});
