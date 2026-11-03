import { readFileSync } from 'fs';
import { join } from 'path';
import type { AppSandbox, AppVersionDTO } from '../types.js';

const typesSource = readFileSync(join(__dirname, '..', 'types.ts'), 'utf8');

/** types regen beb1ec8: AppSandbox.user_namespaces for Chromium-style sandboxes. */
describe('AppSandbox.user_namespaces (beb1ec8)', () => {
  it('types user_namespaces as an optional boolean on AppSandbox', () => {
    expect(typesSource).toMatch(/user_namespaces\?: boolean;/);
    expect(typesSource).toMatch(
      /user_namespaces: true\s+# unprivileged user namespaces \(Chromium's sandbox\)/,
    );
    expect(typesSource).toMatch(/Chromium's sandbox needs/);
    expect(typesSource).toMatch(/seccomp[\s\S]*clone, unshare, setns and chroot/);
  });

  it('models inf.yml sandbox flags on AppVersionDTO.sandbox payloads', () => {
    const withUserNs: AppSandbox = {
      host_network: false,
      capabilities: ['SYS_PTRACE'],
      user_namespaces: true,
    };
    expect(withUserNs.user_namespaces).toBe(true);

    const hardened: AppSandbox = { host_network: false };
    expect(hardened.user_namespaces).toBeUndefined();

    const version: Pick<AppVersionDTO, 'sandbox'> = {
      sandbox: withUserNs,
    };
    expect(version.sandbox?.user_namespaces).toBe(true);
  });

  it('documents AppVersionDTO.sandbox as server-owned from the deployed package', () => {
    expect(typesSource).toMatch(
      /Sandbox is the version's declared sandbox exceptions[\s\S]*sandbox\?: AppSandbox;/,
    );
  });
});
