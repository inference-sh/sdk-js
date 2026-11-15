import { readFileSync } from 'fs';
import { join } from 'path';
import { CloudAWS, InstanceStatusActive, type InstanceDTO } from './types.js';

const typesSource = readFileSync(join(__dirname, 'types.ts'), 'utf8');

function instanceDtoInterfaceSource(): string {
  const start = typesSource.indexOf('export interface InstanceDTO');
  const end = typesSource.indexOf('export interface InstanceTypeDTO', start);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return typesSource.slice(start, end);
}

/**
 * api-v1572: InstanceDTO no longer includes launch_configuration or envs
 * (enrollment token is carried by the boot script).
 */
describe('InstanceDTO (api-v1572)', () => {
  it('documents that launch_configuration and envs are not on the DTO', () => {
    const start = typesSource.indexOf('export interface InstanceDTO');
    const excerpt = typesSource.slice(Math.max(0, start - 280), start + 80);
    expect(excerpt).toMatch(/has no[\s\S]*launch_configuration and no envs/);
  });

  it('omits launch_configuration and envs from the generated interface', () => {
    const block = instanceDtoInterfaceSource();
    expect(block).not.toMatch(/\blaunch_configuration\??\s*:/);
    expect(block).not.toMatch(/\benvs\??\s*:/);
  });

  it('rejects removed fields on InstanceDTO object literals', () => {
    const minimal: InstanceDTO = {
      id: 'inst-1',
      short_id: 'inst1',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
      user_id: 'user-1',
      team_id: 'team-1',
      visibility: 'private',
      cloud: CloudAWS,
      name: 'gpu-box',
      region: 'us-east-1',
      shade_cloud: true,
      shade_instance_type: 'A100',
      cloud_instance_type: 'p4d.24xlarge',
      cloud_assigned_id: 'i-abc',
      ssh_user: 'ubuntu',
      ssh_port: 22,
      ip: '1.2.3.4',
      status: InstanceStatusActive,
      cost_estimate: '1.50',
      hourly_price: 150,
    };
    // @ts-expect-error launch_configuration removed in api-v1572
    const _withLaunchConfig: InstanceDTO = {
      ...minimal,
      launch_configuration: { image: 'engine-boot' },
    };
    // @ts-expect-error envs removed in api-v1572
    const _withEnvs: InstanceDTO = {
      ...minimal,
      envs: { ENROLLMENT_TOKEN: 'secret' },
    };
    expect(minimal.status).toBe(InstanceStatusActive);
    expect(_withLaunchConfig).toBeDefined();
    expect(_withEnvs).toBeDefined();
  });
});