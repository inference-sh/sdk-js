import * as main from '../index';
import * as types from '../types';
import { AppCategoryDecision } from '../types';

/**
 * types regen 0767f7b: curated AppTag/AppTagTitle exports removed; tag titles
 * come from GET /store/tags. AppDTO.tags stays free-form string[].
 */
describe('App tags free-form contract (0767f7b)', () => {
  it('does not export AppTag or AppTagTitle slug constants from types or the barrel', () => {
    const tagExports = (mod: object) => Object.keys(mod).filter((key) => key.startsWith('AppTag'));
    expect(tagExports(types)).toEqual([]);
    expect(tagExports(main)).toEqual([]);
  });

  it('keeps AppCategoryDecision on types and the main barrel', () => {
    expect(AppCategoryDecision).toBe('decision');
    expect(main.AppCategoryDecision).toBe('decision');
  });
});
