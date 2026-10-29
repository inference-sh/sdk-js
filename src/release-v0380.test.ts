import { readFileSync } from 'fs';
import { join } from 'path';
import manifest from './proxy/endpoints.json' with { type: 'json' };
import { SDK_VERSION } from './version.js';

const root = join(__dirname, '..');

/**
 * Release e51835c / changelog 0.38.0 (96cfcc5): message reads use
 * POST /chats/{id}/messages/list; proxy forwards the new route and keeps GET
 * for sdk-js 0.37.0 and older.
 */
describe('release v0.38.0 (e51835c)', () => {
  const changelog = readFileSync(join(root, 'CHANGELOG.md'), 'utf8');
  const agentApiSource = readFileSync(join(__dirname, 'agent/api.ts'), 'utf8');
  const agentsApiSource = readFileSync(join(__dirname, 'api/agents.ts'), 'utf8');

  it('ships version 0.38.0 with an empty Unreleased section and a dated 0.38.0 changelog', () => {
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as { version: string };
    expect(pkg.version).toBe('0.38.0');
    expect(SDK_VERSION).toBe('0.38.0');

    expect(changelog).toMatch(/## \[Unreleased\]\s*\n\s*\n## \[0\.38\.0\] - 2026-10-29/);
    expect(changelog).toMatch(/sends `POST \/chats\/\{id\}\/messages\/list` with the limit and cursor in the body/);
    expect(changelog).toMatch(/It was `GET \/chats\/\{id\}\/messages`/);
    expect(changelog).toMatch(/proxy forwards `POST \/chats\/\{id\}\/messages\/list`/);
    expect(changelog).toMatch(/still forwards `GET \/chats\/\{id\}\/messages` for clients on 0\.37\.0 and older/);
    expect(changelog).toMatch(/## \[0\.37\.0\] - 2026-10-29/);
  });

  it('lists message reads on POST /chats/{id}/messages/list in the proxy manifest while keeping legacy GET', () => {
    const getLegacy = manifest.endpoints.find(
      (e) => e.method === 'GET' && e.path === '/chats/{id}/messages',
    );
    const postList = manifest.endpoints.find(
      (e) => e.method === 'POST' && e.path === '/chats/{id}/messages/list',
    );
    expect(getLegacy?.purpose).toBe("read a chat's messages");
    expect(getLegacy?.scopes).toEqual(['conversations:read']);
    expect(postList?.purpose).toBe("list a chat's messages");
    expect(postList?.scopes).toEqual(['conversations:read']);
  });

  it('pins SDK clients to POST /chats/{id}/messages/list for reads (not GET /messages)', () => {
    expect(agentApiSource).toMatch(
      /client\.http\.request<FetchMessagesResult>\('post', `\/chats\/\$\{chatId\}\/messages\/list`/,
    );
    expect(agentApiSource).not.toMatch(
      /client\.http\.request<[^>]+>\('get', `\/chats\/\$\{chatId\}\/messages`/,
    );
    expect(agentsApiSource).toMatch(
      /this\.http\.request<CursorListResponse<ChatMessageDTO>>\('post', `\/chats\/\$\{chatId\}\/messages\/list`/,
    );
    expect(agentsApiSource).not.toMatch(
      /this\.http\.request<CursorListResponse<ChatMessageDTO>>\('get', `\/chats\/\$\{chatId\}\/messages`/,
    );
  });
});
