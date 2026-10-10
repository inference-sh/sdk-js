import { readFileSync } from 'fs';
import { join } from 'path';

const packageJson = JSON.parse(
  readFileSync(join(__dirname, '../package.json'), 'utf8')
) as { version: string };

const changelog = readFileSync(join(__dirname, '../CHANGELOG.md'), 'utf8');

/**
 * Release af4b243 / changelog 66d20ff / fix df2e1ae: v0.22.1 posts uploaded
 * file refs as `attachments` on POST /chats/{id}/messages.
 */
describe('release v0.22.1 (af4b243)', () => {
  it('pins the published package version', () => {
    expect(packageJson.version).toBe('0.22.1');
  });

  it('documents the sendMessage attachments fix in CHANGELOG', () => {
    expect(changelog).toMatch(/## \[0\.22\.1\] - 2026-10-10/);
    expect(changelog).toMatch(/`sendMessage` sends its attachments/);
    expect(changelog).toMatch(/posts the file refs as `attachments` on POST \/chats\/\{id\}\/messages/);
    expect(changelog).toMatch(/api-v1227\+/);
  });

  it('sendMessage wires processFiles into sendChatMessage attachments (df2e1ae)', () => {
    const source = readFileSync(join(__dirname, './agent/api.ts'), 'utf8');
    expect(source).toMatch(/data: attachments \? \{ message: text, attachments \} : \{ message: text \}/);
    expect(source).toMatch(/const attachments = await processFiles\(client, files\)/);
    expect(source).toMatch(/return sendChatMessage\(client, chat\.id, text, attachments\)/);
    expect(source).toMatch(
      /const \{ id, uri, filename, content_type, size \} = await client\.files\.upload\(file\)/
    );
  });
});
