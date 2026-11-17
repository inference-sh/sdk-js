import { readFileSync } from 'fs';
import { join } from 'path';
import {
  TeamCapabilityManageAdmins,
  TeamCapabilityManagePolicy,
  TeamCapabilityViewBilling,
  TeamKindTeam,
  type CPUScore,
  type HostCPU,
  type SystemInfo,
  type TeamCapability,
  type TeamViewDTO,
} from '../types.js';

const typesSource = readFileSync(join(__dirname, '../types.ts'), 'utf8');

const minimalDocker = {
  binary_path: '/usr/bin/docker',
  installed: true,
  socket_path: '/var/run/docker.sock',
  socket_available: true,
  running: true,
  version: '27.0.0',
};

const minimalWsl = { installed: false, enabled: false, version: '' };

const minimalRam = {
  total: 0,
  available: 0,
  used: 0,
  free: 0,
  usage: 0,
  total_physical: 0,
  total_usable: 0,
  bootloader_usage: 0,
  swap_total: 0,
  swap_used: 0,
};

const minimalHfCache = { cache_dir: '', repos: [], size_on_disk: 0, warnings: [] };

/**
 * Types regen 7c428c6: SystemInfo.host_cpu (INF-1244) and TeamViewDTO.needs_admin_access.
 */
describe('SystemInfo HostCPU (7c428c6 / INF-1244)', () => {
  it('types HostCPU with required hugepages and kvm plus optional cpufreq fields', () => {
    const score: CPUScore = {
      single_ops_per_sec: 1_200_000,
      all_ops_per_sec: 8_400_000,
      threads: 8,
    };
    const hostCpu: HostCPU = {
      governor: 'performance',
      driver: 'intel_pstate',
      boost: true,
      cur_mhz: 3200,
      max_mhz: 4500,
      smt: true,
      threads_per_core: 2,
      hugepages_2m_total: 512,
      hugepages_2m_free: 480,
      thp: 'madvise',
      kvm: true,
      cpu_score: score,
    };
    expect(hostCpu.kvm).toBe(true);
    expect(hostCpu.cpu_score?.threads).toBe(8);
    expect(hostCpu.hugepages_2m_total).toBeGreaterThan(hostCpu.hugepages_2m_free);
  });

  it('allows SystemInfo without host_cpu for legacy engines and non-Linux hosts', () => {
    const legacy: SystemInfo = {
      hostname: 'engine-1',
      engine_version: '1.9.0',
      ipv4: '10.0.0.1',
      ipv6: '',
      mac_address: '00:00:00:00:00:00',
      os: 'windows',
      docker: minimalDocker,
      wsl2: minimalWsl,
      cpus: [],
      ram: minimalRam,
      volumes: [],
      hf_cache: minimalHfCache,
      gpus: [],
    };
    expect(legacy.host_cpu).toBeUndefined();
  });

  it('documents HostCPU, CPUScore, and INF-1244 in types.ts', () => {
    expect(typesSource).toMatch(/host_cpu\?: HostCPU;/);
    expect(typesSource).toMatch(/export interface HostCPU \{/);
    expect(typesSource).toMatch(/hugepages_2m_total: number \/\* uint64 \*\//);
    expect(typesSource).toMatch(/hugepages_2m_free: number \/\* uint64 \*\//);
    expect(typesSource).toMatch(/kvm: boolean;/);
    expect(typesSource).toMatch(/cpu_score\?: CPUScore;/);
    expect(typesSource).toMatch(/export interface CPUScore \{/);
    expect(typesSource).toMatch(/single_ops_per_sec: number \/\* float64 \*\//);
    expect(typesSource).toMatch(/all_ops_per_sec: number \/\* float64 \*\//);
    expect(typesSource).toMatch(/INF-1244/);
    expect(typesSource).toMatch(/scaling_governor/);
    expect(typesSource).toMatch(/\/dev\/kvm present/);
  });
});

describe('TeamViewDTO needs_admin_access (7c428c6)', () => {
  const governance = {
    billing: { by: 'self', team_id: 'team-1' },
    policy: { by: 'self', team_id: 'team-1' },
  };

  it('types needs_admin_access as TeamCapability[] for staff without current admin power', () => {
    const granted: TeamCapability[] = [TeamCapabilityViewBilling];
    const withheld: TeamCapability[] = [TeamCapabilityManageAdmins, TeamCapabilityManagePolicy];
    const view: TeamViewDTO = {
      team_id: 'team-1',
      kind: TeamKindTeam,
      governance,
      can: granted,
      needs_admin_access: withheld,
    };
    expect(view.can).toContain(TeamCapabilityViewBilling);
    expect(view.needs_admin_access).toEqual(['manage_admins', 'manage_policy']);
    expect(view.needs_admin_access).not.toContain(TeamCapabilityViewBilling);
  });

  it('documents NeedsAdminAccess and AdminPowerRenewable in types.ts', () => {
    expect(typesSource).toMatch(/needs_admin_access\?: TeamCapability\[\]/);
    expect(typesSource).toMatch(/NeedsAdminAccess lists what the caller would also hold with admin/);
    expect(typesSource).toMatch(/AuthContext\.AdminPowerRenewable/);
    expect(typesSource).toMatch(/needing admin\s+\* access instead of hiding them/);
  });
});
