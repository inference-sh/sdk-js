import * as main from '../index.js';
import {
  ContentTierInternal,
  ContentTierContent,
  ContentTierThirdParty,
  type ContentTier,
} from '../types.js';

/** types: content guard — ContentTier for tool-result guard classification. */
describe('ContentTier (content guard)', () => {
  it('exports ContentTier constants on types and the main barrel', () => {
    expect(ContentTierInternal).toBe('internal');
    expect(ContentTierContent).toBe('content');
    expect(ContentTierThirdParty).toBe('third_party');

    expect(main.ContentTierInternal).toBe('internal');
    expect(main.ContentTierContent).toBe('content');
    expect(main.ContentTierThirdParty).toBe('third_party');
  });

  it('keeps ContentTier values stable (API contract)', () => {
    const tiers: ContentTier[] = [
      ContentTierInternal,
      ContentTierContent,
      ContentTierThirdParty,
    ];
    expect(tiers).toEqual(['internal', 'content', 'third_party']);
  });
});
