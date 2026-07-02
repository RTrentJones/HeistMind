// The catalog of built-in rulesets HeistMind ships. A GM loads any entry with one click (it's copied
// into a user-owned `rulesets` row via the same path as the uploader, then editable freely).
//
// Built-ins are TS constants (not JSON) so they're type-checked against `RulesetContent` at compile
// time — a shape change fails the build on every entry rather than rotting silently. The e2e upload
// fixtures stay JSON because they exercise the separate upload/parse path.
//
// Licensing: every ruleset here is either openly licensed (with the required attribution recorded on
// the entry) or original HeistMind content. Game *mechanics* are not copyrightable; only specific
// expression is — so where a source isn't openly licensed we reimplement mechanics in original words.
import type { RulesetContent } from '@heist-mind/core';
import { DEFAULT_RULESET } from '../default-ruleset';
import { BLADES_IN_THE_DARK } from './blades-in-the-dark';
import { WICKED_ONES } from './wicked-ones';

export interface BuiltinRuleset {
  /** Stable slug, e.g. 'brackwater', 'blades-in-the-dark'. */
  id: string;
  content: RulesetContent;
  /** Grouping/badge in the catalog UI. */
  tier: 'starter' | 'official' | 'community';
  /** Short license tag for the catalog badge, e.g. 'CC BY 3.0', 'CC0', 'Original'. */
  license?: string;
  /** Required attribution notice, shown on the catalog card and on the created copy. */
  attribution?: string;
  /** One-line catalog blurb (distinct from the longer `metadata.description`). */
  blurb?: string;
}

export const BUILTIN_RULESETS: BuiltinRuleset[] = [
  {
    id: 'brackwater',
    content: DEFAULT_RULESET,
    tier: 'starter',
    license: 'Original',
    blurb:
      'HeistMind’s original starter: a crew of scoundrels in a drowned, lantern-lit canal city. ' +
      'Full Forged-in-the-Dark mechanics, ready to play or to copy and reskin.',
  },
  {
    id: 'blades-in-the-dark',
    content: BLADES_IN_THE_DARK,
    tier: 'official',
    license: 'CC BY 3.0',
    attribution:
      'Based on Blades in the Dark (bladesinthedark.com), product of One Seven Design, developed ' +
      'and authored by John Harper, and licensed for our use under the Creative Commons Attribution ' +
      '3.0 Unported license.',
    blurb:
      'The classic: a daring crew of scoundrels in the haunted, industrial city of Duskvol. The ' +
      'reference Forged-in-the-Dark system.',
  },
  {
    id: 'wicked-ones',
    content: WICKED_ONES,
    tier: 'official',
    license: 'CC0',
    attribution:
      'Adapted from Wicked Ones by Bandit Camp, released into the public domain under Creative ' +
      'Commons Zero (CC0 1.0).',
    blurb:
      'Play the monsters: a band of dungeon-dwelling wicked ones digging out a lair, raiding the ' +
      'surface world, and fending off heroes.',
  },
];

export const getBuiltinById = (id: string): BuiltinRuleset | undefined =>
  BUILTIN_RULESETS.find(r => r.id === id);
