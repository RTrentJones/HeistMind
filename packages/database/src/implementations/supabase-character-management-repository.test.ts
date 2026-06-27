import { describe, it, expect } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { CharacterData, RulesetContent } from '../domain-types';
import type { Database } from '../supabase-types';
import { SupabaseCharacterManagementRepository } from './supabase-character-management-repository';

// --- fixtures ---------------------------------------------------------------------------------

const ISO = '2026-01-01T00:00:00.000Z';

function content(overrides: Partial<RulesetContent> = {}): RulesetContent {
  return {
    metadata: { name: 'R', version: '1', author: 'A', description: 'D', system: 'FitD' },
    playbooks: [
      {
        id: 'razor',
        name: 'Razor',
        description: '',
        startingAbilities: ['battle-born'],
        specialAbilities: ['battle-born'],
        contacts: [],
        equipment: [],
        attributes: {},
        skills: {},
      },
    ],
    attributes: [{ id: 'grit', name: 'Grit', description: '', skills: [], maxValue: 4 }],
    skills: [],
    specialAbilities: [
      { id: 'battle-born', name: 'Battle-Born', description: '', tier: 1 },
      { id: 'sharpshot', name: 'Sharpshot', description: '', tier: 1 },
      { id: 'ghost-step', name: 'Ghost Step', description: '', tier: 2 },
    ],
    equipment: { loadCapacity: {}, items: [], categories: [] },
    advancement: {
      xpTriggers: [],
      advancementOptions: [
        { id: 'buy-ability', name: 'Buy', description: '', cost: 2, category: 'ability' },
      ],
    },
    characterCreation: {
      steps: [],
      pointBuy: { totalPoints: 7, attributeCosts: { 1: 1, 2: 2, 3: 3, 4: 4 }, skillCosts: {} },
    },
    ...overrides,
  };
}

