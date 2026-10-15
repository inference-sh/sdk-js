import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * 554f900: code review runs weekly (Monday) over the last 7 days on dev instead of
 * on every push; agent prompt skips findings already open under the code-review label.
 */
describe('weekly code review workflow (554f900)', () => {
  const workflowMd = readFileSync(
    join(__dirname, '..', '.github', 'workflows', 'code-review.md'),
    'utf8'
  );
  const workflowLock = readFileSync(
    join(__dirname, '..', '.github', 'workflows', 'code-review.lock.yml'),
    'utf8'
  );

  it('documents weekly review on dev (not push-triggered)', () => {
    expect(workflowMd).toMatch(/schedule: weekly on monday/);
    expect(workflowMd).toMatch(/workflow_dispatch:/);
    expect(workflowMd).toMatch(/last 7 days on dev/);
    expect(workflowMd).not.toMatch(/push:\s*\n\s*branches:\s*\[dev\]/);
    expect(workflowMd).not.toMatch(/github\.event\.before/);
  });

  it('pre-computes commit range from the last 7 days on HEAD', () => {
    expect(workflowMd).toMatch(/Save commit range \(last 7 days\)/);
    expect(workflowMd).toMatch(/--before="7 days ago"/);
    expect(workflowMd).toMatch(/\$\{BASE\}\.\.HEAD/);
    expect(workflowMd).toMatch(/git diff "\$\{BASE\}\.\.HEAD"/);
  });

  it('tells the agent to skip duplicate code-review findings', () => {
    expect(workflowMd).toMatch(/labelled `code-review`/);
    expect(workflowMd).toMatch(/skip any finding already reported there/);
    expect(workflowMd).toMatch(/use the noop tool/);
  });

  it('compiled lock workflow is scheduled weekly (Monday) without push triggers', () => {
    expect(workflowLock).toMatch(/name: "Weekly Code Review"/);
    expect(workflowLock).toMatch(/cron: "10 11 \* \* 1"/);
    expect(workflowLock).toMatch(/workflow_dispatch:/);
    expect(workflowLock).not.toMatch(/branches:\s*\[dev\]/);
    expect(workflowLock).toMatch(/Save commit range \(last 7 days\)/);
  });
});
