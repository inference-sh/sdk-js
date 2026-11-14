import { readFileSync } from 'fs';
import { join } from 'path';
import manifest from './proxy/endpoints.json' with { type: 'json' };
import { SDK_VERSION } from './version.js';

const root = join(__dirname, '..');

/**
 * Release 692254c: v0.38.1 ships models v0.8.151 (343be12: Infra "remote" removed)
 * and RunEndReasonRefusal (25db234). POST /chats/{id}/messages/list behavior is unchanged
 * from 0.38.0 (96cfcc5 / e51835c).
 */
describe('release v0.38.1 (692254c)', () => {
  const changelog = readFileSync(join(root, 'CHANGELOG.md'), 'utf8');
  const typesSource = readFileSync(join(__dirname, 'types.ts'), 'utf8');
  const agentApiSource = readFileSync(join(__dirname, 'agent/api.ts'), 'utf8');
  const agentsApiSource = readFileSync(join(__dirname, 'api/agents.ts'), 'utf8');

  it('ships version 0.38.1 with an empty Unreleased section and a dated 0.38.0 changelog', () => {
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as { version: string };
    expect(pkg.version).toBe('0.38.1');
    expect(SDK_VERSION).toBe('0.38.1');

    expect(changelog).toMatch(/## \[Unreleased\]\s*\n\s*\n## \[0\.38\.0\] - 2026-10-29/);
    expect(changelog).toMatch(/sends `POST \/chats\/\{id\}\/messages\/list` with the limit and cursor in the body/);
    expect(changelog).toMatch(/It was `GET \/chats\/\{id\}\/messages`/);
    expect(changelog).toMatch(/proxy forwards `POST \/chats\/\{id\}\/messages\/list`/);
    expect(changelog).toMatch(/still forwards `GET \/chats\/\{id\}\/messages` for clients on 0\.37\.0 and older/);
    expect(changelog).toMatch(/## \[0\.37\.0\] - 2026-10-29/);
  });

  it('drops InfraRemote from generated types (models v0.8.151 / 343be12)', () => {
    expect(typesSource).toMatch(
      /export type Infra = "private" \| "cloud" \| "private_first";/,
    );
    expect(typesSource).not.toMatch(/export const InfraRemote/);
    expect(typesSource).not.toMatch(/Infra = [^;]*"remote"/);
  });

  it('adds RunEndReasonRefusal to generated types (25db234)', () => {
    expect(typesSource).toMatch(
      /export type RunEndReason = "output_limit" \| "no_reply" \| "refusal";/,
    );
    expect(typesSource).toMatch(/export const RunEndReasonRefusal: RunEndReason = "refusal";/);
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
