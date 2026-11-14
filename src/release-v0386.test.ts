import { readFileSync } from 'fs';
import { join } from 'path';
import manifest from './proxy/endpoints.json' with { type: 'json' };
import {
  EngineCapabilityEgressPending,
  InterruptReasonEgressLogin,
  SandboxCredentialAsk,
  StepUpTeamMemberChange,
  TeamMemberAddAdded,
  type TeamMemberAddResultDTO,
} from './types.js';
import { SDK_VERSION } from './version.js';

const root = join(__dirname, '..');

/**
 * Release 8936bd6: v0.38.6 ships models INF-1173 (f871098) on top of the
 * 0.38.5 security release (55449c7 / b621cf3) and prior 0.38.x contracts.
 */
describe('release v0.38.6 (8936bd6 / f871098)', () => {
  const changelog = readFileSync(join(root, 'CHANGELOG.md'), 'utf8');
  const typesSource = readFileSync(join(__dirname, 'types.ts'), 'utf8');
  const teamsApiSource = readFileSync(join(__dirname, 'api/teams.ts'), 'utf8');
  const agentApiSource = readFileSync(join(__dirname, 'agent/api.ts'), 'utf8');
  const agentsApiSource = readFileSync(join(__dirname, 'api/agents.ts'), 'utf8');
  const workspaceYaml = readFileSync(join(root, 'pnpm-workspace.yaml'), 'utf8');
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
    version: string;
    devDependencies?: Record<string, string>;
  };

  it('ships version 0.38.6 with SDK_VERSION aligned to package.json', () => {
    expect(pkg.version).toBe('0.38.6');
    expect(SDK_VERSION).toBe('0.38.6');
    expect(changelog).toMatch(/## \[Unreleased\]\s*\n\s*\n## \[0\.38\.0\] - 2026-10-29/);
  });

  it('types sandbox credentials with ask/auto modes and egress_pending engines (f871098)', () => {
    expect(typesSource).toMatch(/credentials\?: SandboxCredential\[\];/);
    expect(typesSource).toMatch(/sandbox_credentials\?: SandboxCredential\[\];/);
    expect(typesSource).toMatch(
      /export const EngineCapabilityEgressPending: EngineCapability = "egress_pending";/,
    );
    expect(typesSource).toMatch(
      /export const InterruptReasonEgressLogin: InterruptReason = "egress_login";/,
    );
    expect(EngineCapabilityEgressPending).toBe('egress_pending');
    expect(InterruptReasonEgressLogin).toBe('egress_login');
    expect(SandboxCredentialAsk).toBe('ask');
  });

  it('types TeamsAPI.addMember() as TeamMemberAddResultDTO (55449c7)', () => {
    expect(teamsApiSource).toMatch(
      /async addMember\(teamId: string, data: TeamMemberAddRequest\): Promise<Response<TeamMemberAddResultDTO>>/,
    );

    const sample: TeamMemberAddResultDTO = {
      outcome: TeamMemberAddAdded,
      member: { id: 'm-1', user_id: 'u-1', team_id: 't-1', role: 'admin' },
    };
    expect(sample.outcome).toBe('added');
  });

  it('pins step-up team membership changes (55449c7)', () => {
    expect(typesSource).toMatch(/export const StepUpTeamMemberChange: StepUpAction = "team_member_change";/);
    expect(StepUpTeamMemberChange).toBe('team_member_change');
  });

  it('keeps @sveltejs/kit and pnpm security overrides from 18de58f / 29fc57c', () => {
    expect(pkg.devDependencies?.['@sveltejs/kit']).toBe('^3.1.1');
    expect(workspaceYaml).toMatch(/'qs@>=6\.7\.0 <6\.16\.1': \^6\.16\.1/);
    expect(workspaceYaml).toMatch(/'glob@>=9\.0\.0 <14\.0\.2': \^14\.0\.2/);
    expect(workspaceYaml).toMatch(/'minimatch@<11\.0\.1': \^11\.0\.3/);
    expect(workspaceYaml).toMatch(/'vite@>=8\.2\.0 <8\.2\.4': \^8\.2\.4/);
  });

  it('still reads chat messages via POST /chats/{id}/messages/list in clients and proxy', () => {
    const postList = manifest.endpoints.find(
      (e) => e.method === 'POST' && e.path === '/chats/{id}/messages/list',
    );
    expect(postList?.scopes).toEqual(['conversations:read']);

    expect(agentApiSource).toMatch(
      /client\.http\.request<FetchMessagesResult>\('post', `\/chats\/\$\{chatId\}\/messages\/list`/,
    );
    expect(agentsApiSource).toMatch(
      /this\.http\.request<CursorListResponse<ChatMessageDTO>>\('post', `\/chats\/\$\{chatId\}\/messages\/list`/,
    );
  });
});