function charData(o: Partial<CharacterData> = {}): CharacterData {
  return {
    playbook: 'razor',
    attributes: {},
    skills: {},
    specialAbilities: ['battle-born'],
    items: [],
    stress: 0,
    trauma: [],
    coins: 0,
    contacts: [],
    custom: {},
    ...o,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function charRow(o: any = {}): any {
  return {
    id: 'c1',
    created_by: 'u1',
    game_id: 'g1',
    name: 'C',
    description: null,
    avatar_url: null,
    character_data: o.character_data ?? charData(),
    playbook_type: 'razor',
    experience_points: o.experience_points ?? 0,
    advancement_history: o.advancement_history ?? [],
    status: 'active',
    is_template: false,
    original_ruleset_id: null,
    adaptations: {},
    created_at: ISO,
    updated_at: ISO,
    ...o,
  };
}

const gameRow = {
  id: 'g1',
  ruleset_id: 'r1',
  created_by: 'u1',
  name: 'G',
  description: null,
  state: 'recruiting',
  max_players: 6,
  current_players: 1,
  allow_co_gms: false,
  allow_spectators: false,
  rule_overrides: {},
  house_rules: null,
  invite_only: false,
  public_listing: false,
  created_at: ISO,
  updated_at: ISO,
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rulesetRow(c: RulesetContent): any {
  return {
    id: 'r1',
    created_by: 'u1',
    name: 'R',
    description: null,
    version: '1',
    content: c,
    schema_version: '1',
    status: 'published',
    is_public: false,
    tags: [],
    compatibility_flags: {},
    created_at: ISO,
    updated_at: ISO,
  };
}

// --- mock client ------------------------------------------------------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Resp = { data: any; error: any };

/** A chainable mock of the supabase-js query builder, sufficient for this repo's calls. */
function makeClient(reads: Record<string, Resp>): {
  client: SupabaseClient<Database>;
  lastUpdate: () => Resp | null;
} {
  let lastUpdatePayload: Resp | null = null;
  const builder = (table: string) => {
    let op: 'read' | 'insert' | 'update' = 'read';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let payload: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const b: any = {
      select: () => b,
      eq: () => b,
      order: () => b,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      insert: (r: any) => {
        op = 'insert';
        payload = r;
        return b;
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      update: (p: any) => {
        op = 'update';
        payload = p;
        return b;
      },
      single: () => {
        if (op === 'read')
          return Promise.resolve(reads[table] ?? { data: null, error: { code: 'PGRST116' } });
        const base = reads[table]?.data ?? {};
        const merged: Resp = { data: { ...base, ...payload }, error: null };
        if (op === 'update') lastUpdatePayload = { data: payload, error: null };
        return Promise.resolve(merged);
      },
      // Crew-context lookups use maybeSingle (null when the campaign has no crew yet).
      maybeSingle: () => Promise.resolve(reads[table] ?? { data: null, error: null }),
    };
    return b;
  };
  const client = {
    from: (t: string) => builder(t),
    schema: () => ({ from: (t: string) => builder(t) }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any as SupabaseClient<Database>;
  return { client, lastUpdate: () => lastUpdatePayload };
}

function repoWith(reads: Record<string, Resp>) {
  const { client, lastUpdate } = makeClient(reads);
  return { repo: new SupabaseCharacterManagementRepository(client, 'development'), lastUpdate };
}

// --- tests ------------------------------------------------------------------------------------

describe('createCharacterWithValidation', () => {
  it('rejects an over-cap build before creating it', async () => {
    const { repo } = repoWith({
      games: { data: gameRow, error: null },
      rulesets: { data: rulesetRow(content()), error: null },
    });
    const r = await repo.createCharacterWithValidation('u1', {
      gameId: 'g1',
      name: 'X',
      characterData: charData({ attributes: { grit: 9 } }),
      playbookType: 'razor',
    });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.code).toBe('VALIDATION');
  });

  it('creates a valid character and returns details', async () => {
    const { repo } = repoWith({
      characters: { data: charRow(), error: null },
      games: { data: gameRow, error: null },
      rulesets: { data: rulesetRow(content()), error: null },
      profiles: { data: null, error: { code: 'PGRST116' } },
    });
    const r = await repo.createCharacterWithValidation('u1', {
      gameId: 'g1',
      name: 'X',
      characterData: charData({ attributes: { grit: 2 } }),
      playbookType: 'razor',
    });
    expect(r.success).toBe(true);
  });

  it('surfaces a ruleset-load failure', async () => {
    const { repo } = repoWith({ games: { data: null, error: { message: 'boom' } } });
    const r = await repo.createCharacterWithValidation('u1', {
      gameId: 'g1',
      name: 'X',
      characterData: charData(),
      playbookType: 'razor',
    });
    expect(r.success).toBe(false);
  });
});

describe('updateCharacterWithValidation', () => {
  it('rejects a build that breaks a live invariant (stress > max)', async () => {
    const { repo } = repoWith({
      characters: { data: charRow(), error: null },
      games: { data: gameRow, error: null },
      rulesets: { data: rulesetRow(content()), error: null },
    });
    const r = await repo.updateCharacterWithValidation('c1', 'u1', {
      characterData: charData({ stress: 100 }),
    });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.code).toBe('VALIDATION');
  });

  it('persists a valid update', async () => {
    const { repo } = repoWith({
      characters: { data: charRow(), error: null },
      games: { data: gameRow, error: null },
      rulesets: { data: rulesetRow(content()), error: null },
    });
    const r = await repo.updateCharacterWithValidation('c1', 'u1', {
      characterData: charData({ stress: 3 }),
    });
    expect(r.success).toBe(true);
  });

  it('404s a missing character', async () => {
    const { repo } = repoWith({ characters: { data: null, error: { code: 'PGRST116' } } });
    const r = await repo.updateCharacterWithValidation('nope', 'u1', {});
    expect(r.success).toBe(false);
  });
});

describe('advanceCharacter', () => {
  it('rejects when XP is insufficient', async () => {
    const { repo } = repoWith({
      characters: { data: charRow({ experience_points: 0 }), error: null },
      games: { data: gameRow, error: null },
      rulesets: { data: rulesetRow(content()), error: null },
    });
    const r = await repo.advanceCharacter('c1', 'u1', {
      type: 'ability',
      target: 'sharpshot',
      cost: 2,
      description: 'x',
    });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.code).toBe('INSUFFICIENT_XP');
  });

  it('rejects when requirements are unmet', async () => {
    const c = content();
    c.advancement.advancementOptions = [
      {
        id: 'buy-ability',
        name: 'Buy',
        description: '',
        cost: 1,
        category: 'ability',
        requirements: ['ghost-step'],
      },
    ];
    const { repo } = repoWith({
      characters: { data: charRow({ experience_points: 5 }), error: null },
      games: { data: gameRow, error: null },
      rulesets: { data: rulesetRow(c), error: null },
    });
    const r = await repo.advanceCharacter('c1', 'u1', {
      type: 'ability',
      target: 'sharpshot',
      cost: 1,
      description: 'x',
    });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.code).toBe('REQUIREMENTS_UNMET');
  });

  it('rejects buying an ability already known', async () => {
    const { repo } = repoWith({
      characters: { data: charRow({ experience_points: 5 }), error: null },
      games: { data: gameRow, error: null },
      rulesets: { data: rulesetRow(content()), error: null },
    });
    const r = await repo.advanceCharacter('c1', 'u1', {
      type: 'ability',
      target: 'battle-born',
      cost: 2,
      description: 'x',
    });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.code).toBe('DUPLICATE_ABILITY');
  });

  it('spends XP and learns the ability on success', async () => {
    const { repo, lastUpdate } = repoWith({
      characters: { data: charRow({ experience_points: 5 }), error: null },
      games: { data: gameRow, error: null },
      rulesets: { data: rulesetRow(content()), error: null },
    });
    const r = await repo.advanceCharacter('c1', 'u1', {
      type: 'ability',
      target: 'sharpshot',
      cost: 2,
      description: 'Learn Sharpshot',
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.experiencePoints).toBe(3); // 5 - resolved cost (2)
      expect(r.data.characterData.specialAbilities).toContain('sharpshot');
    }
    // The persisted update deducted XP.
    expect(lastUpdate()?.data.experience_points).toBe(3);
  });

  it('raises an attribute and re-validates against the cap', async () => {
    const { repo } = repoWith({
      characters: {
        data: charRow({
          experience_points: 5,
          character_data: charData({ attributes: { grit: 4 } }),
        }),
        error: null,
      },
      games: { data: gameRow, error: null },
      rulesets: { data: rulesetRow(content()), error: null },
    });
    // grit is already at the cap (4); raising it must be rejected by the live re-validation.
    const r = await repo.advanceCharacter('c1', 'u1', {
      type: 'attribute',
      target: 'grit',
      value: 1,
      cost: 2,
      description: 'Raise Grit',
    });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.code).toBe('VALIDATION');
  });

  // --- XP-track economy (opt-in via advancement.xpTracks) -------------------------------------

  function trackContent() {
    return content({
      attributes: [{ id: 'grit', name: 'Grit', description: '', skills: ['Wreck'], maxValue: 4 }],
      advancement: {
        xpTracks: { playbook: 8, attribute: 6 },
        xpTriggers: [],
        advancementOptions: [
          { id: 'buy-ability', name: 'Buy', description: '', cost: 8, category: 'ability' },
          { id: 'action-dot', name: 'Dot', description: '', cost: 6, category: 'skill' },
        ],
      },
    });
  }

  it('rejects a track-mode advance when the track is not full', async () => {
    const { repo } = repoWith({
      characters: {
        data: charRow({ character_data: charData({ xp: { playbook: 3, attributes: {} } }) }),
        error: null,
      },
      games: { data: gameRow, error: null },
      rulesets: { data: rulesetRow(trackContent()), error: null },
    });
    const r = await repo.advanceCharacter('c1', 'u1', {
      type: 'ability',
      target: 'sharpshot',
      cost: 8,
      description: 'x',
    });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.code).toBe('XP_TRACK_NOT_FULL');
  });

  it('a full playbook track buys an ability, clears the track, and spends no pooled XP', async () => {
    const { repo, lastUpdate } = repoWith({
      characters: {
        data: charRow({
          experience_points: 0,
          character_data: charData({ xp: { playbook: 8, attributes: {} } }),
        }),
        error: null,
      },
      games: { data: gameRow, error: null },
      rulesets: { data: rulesetRow(trackContent()), error: null },
    });
    const r = await repo.advanceCharacter('c1', 'u1', {
      type: 'ability',
      target: 'sharpshot',
      cost: 8,
      description: 'Learn Sharpshot',
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.characterData.specialAbilities).toContain('sharpshot');
      expect(r.data.characterData.xp?.playbook).toBe(0); // track cleared
    }
    // No pooled XP changes hands in track mode.
    expect(lastUpdate()?.data.experience_points).toBeUndefined();
    expect(lastUpdate()?.data.character_data.xp.playbook).toBe(0);
  });

  it('a full attribute track buys an action dot and clears that track', async () => {
    const { repo, lastUpdate } = repoWith({
      characters: {
        data: charRow({
          character_data: charData({ xp: { playbook: 2, attributes: { grit: 6 } } }),
        }),
        error: null,
      },
      games: { data: gameRow, error: null },
      rulesets: { data: rulesetRow(trackContent()), error: null },
    });
    const r = await repo.advanceCharacter('c1', 'u1', {
      type: 'skill',
      target: 'Wreck',
      value: 1,
      cost: 6,
      description: 'Add a dot to Wreck',
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.characterData.skills.Wreck).toBe(1);
      expect(r.data.characterData.xp?.attributes.grit).toBe(0); // the grit track cleared
      expect(r.data.characterData.xp?.playbook).toBe(2); // the playbook track untouched
    }
    expect(lastUpdate()?.data.character_data.xp.attributes.grit).toBe(0);
  });
});

describe('validateCharacterAgainstRuleset', () => {
  it('returns a (succeeding) result carrying the validity verdict', async () => {
    const { repo } = repoWith({
      characters: { data: charRow({ character_data: charData({ stress: 100 }) }), error: null },
      games: { data: gameRow, error: null },
      rulesets: { data: rulesetRow(content()), error: null },
    });
    const r = await repo.validateCharacterAgainstRuleset('c1');
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.isValid).toBe(false);
      expect(r.data.errors.map(e => e.code)).toContain('STRESS_BOUNDS');
    }
  });
});
