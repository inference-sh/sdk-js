import { readFileSync } from 'fs';
import { join } from 'path';
import * as main from '../index.js';
import {
  ErrorCodeInOtherWorkspace,
  ErrorCodeTeamRoleRequired,
  ErrorCodeVisibilityNotAllowed,
  VisibilityPrivate,
  VisibilityTeam,
  type ErrorCode,
  type Visibility,
  type VisibilityNotAllowedMeta,
} from '../types.js';

const typesSource = readFileSync(join(__dirname, '../types.ts'), 'utf8');

/**
 * Types regen 6dd9b7e: visibility_not_allowed (400) when tasks, flow runs
 * or engines are asked for org/public/unlisted visibility.
 */
describe('team-only visibility error types (6dd9b7e)', () => {
  it('exports ErrorCodeVisibilityNotAllowed from types and the main barrel', () => {
    expect(ErrorCodeVisibilityNotAllowed).toBe('visibility_not_allowed');
    expect(main.ErrorCodeVisibilityNotAllowed).toBe('visibility_not_allowed');
  });

  it('keeps visibility_not_allowed distinct from workspace and role errors', () => {
    const codes: ErrorCode[] = [
      ErrorCodeTeamRoleRequired,
      ErrorCodeInOtherWorkspace,
      ErrorCodeVisibilityNotAllowed,
    ];
    expect(codes).toEqual([
      'team_role_required',
      'in_other_workspace',
      'visibility_not_allowed',
    ]);
    expect(ErrorCodeVisibilityNotAllowed).not.toBe(ErrorCodeInOtherWorkspace);
    expect(ErrorCodeVisibilityNotAllowed).not.toBe(ErrorCodeTeamRoleRequired);
  });

  it('types VisibilityNotAllowedMeta for SDK visibility update UX', () => {
    const meta: VisibilityNotAllowedMeta = {
      resource: 'task',
      visibility: 'public' as Visibility,
      allowed: [VisibilityPrivate, VisibilityTeam],
    };
    expect(meta.resource).toBe('task');
    expect(meta.visibility).toBe('public');
    expect(meta.allowed).toEqual(['private', 'team']);
  });

  it('documents visibility_not_allowed and VisibilityDeclarer constraints in types.ts', () => {
    expect(typesSource).toMatch(/\| "visibility_not_allowed"/);
    expect(typesSource).toMatch(
      /export const ErrorCodeVisibilityNotAllowed: ErrorCode = "visibility_not_allowed";/,
    );
    expect(typesSource).toMatch(/ErrorCodeVisibilityNotAllowed \(400\)/);
    expect(typesSource).toMatch(/models\.VisibilityDeclarer/);
    expect(typesSource).toMatch(/a task, a flow run\s*\n \* or an engine is private or team/);
    expect(typesSource).toMatch(/export interface VisibilityNotAllowedMeta \{/);
    expect(typesSource).toMatch(/allowed: Visibility\[\];/);
    expect(typesSource).toMatch(/Meta is VisibilityNotAllowedMeta/);
  });
});
