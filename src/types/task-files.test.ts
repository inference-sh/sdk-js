import * as main from '../index';
import {
  TaskFileRoleInput,
  TaskFileRoleOutput,
  type DeleteTaskFilesResponse,
  type TaskFileDTO,
  type TaskFileRole,
  type TaskFileSkipped,
} from '../types';

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

  it('keeps TaskFileRole limited to input and output literals', () => {
    const roles: TaskFileRole[] = [TaskFileRoleInput, TaskFileRoleOutput];
    expect(roles).toEqual(['input', 'output']);
  });

  it('accepts TaskFileDTO rows from GET /tasks/{id}/files', () => {
    const inputFile: TaskFileDTO = {
      id: 'file-in',
      created_at: '2026-10-07T12:00:00Z',
      role: TaskFileRoleInput,
      uri: 'inf://files/file-in',
      filename: 'prompt.txt',
      content_type: 'text/plain',
      size: 42,
    };
    const outputFile: TaskFileDTO = {
      id: 'file-out',
      created_at: '2026-10-07T12:01:00Z',
      role: TaskFileRoleOutput,
      uri: 'inf://files/file-out',
      filename: 'result.png',
      content_type: 'image/png',
      size: 8192,
    };
    expect(inputFile.role).toBe('input');
    expect(outputFile.role).toBe('output');
  });

  it('accepts DeleteTaskFilesResponse with deleted ids and skipped reasons', () => {
    const skipped: TaskFileSkipped = {
      id: 'file-shared',
      reason: 'referenced by another task',
    };
    const body: DeleteTaskFilesResponse = {
      deleted: ['file-out'],
      skipped: [skipped],
    };
    expect(body.deleted).toEqual(['file-out']);
    expect(body.skipped[0].reason).toContain('referenced');
  });
});
