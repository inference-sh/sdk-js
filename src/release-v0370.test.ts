import { readFileSync } from 'fs';
import { join } from 'path';
import * as main from './index.js';
import { SDK_VERSION } from './version.js';
import {
  ChatOriginAPI,
  ChatOriginBranch,
  ChatOriginEmbed,
  ChatOriginHook,
  ChatOriginIntegration,
  ChatOriginOpenAIClient,
  ChatOriginSubagent,
  ChatOriginTrigger,
  ChatOriginUI,
  CredentialStatusPending,
  type ChatDTO,
  type ChatOrigin,
} from './types.js';

const root = join(__dirname, '..');

function interfaceBlock(source: string, name: string): string {
  const start = source.indexOf(`export interface ${name}`);
  expect(start).toBeGreaterThanOrEqual(0);
  const slice = source.slice(start);
  const end = slice.indexOf('\nexport ');
  return end === -1 ? slice : slice.slice(0, end);
}

/**
 * Release 2e115fe / changelog 0.37.0 (272d91f): ChatDTO.origin is required;
 * ChatOrigin constants classify how a chat was created; ChatData.client mirrors
 * X-Client-Source for display only.
 */
describe('release v0.37.0 (2e115fe)', () => {
  const typesSource = readFileSync(join(__dirname, 'types.ts'), 'utf8');
  const changelog = readFileSync(join(root, 'CHANGELOG.md'), 'utf8');

  it('ships version 0.37.0 with an empty Unreleased section and a dated 0.37.0 changelog', () => {
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as { version: string };
    expect(pkg.version).toBe('0.37.0');
    expect(SDK_VERSION).toBe('0.37.0');

    expect(changelog).toMatch(/## \[Unreleased\]\s*\n\s*\n## \[0\.37\.0\] - 2026-10-29/);
    expect(changelog).toMatch(/`ChatDTO\.origin` \(`ChatOrigin`/);
    expect(changelog).toMatch(/`GET \/chats` filters on it/);
    expect(changelog).toMatch(/`ChatData\.client` names the app/);
    expect(changelog).toMatch(/`ChatDTO\.origin` is required/);
    expect(changelog).toMatch(/## \[0\.36\.2\] - 2026-10-28/);
  });

  it('requires ChatDTO.origin and documents ChatData.client on agent_data', () => {
    const chatBlock = interfaceBlock(typesSource, 'ChatDTO');
    expect(chatBlock).toMatch(/origin: ChatOrigin;/);
    expect(chatBlock).not.toMatch(/origin\?: ChatOrigin/);
    expect(chatBlock).toMatch(/GET \/chats filters on it/);

    const dataBlock = interfaceBlock(typesSource, 'ChatData');
    expect(dataBlock).toMatch(/client\?: string;/);
    expect(dataBlock).toMatch(/X-Client-Source/);
    expect(dataBlock).toMatch(/Chat\.Origin is what a chat list filters/);
  });

  it('pins ChatOrigin literals and named constants for list filtering', () => {
    const origins: ChatOrigin[] = [
      ChatOriginUI,
      ChatOriginAPI,
      ChatOriginTrigger,
      ChatOriginIntegration,
      ChatOriginOpenAIClient,
      ChatOriginEmbed,
      ChatOriginHook,
      ChatOriginSubagent,
      ChatOriginBranch,
    ];
    expect(origins).toEqual([
      'ui',
      'api',
      'trigger',
      'integration',
      'openai_client',
      'embed',
      'hook',
      'subagent',
      'branch',
    ]);

    expect(typesSource).toMatch(/export type ChatOrigin =\s*\n\s*\| "ui"/);
    expect(main.ChatOriginUI).toBe('ui');
    expect(main.ChatOriginBranch).toBe('branch');

    const chat: ChatDTO = {
      id: 'chat-1',
      origin: ChatOriginUI,
    } as ChatDTO;
    expect(chat.origin).toBe('ui');
  });

  it('documents CredentialStatusPending as legacy-only on soft-deleted rows', () => {
    expect(CredentialStatusPending).toBe('pending');
    expect(main.CredentialStatusPending).toBe('pending');
    expect(typesSource).toMatch(/CredentialStatusPending is no longer written/);
  });
});
