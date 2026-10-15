import * as main from '../index.js';
import {
  PermRead,
  PermWrite,
  PermInteract,
  PermUse,
  type Permission,
} from '../types.js';

describe('Permission constants (ba41d0a)', () => {
  it('exports PermInteract for artifact interact-level access', () => {
    expect(PermInteract).toBe('interact');
    expect(main.PermInteract).toBe('interact');
  });

  it('keeps Permission string literals stable', () => {
    const perms: Permission[] = [PermRead, PermWrite, PermInteract, PermUse];
    expect(perms).toEqual(['read', 'write', 'interact', 'use']);
  });

  it('exports all Permission constants from the main barrel', () => {
    expect(main.PermRead).toBe('read');
    expect(main.PermWrite).toBe('write');
    expect(main.PermUse).toBe('use');
  });
});
