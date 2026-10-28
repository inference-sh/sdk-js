import { readFileSync } from 'fs';
import { join } from 'path';
import { resolveUpload } from './api/files.js';

/**
 * a87a76d: POST /files rejected data URI and bare base64 uploads because
 * resolveUpload omitted size (only Blob uploads sent file.size). The API
 * requires size on create.
 */
describe('files upload size (a87a76d)', () => {
  const filesSource = readFileSync(join(__dirname, 'api/files.ts'), 'utf8');

  it('derives size from the normalised PUT body, not only from Blob inputs', () => {
    expect(filesSource).toMatch(/size:\s*body\.size/);
    expect(filesSource).not.toMatch(/size:\s*data instanceof Blob \? data\.size : undefined/);
  });

  it('resolveUpload sets size to decoded byte length for every string encoding', () => {
    const cases: Array<{ label: string; input: string; expected: number }> = [
      { label: 'base64 data URI', input: 'data:text/plain;base64,aGVsbG8=', expected: 5 },
      { label: 'bare base64', input: 'aGVsbG8=', expected: 5 },
      { label: 'URL-encoded data URI', input: 'data:text/plain,Hello%20World', expected: 11 },
      {
        label: 'URL-safe base64 data URI (Hello)',
        input: 'data:text/plain;base64,SGVsbG8',
        expected: 5,
      },
    ];

    for (const { input, expected } of cases) {
      const resolved = resolveUpload(input);
      expect(resolved.size).toBe(expected);
      expect(resolved.body.size).toBe(expected);
    }
  });

  it('resolveUpload keeps Blob size aligned with body.size', () => {
    const blob = new Blob(['jpeg-bytes'], { type: 'image/jpeg' });
    const resolved = resolveUpload(blob, { filename: 'photo.jpg' });
    expect(resolved.size).toBe(blob.size);
    expect(resolved.body.size).toBe(blob.size);
  });
});
