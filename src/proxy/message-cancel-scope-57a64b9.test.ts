import { readFileSync } from 'fs';
import { join } from 'path';
import manifest from './endpoints.json' with { type: 'json' };
import { matchProxyEndpoint, pickProxyEndpoint } from './index.js';
import { ScopeConversationsRead, ScopeConversationsWrite } from '../types.js';

const MSG = '01j9z3m8k2c9v7b4n6q5r0m5g0';

/**
 * proxy endpoints regen 57a64b9 (api 109aa3df9): canceling a queued message is a
 * write action — site keys need conversations:write only, not conversations:read.
 */
describe('proxy message cancel scopes (57a64b9)', () => {
  const cancelRoute = 'POST /chats/messages/{messageId}/cancel';

  it('matches cancel message on the manifest route', () => {
    const entry = matchProxyEndpoint('POST', `/chats/messages/${MSG}/cancel`);
    expect(entry?.route).toBe(cancelRoute);
    expect(entry?.purpose).toBe('cancel a message');
    expect(pickProxyEndpoint(cancelRoute).route).toBe(cancelRoute);
  });

  it('requires conversations:write only (not conversations:read)', () => {
    const manifestEntry = manifest.endpoints.find(
      (e) => e.method === 'POST' && e.path === '/chats/messages/{messageId}/cancel',
    );
    expect(manifestEntry?.scopes).toEqual([ScopeConversationsWrite]);
    expect(manifestEntry?.scopes).not.toContain(ScopeConversationsRead);

    const runtime = matchProxyEndpoint('POST', `/chats/messages/${MSG}/cancel`);
    expect(runtime?.scopes).toEqual(['conversations:write']);
    expect(runtime?.scopes).not.toContain('conversations:read');
  });

  it('aligns cancel with other chat write actions (stop, tool answer)', () => {
    const writeScopes = (method: string, path: string) =>
      matchProxyEndpoint(method, path.replace('{id}', '0'.repeat(26)).replace('{messageId}', MSG).replace('{toolId}', '0'.repeat(26)))
        ?.scopes;

    expect(writeScopes('POST', '/chats/{id}/stop')).toEqual([ScopeConversationsWrite]);
    expect(writeScopes('POST', '/tools/{toolId}')).toEqual([ScopeConversationsWrite]);
    expect(writeScopes('POST', '/chats/messages/{messageId}/cancel')).toEqual([ScopeConversationsWrite]);
  });

  it('keeps chat stream on conversations:read', () => {
    const stream = manifest.endpoints.find(
      (e) => e.method === 'GET' && e.path === '/chats/{id}/stream',
    );
    expect(stream?.scopes).toEqual([ScopeConversationsRead]);
    expect(stream?.scopes).not.toContain(ScopeConversationsWrite);
  });
});

describe('endpoints.json regen guards (57a64b9)', () => {
  const source = readFileSync(join(__dirname, 'endpoints.json'), 'utf8');

  it('lists conversations:write as the sole scope for message cancel', () => {
    expect(source).toMatch(
      /"path": "\/chats\/messages\/\{messageId\}\/cancel",[\s\S]*?"scopes": \[\s*"conversations:write"\s*\]/,
    );
    expect(source).not.toMatch(
      /"path": "\/chats\/messages\/\{messageId\}\/cancel",[\s\S]*?"conversations:read"/,
    );
  });
});
