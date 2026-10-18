// F96 / US-X5 — catalog copy must be true: there is no in-app ruleset editor and no download, so no
// built-in may promise editing or reskinning a copy ("copy and reskin", "edit freely").
import { describe, expect, it } from 'vitest';
import { BUILTIN_RULESETS } from './index';

const UNTRUE = /reskin|edit freely|editable|edit your copy/i;

describe('built-in catalog copy', () => {
  it.each(BUILTIN_RULESETS.map(b => [b.id, b] as const))(
    '%s promises no editor in its blurb or description',
    (_id, b) => {
      expect(b.blurb ?? '').not.toMatch(UNTRUE);
      expect(b.content.metadata.description ?? '').not.toMatch(UNTRUE);
    }
  );
});
