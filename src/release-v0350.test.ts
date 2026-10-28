import { readFileSync } from 'fs';
import { join } from 'path';
import { SDK_VERSION } from './version.js';
import type { ChatEvent, ChatHookEvent } from './types.js';
import {
  BuiltinHookExtract,
  BuiltinHookSuggest,
  ChatEventTypeHook,
  HookDecisionAllow,
  HookEventTurnStart,
  HookHandlerBuiltin,
} from './types.js';
import { learningHooks } from './hook-builder.js';

const root = join(__dirname, '..');

function interfaceBlock(typesSource: string, name: string): string {
  const start = typesSource.indexOf(`export interface ${name}`);
  expect(start).toBeGreaterThanOrEqual(0);
  const slice = typesSource.slice(start);
  const end = slice.indexOf('\nexport ');
  return end === -1 ? slice : slice.slice(0, end);
}

/**
 * Release f8ad5de / changelog 0.35.0 (cb7f251): plain `suggest` and `extract`
 * builtin hook names and ChatHookEvent.injection_ids for hook-run audit UI.
 */
describe('release v0.35.0 (f8ad5de)', () => {
  const typesSource = readFileSync(join(__dirname, 'types.ts'), 'utf8');
  const changelog = readFileSync(join(root, 'CHANGELOG.md'), 'utf8');
  const hookBuilderSource = readFileSync(join(__dirname, 'hook-builder.ts'), 'utf8');

  it('ships version 0.35.0 with an empty Unreleased section and a dated 0.35.0 changelog', () => {
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as { version: string };
    expect(pkg.version).toBe('0.35.0');
    expect(SDK_VERSION).toBe('0.35.0');

    expect(changelog).toMatch(/## \[Unreleased\]\s*\n\s*\n## \[0\.35\.0\] - 2026-10-28/);
    expect(changelog).toMatch(/builtin hooks are `suggest` and `extract`/);
    expect(changelog).toMatch(/`ChatHookEvent\.injection_ids`/);
    expect(changelog).toMatch(/## \[0\.34\.0\] - 2026-10-26/);
  });

  it('types plain suggest/extract builtins and drops belt-prefixed hook constants', () => {
    expect(BuiltinHookSuggest).toBe('suggest');
    expect(BuiltinHookExtract).toBe('extract');

    expect(typesSource).toMatch(/export type BuiltinHook = "suggest" \| "extract"/);
    expect(typesSource).not.toMatch(/BuiltinHookBeltSuggest/);
    expect(typesSource).not.toMatch(/BuiltinHookBeltExtract/);
    expect(typesSource).not.toMatch(/"belt:suggest"/);
    expect(typesSource).not.toMatch(/"belt:extract"/);
  });

  it('learningHooks() emits the new builtin names on the wire', () => {
    expect(hookBuilderSource).not.toMatch(/belt:suggest/);
    expect(hookBuilderSource).not.toMatch(/belt:extract/);
    expect(hookBuilderSource).toContain('.builtin(BuiltinHookSuggest)');
    expect(hookBuilderSource).toContain('.builtin(BuiltinHookExtract)');

    const handlers = learningHooks({ suggest: true, learn: true }).map(h => h.handler);
    expect(handlers).toEqual(['suggest', 'extract', 'extract']);
    expect(handlers.every(h => !h.includes(':'))).toBe(true);
  });

  it('types optional injection_ids on hook event chat messages', () => {
    const hookRun: ChatHookEvent = {
      event: HookEventTurnStart,
      handler_type: HookHandlerBuiltin,
      handler: BuiltinHookSuggest,
      decision: HookDecisionAllow,
      injected: true,
      injection_ids: ['inj-1', 'inj-2'],
      duration_ms: 42,
    };
    expect(hookRun.injection_ids).toEqual(['inj-1', 'inj-2']);

    const withoutIds: ChatHookEvent = {
      event: HookEventTurnStart,
      handler_type: HookHandlerBuiltin,
      handler: BuiltinHookSuggest,
      duration_ms: 10,
    };
    expect(withoutIds).not.toHaveProperty('injection_ids');

    const block = interfaceBlock(typesSource, 'ChatHookEvent');
    expect(block).toMatch(/InjectionIDs are the injection messages the run wrote/);
    expect(block).toMatch(/injection_ids\?: string\[\]/);

    const chatEvent: ChatEvent = {
      type: ChatEventTypeHook,
      hook: hookRun,
    };
    expect(chatEvent.hook?.injection_ids?.[0]).toBe('inj-1');
  });
});
