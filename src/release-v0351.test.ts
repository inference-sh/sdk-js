import { readFileSync } from 'fs';
import { join } from 'path';
import { SDK_VERSION } from './version.js';
import type { ApiAgentRunRequest, ChatDTO } from './types.js';
import { ChatStatusIdle } from './types.js';

const root = join(__dirname, '..');

function interfaceBlock(typesSource: string, name: string): string {
  const start = typesSource.indexOf(`export interface ${name}`);
  expect(start).toBeGreaterThanOrEqual(0);
  const slice = typesSource.slice(start);
  const end = slice.indexOf('\nexport ');
  return end === -1 ? slice : slice.slice(0, end);
}

/**
 * Release 86d14d6 / changelog 0.35.1: ChatDTO carries project_id via
 * ProjectModelDTO; ApiAgentRunRequest.project_id files new chats in a project.
 */
describe('release v0.35.1 (86d14d6)', () => {
  const typesSource = readFileSync(join(__dirname, 'types.ts'), 'utf8');
  const changelog = readFileSync(join(root, 'CHANGELOG.md'), 'utf8');

  it('ships version 0.35.1 with an empty Unreleased section and a dated 0.35.1 changelog', () => {
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as { version: string };
    expect(pkg.version).toBe('0.35.1');
    expect(SDK_VERSION).toBe('0.35.1');

    expect(changelog).toMatch(/## \[Unreleased\]\s*\n\s*\n## \[0\.35\.1\] - 2026-10-28/);
    expect(changelog).toMatch(/`ChatDTO\.project_id`/);
    expect(changelog).toMatch(/`ApiAgentRunRequest\.project_id`/);
    expect(changelog).toMatch(/## \[0\.35\.0\] - 2026-10-28/);
  });

  it('types optional project_id on chat payloads via ProjectModelDTO', () => {
    const chat: ChatDTO = {
      id: 'chat-1',
      short_id: 'c1',
      created_at: '2026-10-28T10:00:00Z',
      updated_at: '2026-10-28T10:00:00Z',
      user_id: 'user-1',
      team_id: 'team-1',
      visibility: 'private',
      status: ChatStatusIdle,
      name: 'Project chat',
      description: '',
      children: [],
      project_id: 'proj-abc',
    };
    expect(chat.project_id).toBe('proj-abc');

    const chatBlock = interfaceBlock(typesSource, 'ChatDTO');
    expect(chatBlock).toMatch(/extends BaseModelDTO, PermissionModelDTO, ProjectModelDTO/);

    const projectModelBlock = interfaceBlock(typesSource, 'ProjectModelDTO');
    expect(projectModelBlock).toMatch(/project_id\?: string/);
  });

  it('types optional project_id on agent run requests for new chats only', () => {
    const runBody: ApiAgentRunRequest = {
      agent: 'support',
      input: { text: 'hello' },
      project_id: 'proj-new',
    };
    expect(runBody.project_id).toBe('proj-new');

    const block = interfaceBlock(typesSource, 'ApiAgentRunRequest');
    expect(block).toMatch(/ProjectID files the chat this message starts in a project/);
    expect(block).toMatch(/Ignored[\s\S]*existing chat \(chat_id\)/);
    expect(block).toMatch(/POST \/chats\/\{id\}\/project/);
    expect(block).toMatch(/project_id\?: string/);
  });
});
