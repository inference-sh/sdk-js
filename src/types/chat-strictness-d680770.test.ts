import { readFileSync } from 'fs';
import { join } from 'path';
import * as main from '../index.js';
import {
  ChatStrictnessAsk,
  ChatStrictnessStrict,
  ChatStrictnessWatch,
  PolicySubjectOrg,
  PolicySubjectTeam,
  RunEndReasonContentFlagged,
  RunEndReasonOutputLimit,
  RunEndReasonRefusal,
  type ChatSettingsDTO,
  type ChatSettingsRequest,
  type ChatStrictness,
  type ChatStrictnessDTO,
  type ContentGuardConfig,
  type PolicySubject,
  type RunEndReason,
} from '../types.js';

const typesSource = readFileSync(join(__dirname, '../types.ts'), 'utf8');

/**
 * Types regen d680770 (api-v1539): content-guard strictness per chat and agent,
 * GET /chats/{id}/strictness, and run_ended reason content_flagged.
 */
describe('chat strictness (d680770 / api-v1539)', () => {
  it('exports ChatStrictness literals and constants from the main barrel', () => {
    const levels: ChatStrictness[] = [ChatStrictnessWatch, ChatStrictnessAsk, ChatStrictnessStrict];
    expect(levels).toEqual(['watch', 'ask', 'strict']);
    expect(main.ChatStrictnessStrict).toBe('strict');
    expect(typesSource).toMatch(/export type ChatStrictness = "watch" \| "ask" \| "strict";/);
    expect(typesSource).toMatch(/tool-approval prompt/);
    expect(typesSource).toMatch(/strict: the run is stopped/);
  });

  it('types ChatSettingsRequest and ChatSettingsDTO with strictness', () => {
    const req: ChatSettingsRequest = { strictness: ChatStrictnessAsk };
    expect(req.strictness).toBe('ask');

    const dto: ChatSettingsDTO = {
      chat_id: 'chat-1',
      name: 'c',
      visibility: 'private',
      allow_all_tools: false,
      disable_hooks: false,
      memory: {},
      strictness: ChatStrictnessWatch,
    };
    expect(dto.strictness).toBe('watch');

    expect(typesSource).toMatch(/strictness\?: ChatStrictness;/);
    expect(typesSource).toMatch(/GET \/chats\/\{id\}\/strictness/);
    expect(typesSource).toMatch(/agent_data\.strictness/);
  });

  it('types ChatStrictnessDTO for effective strictness and flagged state', () => {
    const view: ChatStrictnessDTO = {
      chat_id: 'chat-1',
      chat: ChatStrictnessAsk,
      agent_default: ChatStrictnessWatch,
      minimum: ChatStrictnessStrict,
      minimum_set_by: PolicySubjectTeam,
      delegated: ChatStrictnessAsk,
      flagged: true,
      effective: ChatStrictnessStrict,
    };
    expect(view.effective).toBe('strict');
    expect(view.flagged).toBe(true);
    expect(view.minimum_set_by).toBe('team');

    expect(typesSource).toMatch(/export interface ChatStrictnessDTO \{/);
    expect(typesSource).toMatch(/Effective is the level the chat runs at/);
    expect(typesSource).toMatch(/Flagged reports that the content guard has flagged/);
    expect(typesSource).toMatch(/Delegated is, for a sub-agent's chat/);
  });

  it('types ContentGuardConfig.strictness as the agent default', () => {
    const guard: ContentGuardConfig = { strictness: ChatStrictnessStrict };
    expect(guard.strictness).toBe('strict');
    expect(typesSource).toMatch(/content_guard\.strictness/);
  });

  it('extends RunEndReason with content_flagged for strict chat stops', () => {
    const reasons: RunEndReason[] = [
      RunEndReasonOutputLimit,
      RunEndReasonRefusal,
      RunEndReasonContentFlagged,
    ];
    expect(reasons).toContain('content_flagged');
    expect(main.RunEndReasonContentFlagged).toBe('content_flagged');
    expect(typesSource).toMatch(/\| "content_flagged";/);
    expect(typesSource).toMatch(/RunEndReasonContentFlagged: the content guard flagged/);
    expect(typesSource).toMatch(/chat's strictness is strict/);
  });

  it('exports PolicySubject ladder constants for governance minimum_set_by', () => {
    const subjects: PolicySubject[] = [PolicySubjectTeam, PolicySubjectOrg];
    expect(subjects).toEqual(['team', 'org']);
    expect(main.PolicySubjectOrg).toBe('org');
    expect(typesSource).toMatch(/export type PolicySubject =/);
    expect(typesSource).toMatch(/PolicySubjectTeam: PolicySubject = "team"/);
    expect(typesSource).toMatch(/values match CredentialScope/);
  });
});
