// The build editor stays interactive while a save is in flight; the save's completion must not
// erase what the player typed in the meantime (Codex review of PR #175).
import { describe, expect, it } from 'vitest';
import type { CharacterData } from '@heist-mind/core';
import { withEditsSince } from '../with-edits-since';

const data = (over: Partial<CharacterData>): CharacterData =>
  ({ heritage: 'Akoros', vice: 'Gambling', stress: 0, ...over }) as unknown as CharacterData;

describe('withEditsSince', () => {
  it('adopts the saved row when nothing changed during the save', () => {
    const submitted = data({ heritage: 'Iruvia' });
    const saved = data({ heritage: 'Iruvia', stress: 2 }); // server merged a live stress change
    expect(withEditsSince(submitted, submitted, saved)).toEqual(saved);
  });

  it('keeps fields edited while the save was pending, on top of the saved row', () => {
    const submitted = data({ heritage: 'Iruvia' });
    const current = data({ heritage: 'Iruvia', vice: 'Pleasure' });
    const saved = data({ heritage: 'Iruvia', stress: 2 });
    expect(withEditsSince(submitted, current, saved)).toEqual(
      data({ heritage: 'Iruvia', vice: 'Pleasure', stress: 2 })
    );
  });
});
