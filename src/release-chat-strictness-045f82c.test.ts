import { readFileSync } from 'fs';
import { join } from 'path';
import * as main from './index.js';
import {
  AgentRunStateCompleted,
  ChatStrictnessDTO,
  ChatStrictnessWatch,
  RunEndReasonContentFlagged,
  type ChatRunEvent,
} from './types.js';
import { SDK_VERSION } from './version.js';

const root = join(__dirname, '..');

/**
 * Release 045f82c: v0.39.3 ships chat content-guard strictness types (d680770)
 * and reducer fixtures that carry ChatSettingsDTO.strictness (4e60b06).
 */
describe('release chat strictness (045f82c / v0.39.3)', () => {
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as { version: string };
  const reducerTestSource = readFileSync(join(__dirname, 'agent/reducer.test.ts'), 'utf8');

  it('ships version 0.39.3 with SDK_VERSION aligned to package.json', () => {
    expect(pkg.version).toBe('0.39.3');
    expect(SDK_VERSION).toBe('0.39.3');
  });

  it('exports chat strictness and run end reason types from the main barrel', () => {
    expect(main.ChatStrictnessWatch).toBe('watch');
    expect(main.RunEndReasonContentFlagged).toBe('content_flagged');

    const strictness: ChatStrictnessDTO = {
      chat_id: 'c',
      chat: ChatStrictnessWatch,
      agent_default: ChatStrictnessWatch,
      minimum: ChatStrictnessWatch,
      flagged: false,
      effective: ChatStrictnessWatch,
    };
    expect(strictness.effective).toBe('watch');

    const ended: ChatRunEvent = {
      run_id: 'run-1',
      state: AgentRunStateCompleted,
      reason: RunEndReasonContentFlagged,
    };
    expect(ended.reason).toBe('content_flagged');
  });

  it('pins reducer tests on strictness in ChatSettingsDTO payloads (4e60b06)', () => {
    expect(reducerTestSource).toMatch(/MERGE_CHAT_SETTINGS/);
    expect(reducerTestSource).toMatch(/strictness: 'watch'/);
    expect(reducerTestSource).toMatch(/strictness: 'ask'/);
  });
});
