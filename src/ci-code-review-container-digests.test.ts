import { readFileSync } from 'fs';
import { join } from 'path';

const repoRoot = join(__dirname, '..');
const lockPath = join(repoRoot, '.github/aw/actions-lock.json');
const workflowPath = join(repoRoot, '.github/workflows/code-review.lock.yml');

type ActionsLock = {
  containers: Record<
    string,
    {
      image: string;
      digest: string;
      pinned_image: string;
    }
  >;
};

/**
 * gh-aw compile 0.68.3 (3535792): agentic code-review workflow containers,
 * including floating node:lts-alpine, are pinned by digest in actions-lock.json.
 */
describe('code-review workflow container digests (3535792)', () => {
  const lock = JSON.parse(readFileSync(lockPath, 'utf8')) as ActionsLock;

  it('stores a sha256 digest and pinned_image for every locked container', () => {
    const images = Object.values(lock.containers);
    expect(images.length).toBeGreaterThanOrEqual(6);

    for (const entry of images) {
      expect(entry.digest).toMatch(/^sha256:[a-f0-9]{64}$/);
      expect(entry.pinned_image).toBe(`${entry.image}@${entry.digest}`);
    }
  });

  it('includes node:lts-alpine so the workflow cannot drift to an unpinned LTS tag', () => {
    const node = lock.containers['node:lts-alpine'];
    expect(node).toBeDefined();
    expect(node.pinned_image).toMatch(/^node:lts-alpine@sha256:[a-f0-9]{64}$/);
  });

  it('uses pinned_image refs in download_docker_images.sh steps', () => {
    const yaml = readFileSync(workflowPath, 'utf8');
  const downloadLines = yaml
    .split('\n')
    .filter((line) => line.includes('download_docker_images.sh'));
    expect(downloadLines.length).toBeGreaterThan(0);

    for (const entry of Object.values(lock.containers)) {
      const usedInDownload = downloadLines.some((line) => line.includes(entry.pinned_image));
      expect(usedInDownload).toBe(true);
    }
  });
});