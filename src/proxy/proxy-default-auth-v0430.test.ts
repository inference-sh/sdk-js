import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * v0.43.0 / commit 0ba814a: proxy refuses anonymous use unless allowedEndpoints
 * or explicit allowUnauthorizedRequests (Aikido 796582672).
 */
describe('proxy default auth v0.43.0', () => {
  it('documents the breaking proxy behaviour in CHANGELOG 0.43.0', () => {
    const changelog = readFileSync(join(__dirname, '../../CHANGELOG.md'), 'utf8');
    expect(changelog).toMatch(/## \[0\.43\.0\]/);
    expect(changelog).toMatch(
      /refuses every request with 401 instead of letting any visitor run any app or agent/
    );
    expect(changelog).toMatch(/allowUnauthorizedRequests: true/);
  });

  it('documents default refusal on exported Next.js handlers', () => {
    const source = readFileSync(join(__dirname, 'nextjs.ts'), 'utf8');
    expect(source).toMatch(
      /With neither[\s\S]*`isAuthenticated` nor `allowedEndpoints` the default refuses every request/
    );
    expect(source).toMatch(/export const handlers/);
    expect(source).toMatch(/export const pageHandler/);
  });
});