import { readFileSync } from 'fs';
import { join } from 'path';
import * as main from '../index.js';
import {
  ErrorCodeRequirementsNotMet,
  TaskStatusRejected,
  type CredentialRequirement,
  type SecretField,
  type SecretFieldConfig,
} from '../types.js';

const typesPath = join(__dirname, '..', 'types.ts');

/** types regen 67fe059: admission-refused tasks and richer credential metadata. */
describe('task admission and requirements types (67fe059)', () => {
  it('exports TaskStatusRejected and ErrorCodeRequirementsNotMet from the barrel', () => {
    expect(TaskStatusRejected).toBe(13);
    expect(main.TaskStatusRejected).toBe(13);
    expect(ErrorCodeRequirementsNotMet).toBe('requirements_not_met');
    expect(main.ErrorCodeRequirementsNotMet).toBe('requirements_not_met');
  });

  it('keeps CredentialRequirement deploy-catalog fields optional on the interface', () => {
    const req: CredentialRequirement = {
      slug: 'acme',
      display_name: 'Acme API',
      connection_scope: 'user',
      instructions: 'Create a key in the dashboard.',
      docs_url: 'https://docs.example.com/keys',
      expires_after_days: 90,
    };
    expect(req.display_name).toBe('Acme API');
    expect(req.expires_after_days).toBe(90);
  });

  it('regenerated types still declare pattern on secret field configs', () => {
    const field: SecretFieldConfig = {
      key: 'api_key',
      label: 'API key',
      placeholder: 'sk-…',
      sensitive: true,
      optional: false,
      pattern: '^sk-ant-',
    };
    expect(field.pattern).toBe('^sk-ant-');

    const sharedField: SecretField = { pattern: '^sk-ant-oat01-' };
    expect(sharedField.pattern).toBe('^sk-ant-oat01-');

    const source = readFileSync(typesPath, 'utf8');
    expect(source).toMatch(/export interface SecretFieldConfig[\s\S]*pattern\?: string;/);
    expect(source).toMatch(/export interface SecretField[\s\S]*pattern\?: string;/);
  });
});
