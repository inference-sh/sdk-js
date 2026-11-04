import { readFileSync } from 'fs';
import { join } from 'path';
import manifest from './proxy/endpoints.json' with { type: 'json' };
import {
  EngineCapabilityEgressGrants,
  EngineCapabilityEgressPending,
  ErrorCodeAccessRestricted,
  ErrorCodeAppMaintenance,
  ErrorCodeMaintenance,
  InterruptReasonEgressLogin,
  SandboxCredentialAsk,
  StepUpTeamMemberChange,
  TeamMemberAddAdded,
  type AccessNoticeDTO,
  type AppSandbox,
  type MeResponse,
  type TeamMemberAddResultDTO,
} from './types.js';
import { RELAY_KEY } from './live/protocol.js';
import { SDK_VERSION } from './version.js';

const root = join(__dirname, '..');

/**
 * Release 2a303bf: v0.38.12 ships ErrorCodeMaintenance (fe7b0ad) on top of
 * 0.38.11 AccessNoticeDTO and prior 0.38.x contracts.
 */
describe('release v0.38.12 (2a303bf / platform maintenance error code)', () => {
  const changelog = readFileSync(join(root, 'CHANGELOG.md'), 'utf8');
  const typesSource = readFileSync(join(__dirname, 'types.ts'), 'utf8');
  const writeBodiesSource = readFileSync(join(__dirname, 'api/write-bodies.ts'), 'utf8');
  const writeBodiesTestSource = readFileSync(join(__dirname, 'api/write-bodies.test.ts'), 'utf8');
  const teamsApiSource = readFileSync(join(__dirname, 'api/teams.ts'), 'utf8');
  const agentApiSource = readFileSync(join(__dirname, 'agent/api.ts'), 'utf8');
  const agentsApiSource = readFileSync(join(__dirname, 'api/agents.ts'), 'utf8');
  const projectsApiSource = readFileSync(join(__dirname, 'api/projects.ts'), 'utf8');
  const mcpServersApiSource = readFileSync(join(__dirname, 'api/mcp-servers.ts'), 'utf8');
  const socketsApiSource = readFileSync(join(__dirname, 'api/sockets.ts'), 'utf8');
  const sessionSource = readFileSync(join(__dirname, 'live/session.ts'), 'utf8');
  const indexSource = readFileSync(join(__dirname, 'index.ts'), 'utf8');
  const workspaceYaml = readFileSync(join(root, 'pnpm-workspace.yaml'), 'utf8');
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
    version: string;
    devDependencies?: Record<string, string>;
  };

  it('ships version 0.38.12 with SDK_VERSION aligned to package.json', () => {
    expect(pkg.version).toBe('0.38.12');
    expect(SDK_VERSION).toBe('0.38.12');
    expect(changelog).toMatch(/## \[Unreleased\]\s*\n\s*\n## \[0\.38\.0\] - 2026-10-29/);
  });

  it('types platform maintenance refusals distinct from app_maintenance (fe7b0ad)', () => {
    expect(typesSource).toMatch(/export const ErrorCodeMaintenance: ErrorCode = "maintenance";/);
    expect(typesSource).toMatch(/platform\.maintenance/);
    expect(ErrorCodeMaintenance).toBe('maintenance');
    expect(ErrorCodeAppMaintenance).toBe('app_maintenance');
  });

  it('types structured AccessNoticeDTO on MeResponse (4cb6b9f)', () => {
    expect(typesSource).toMatch(/export interface AccessNoticeDTO \{/);
    expect(typesSource).toMatch(/access_notice\?: AccessNoticeDTO;/);
    expect(typesSource).toMatch(/refusal's meta\.notice and \/me's access_notice/);

    const notice: AccessNoticeDTO = {
      stage: 'lure',
      text: 'Install CLI',
      reference: 'REF-1',
      contact: 'support@example.com',
      install_command: 'belt login',
    };
    const me: MeResponse = {
      needs_username: false,
      access_notice: notice,
    };
    expect(me.access_notice?.stage).toBe('lure');
  });

  it('documents enforce-mode writable-field checks and split create/update bodies (a4ea89e)', () => {
    expect(writeBodiesSource).toMatch(/writable-fields\.md/);
    expect(writeBodiesSource).toMatch(/validation_error/);
    expect(writeBodiesSource).toMatch(/Do not send a fetched DTO back/);
    expect(writeBodiesSource).toMatch(/export interface AgentUpdateBody \{\s*\n\s*images\?: ResourceImages;/);
    expect(writeBodiesSource).toMatch(/Visibility: `agents\.updateVisibility`/);
    expect(writeBodiesSource).toMatch(/export type ProjectUpdateBody/);
    expect(writeBodiesSource).toMatch(/export type ProjectCreateBody/);
    expect(writeBodiesSource).toMatch(/export type MCPServerCreateBody/);
    expect(writeBodiesSource).toMatch(/@deprecated Use ProjectCreateBody or ProjectUpdateBody/);

    expect(agentsApiSource).toMatch(
      /async update\(agentId: string, data: AgentUpdateBody\): Promise<Response<AgentDTO>>/,
    );
    expect(projectsApiSource).toMatch(
      /async update\(id: string, data: ProjectUpdateBody\): Promise<Response<ProjectDTO>>/,
    );
    expect(projectsApiSource).toMatch(
      /async create\(data: ProjectCreateBody\): Promise<Response<ProjectDTO>>/,
    );
    expect(mcpServersApiSource).toMatch(
      /async create\(data: MCPServerCreateBody\): Promise<Response<MCPServerDTO>>/,
    );
    expect(indexSource).toMatch(/ProjectCreateBody,/);
    expect(indexSource).toMatch(/ProjectUpdateBody,/);
    expect(indexSource).toMatch(/MCPServerCreateBody,/);

    expect(writeBodiesTestSource).toMatch(/write methods send only the fields given/);
    expect(writeBodiesTestSource).toMatch(/visibility through updateVisibility/);
    expect(writeBodiesTestSource).toMatch(/PATCHes without visibility/);
  });

  it('types redlist access_restricted refusals and MeResponse notice fields (5df186b)', () => {
    expect(typesSource).toMatch(/notice_reference\?: string;/);
    expect(typesSource).toMatch(/export interface EgressGrantDTO \{/);
    expect(typesSource).toMatch(
      /export const EngineCapabilityEgressGrants: EngineCapability = "egress_grants";/,
    );
    expect(ErrorCodeAccessRestricted).toBe('access_restricted');
    expect(EngineCapabilityEgressGrants).toBe('egress_grants');
  });

  it('holds microphone binary until relay pairing and exports RELAY_KEY (88eeffc / f488c3d)', () => {
    expect(RELAY_KEY).toBe('$relay');
    expect(sessionSource).toMatch(/holdFrames: 5/);
    expect(sessionSource).toMatch(/signals=paired/);
    expect(sessionSource).toMatch(/droppedFrames/);
    expect(socketsApiSource).toMatch(/realtime\?: boolean \| RealtimeOptions/);
    expect(indexSource).toMatch(/RELAY_KEY/);
    expect(indexSource).toMatch(/RealtimeOptions/);
  });

  it('types AppSandbox.user_namespaces for unprivileged user namespaces (beb1ec8)', () => {
    expect(typesSource).toMatch(/user_namespaces\?: boolean;/);
    const sandbox: AppSandbox = { user_namespaces: true };
    expect(sandbox.user_namespaces).toBe(true);
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
