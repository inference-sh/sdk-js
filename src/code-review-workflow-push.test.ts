import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * 288752e: revert weekly code review — workflow runs on push to dev again and
 * scopes review to github.event.before..after (not a rolling 7-day window).
 */
describe('push code review workflow (288752e)', () => {
  const workflowMd = readFileSync(
    join(__dirname, '..', '.github', 'workflows', 'code-review.md'),
    'utf8'
  );
  const workflowLock = readFileSync(
    join(__dirname, '..', '.github', 'workflows', 'code-review.lock.yml'),
    'utf8'
  );

  it('documents push-triggered review on dev (not weekly schedule)', () => {
    expect(workflowMd).toMatch(/push:\s*\n\s*branches: \[dev\]/);
    expect(workflowMd).toMatch(/Code Review on Push/);
    expect(workflowMd).not.toMatch(/schedule: weekly on monday/);
    expect(workflowMd).not.toMatch(/last 7 days on dev/);
  });

  it('pre-computes commit range from push before/after SHAs', () => {
    expect(workflowMd).toMatch(/BEFORE_SHA: \$\{\{ github\.event\.before \}\}/);
    expect(workflowMd).toMatch(/AFTER_SHA: \$\{\{ github\.event\.after \}\}/);
    expect(workflowMd).toMatch(/\$\{BEFORE_SHA\}\.\.\$\{AFTER_SHA\}/);
    expect(workflowMd).not.toMatch(/--before="7 days ago"/);
  });

  it('does not instruct the agent to skip duplicate code-review findings', () => {
    expect(workflowMd).not.toMatch(/skip any finding already reported there/);
    expect(workflowMd).toMatch(/use the noop tool/);
  });

  it('compiled lock workflow pushes on dev without weekly cron', () => {
    expect(workflowLock).toMatch(/name: "Code Review on Push"/);
    expect(workflowLock).toMatch(/push:\s*\n\s*branches:\s*\n\s*- dev/);
    expect(workflowLock).toMatch(/github\.event\.before/);
    expect(workflowLock).toMatch(/github\.event\.after/);
    expect(workflowLock).not.toMatch(/cron: "10 11 \* \* 1"/);
    expect(workflowLock).not.toMatch(/Save commit range \(last 7 days\)/);
  });
});
