import { readFileSync } from 'fs';
import { join } from 'path';
import manifest from './proxy/endpoints.json' with { type: 'json' };
import {
  StepUpTeamMemberChange,
  TeamMemberAddAdded,
  type TeamMemberAddResultDTO,
} from './types.js';
import { SDK_VERSION } from './version.js';

const root = join(__dirname, '..');

/**
 * Release b621cf3: v0.38.5 ships models security release (55449c7) on top of
 * the 0.38.4 stack (HookURL doc, hook_url, github-app, engine capacity,
 * security overrides).
 */
describe('release v0.38.5 (b621cf3 / 55449c7)', () => {
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

  it('ships version 0.38.5 with SDK_VERSION aligned to package.json', () => {
    expect(pkg.version).toBe('0.38.5');
    expect(SDK_VERSION).toBe('0.38.5');
    expect(changelog).toMatch(/## \[Unreleased\]\s*\n\s*\n## \[0\.38\.0\] - 2026-10-29/);
  });

  it('types TeamsAPI.addMember() as TeamMemberAddResultDTO (55449c7)', () => {
    expect(teamsApiSource).toMatch(
      /async addMember\(teamId: string, data: TeamMemberAddRequest\): Promise<Response<TeamMemberAddResultDTO>>/,
    );
    expect(teamsApiSource).toContain('(`outcome: "added"`, `member`)');
    expect(teamsApiSource).toContain('(`outcome: "invited"`, `invite`)');

    const sample: TeamMemberAddResultDTO = {
      outcome: TeamMemberAddAdded,
      member: { id: 'm-1', user_id: 'u-1', team_id: 't-1', role: 'admin' },
    };
    expect(sample.outcome).toBe('added');
  });

  it('pins step-up actions for team membership changes (55449c7)', () => {
    expect(typesSource).toMatch(/export type StepUpAction =/);
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

  it('retains HookURL on CredentialConfigDTO (3f4051b / v0.8.157)', () => {
    expect(typesSource).toMatch(/hook_url\?: string;/);
    expect(typesSource).toMatch(
      /HookURL is where App delivers its events \(the GitHub App's webhook/,
    );
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
