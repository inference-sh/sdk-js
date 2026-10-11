import { readFileSync } from 'fs';
import { join } from 'path';
import type {
  DecisionInput,
  DecisionVideoInput,
  DecisionVisionInput,
} from '../types.js';

/**
 * types regen a2986f9: decision apps that watch video reuse the vision
 * contract and add optional `videos` file URIs (after images).
 */
describe('DecisionVideoInput (a2986f9)', () => {
  it('extends DecisionVisionInput with optional video file URIs', () => {
    const vision: DecisionVisionInput = {
      state: { scene: 'checkout' },
      images: ['inf://files/frame.png'],
      choices: [
        {
          id: 'action',
          instructions: 'What is the customer doing?',
          options: [{ name: 'paying' }, { name: 'leaving' }],
        },
      ],
    };

    const withVideo: DecisionVideoInput = {
      ...vision,
      videos: ['inf://files/walkthrough.mp4'],
    };

    expect(withVideo.images).toEqual(['inf://files/frame.png']);
    expect(withVideo.videos).toEqual(['inf://files/walkthrough.mp4']);

    const asBase: DecisionInput = withVideo;
    expect(asBase.state).toEqual({ scene: 'checkout' });
    expect(asBase.choices?.[0]?.id).toBe('action');
  });

  it('allows vision-only payloads without videos (DecisionVisionInput shape)', () => {
    const visionOnly: DecisionVideoInput = {
      state: {},
      images: ['inf://files/a.jpg'],
    };
    expect(visionOnly.videos).toBeUndefined();
  });

  it('keeps DecisionVideoInput in generated types.ts (regen guard)', () => {
    const src = readFileSync(join(__dirname, '../types.ts'), 'utf8');
    expect(src).toContain('export interface DecisionVideoInput extends DecisionVisionInput');
    expect(src).toMatch(/videos\?: string\[\]/);
    expect(src).toContain(
      'DecisionVideoInput is the input of a decision model that also watches'
    );
  });
});
