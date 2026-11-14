import { readFileSync } from 'fs';
import { join } from 'path';
import {
  TaskCancelledError,
  TaskFailedError,
  isTaskCancelledError,
  isTaskFailedError,
} from './index.js';
import { SDK_VERSION } from './version.js';

const root = join(__dirname, '..');

/**
 * Release d6a0573: v0.39.0 ships TaskCancelledError / TaskFailedError on
 * tasks.run() and tasks.watch().done (8be4814), including partial output on
 * cancel when the app already returned a result.
 */
describe('release v0.39.0 (d6a0573)', () => {
  const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as { version: string };
  const indexSource = readFileSync(join(__dirname, 'index.ts'), 'utf8');
  const tasksSource = readFileSync(join(__dirname, 'api/tasks.ts'), 'utf8');
  const errorsSource = readFileSync(join(__dirname, 'http/errors.ts'), 'utf8');
  const changelog = readFileSync(join(root, 'CHANGELOG.md'), 'utf8');

  it('ships version 0.39.0 with SDK_VERSION aligned to package.json', () => {
    expect(pkg.version).toBe('0.39.0');
    expect(SDK_VERSION).toBe('0.39.0');
  });

  it('exports task outcome errors and guards from the main barrel (8be4814)', () => {
    expect(indexSource).toMatch(/TaskCancelledError/);
    expect(indexSource).toMatch(/TaskFailedError/);
    expect(indexSource).toMatch(/isTaskCancelledError/);
    expect(indexSource).toMatch(/isTaskFailedError/);

    expect(TaskCancelledError).toEqual(expect.any(Function));
    expect(TaskFailedError).toEqual(expect.any(Function));
    expect(isTaskCancelledError).toEqual(expect.any(Function));
    expect(isTaskFailedError).toEqual(expect.any(Function));
  });

  it('settleTerminal rejects failed and cancelled watches with typed errors (8be4814)', () => {
    expect(tasksSource).toMatch(/settle\.reject\(new TaskFailedError\(stripped\)\)/);
    expect(tasksSource).toMatch(/settle\.reject\(new TaskCancelledError\(stripped\)\)/);
    expect(tasksSource).toMatch(/TaskFailedError` or `TaskCancelledError`/);
  });

  it('documents partial output on TaskCancelledError.task (8be4814)', () => {
    expect(errorsSource).toMatch(/cancelled after its app returned a result/);
    expect(errorsSource).toMatch(/isTaskCancelledError/);
    expect(errorsSource).toMatch(/isTaskFailedError/);
    expect(changelog).toMatch(/TaskCancelledError/);
    expect(changelog).toMatch(/error\.task\.output/);
  });
});
