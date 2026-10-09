import * as main from '../index';
import { TaskFileRoleInput, TaskFileRoleOutput } from '../types';

/**
 * Task file DTOs (go/api task file endpoints) list input/output attachments
 * and report selective deletes. TaskFileRole is a closed union after 53acba3.
 */
describe('Task file DTOs (task files API)', () => {
  it('exports TaskFileRole constants from the main barrel', () => {
    expect(main.TaskFileRoleInput).toBe('input');
    expect(main.TaskFileRoleOutput).toBe('output');
    expect(TaskFileRoleInput).toBe('input');
    expect(TaskFileRoleOutput).toBe('output');
  });
});
