import { readFileSync } from 'fs';
import { join } from 'path';
import type { FileRef, ToolResultRequest } from '../types.js';

/**
 * v0.24.0: client tool results may include uploaded file refs on POST /tools/{id}.
 * ToolResultRequest.attachments was added by hand until the next types regen.
 */
describe('ToolResultRequest.attachments (v0.24.0)', () => {
  it('accepts optional attachments on the request body type', () => {
    const plain: ToolResultRequest = { result: 'done' };
    const ref: FileRef = {
      id: 'f1',
      uri: 'inf://files/f1',
      filename: 'shot.png',
      content_type: 'image/png',
    };
    const withFiles: ToolResultRequest = { result: 'see image', attachments: [ref] };

    expect(plain.attachments).toBeUndefined();
    expect(withFiles.attachments).toEqual([ref]);
  });

  it('keeps attachments on ToolResultRequest in types.ts after regen', () => {
    const source = readFileSync(join(__dirname, '../types.ts'), 'utf8');
    const block = source.match(/export interface ToolResultRequest \{[\s\S]*?\n\}/);
    expect(block).not.toBeNull();
    expect(block![0]).toMatch(/attachments\?: FileRef\[\]/);
    expect(block![0]).toMatch(/POST \/files/);
  });
});
