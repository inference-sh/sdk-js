import * as main from '../index.js';
import {
  ContentGuardShadow,
  ContentGuardOff,
  ContentGuardAnnotate,
  ContentGuardStrict,
  type ContentGuardMode,
} from '../types.js';

/** types: content guard — ContentGuardMode for tool-result guard behaviour. */
describe('ContentGuardMode (content guard)', () => {
  it('exports ContentGuardMode constants on types and the main barrel', () => {
    expect(ContentGuardShadow).toBe('shadow');
    expect(ContentGuardOff).toBe('off');
    expect(ContentGuardAnnotate).toBe('annotate');
    expect(ContentGuardStrict).toBe('strict');

    expect(main.ContentGuardShadow).toBe('shadow');
    expect(main.ContentGuardOff).toBe('off');
    expect(main.ContentGuardAnnotate).toBe('annotate');
    expect(main.ContentGuardStrict).toBe('strict');
  });

  it('keeps ContentGuardMode values stable (API contract)', () => {
    const modes: ContentGuardMode[] = [
      ContentGuardShadow,
      ContentGuardOff,
      ContentGuardAnnotate,
      ContentGuardStrict,
    ];
    expect(modes).toEqual(['shadow', 'off', 'annotate', 'strict']);
  });
});
