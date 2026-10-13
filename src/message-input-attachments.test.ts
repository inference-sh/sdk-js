import { readFileSync } from 'fs';
import { join } from 'path';

const root = join(__dirname, '..');

/**
 * Commit 6a7004a: Agent.sendMessage uses MessageInput.attachments instead of
 * deprecated images/files URI lists; ClientToolResult lives on tool-builder and
 * is exported from the package root.
 */
describe('MessageInput attachments (6a7004a)', () => {
  it('documents MessageInput.attachments and ClientToolResult in the changelog', () => {
    const changelog = readFileSync(join(root, 'CHANGELOG.md'), 'utf8');
    expect(changelog).toMatch(/MessageInput\.attachments/);
    expect(changelog).toMatch(/deprecated `images` \/ `files` URI lists/);
    expect(changelog).toMatch(/ClientToolResult.*package root/);
  });

  it('exports ClientToolResult from the main barrel and tool-builder', () => {
    const indexSource = readFileSync(join(__dirname, 'index.ts'), 'utf8');
    expect(indexSource).toMatch(
      /export type \{[^}]*ClientToolResult[^}]*\} from '\.\/tool-builder\.js'/
    );

    const toolBuilderSource = readFileSync(join(__dirname, 'tool-builder.ts'), 'utf8');
    expect(toolBuilderSource).toMatch(/export type ClientToolResult = string \| \{ result: string; attachments\?: FileRef\[\] \}/);
  });

  it('re-exports ClientToolResult from agent/types instead of duplicating the alias', () => {
    const typesSource = readFileSync(join(__dirname, 'agent/types.ts'), 'utf8');
    expect(typesSource).toMatch(/export type \{ ClientToolResult \} from '\.\.\/tool-builder\.js'/);
    expect(typesSource).not.toMatch(/export type ClientToolResult = string \|/);
  });
});
