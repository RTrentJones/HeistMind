// Wicked Ones — a built-in ruleset (dungeon-keeping Forged in the Dark).
//
// Wicked Ones was released by Bandit Camp into the public domain under CC0 1.0, so its content is
// free to use. The structure and names below are an original HeistMind adaptation of that game's
// premise — play the monsters, dig out a dungeon, raid the surface, fend off heroes — written to fit
// HeistMind's engine. All rules text is original, concise mechanical wording.
//
// The dungeon is modeled as the crew (a single `crew.types` entry), its loot as an optional
// `crew.resourcePools` track, and its rooms/defenses as crew claims. Otherwise it's a standard
// action-rating FitD ruleset (stress 9 / trauma 4, harm 2/2/1, XP tracks).
import type { RulesetContent } from '@heist-mind/database';

export const WICKED_ONES: RulesetContent = {
  metadata: {
    name: 'Wicked Ones',
    version: '1.0.0',
    author: 'Adapted from Wicked Ones (Bandit Camp, CC0)',
    description:
      'Play the monsters. A band of wicked ones digs out a dungeon lair, hoards plunder, raids the ' +
      'soft surface world, and slaughters the so-called heroes who come to "cleanse" them. An ' +
      'original Forged-in-the-Dark adaptation of the public-domain dungeon-keeper game. Edit freely.',
    system: 'Forged in the Dark',
  },

  attributes: [
    {
      id: 'brutality',
      name: 'Brutality',
      description: 'Raw violence, ferocity, and the joy of the kill.',
      skills: ['Smash', 'Hunt', 'Scrap', 'Wreck'],
      defaultValue: 0,
      maxValue: 4,
    },
    {
      id: 'cunning',
      name: 'Cunning',
      description: 'Stealth, scheming, traps, and dirty tricks.',
      skills: ['Skulk', 'Tinker', 'Scout', 'Scavenge'],
      defaultValue: 0,
      maxValue: 4,
    },
    {
      id: 'wickedness',
      name: 'Wickedness',
      description: 'Dark magic, presence, and unholy will.',
      skills: ['Channel', 'Command', 'Consort', 'Sway'],
      defaultValue: 0,
      maxValue: 4,
    },
  ],

  skills: [],

  playbooks: [
    {
      id: 'brute',
      name: 'The Brute',
      description: 'A hulking slab of muscle and rage that breaks anything in its way.',
      startingAbilities: ['brute-unstoppable'],
      specialAbilities: [
        'brute-unstoppable',
        'brute-thickhide',
        'brute-roar',
        'brute-rampage',
        'brute-hurl',
      ],
      contacts: [{ name: 'A pit of lesser brutes', description: 'They follow the biggest.' }],
      equipment: ['great-club', 'trophy-hide', 'chains'],
      attributes: {},
      skills: { Smash: 2, Scrap: 1 },
    },
    {
      id: 'sneak',
      name: 'The Sneak',
      description: 'A skittering, knife-in-the-dark monster that strikes from the shadows.',
      startingAbilities: ['sneak-backstab'],
      specialAbilities: [
        'sneak-backstab',
        'sneak-skitter',
        'sneak-trapper',
        'sneak-pilferer',
        'sneak-vanish',
      ],
      contacts: [{ name: 'A goblin black-market', description: 'Buys and sells anything shiny.' }],
      equipment: ['poison-dagger', 'trap-kit', 'climbing-claws'],
      attributes: {},
      skills: { Skulk: 2, Scout: 1 },
    },
    {
      id: 'shaman',
      name: 'The Shaman',
      description: 'A dark caster who channels the spite of old, hungry gods.',
      startingAbilities: ['shaman-darkmagic'],
      specialAbilities: [
        'shaman-darkmagic',
        'shaman-curse',
        'shaman-ritualist',
        'shaman-bloodpact',
        'shaman-summoner',
      ],
      contacts: [{ name: 'A whispering idol', description: 'Demands offerings, grants power.' }],
      equipment: ['bone-totem', 'ritual-supplies', 'cursed-relic'],
      attributes: {},
      skills: { Channel: 2, Consort: 1 },
    },
    {
      id: 'warlord',
      name: 'The Warlord',
      description: 'A commanding tyrant who drives the warband and the minions to ruin.',
      startingAbilities: ['warlord-command'],
      specialAbilities: [
        'warlord-command',
        'warlord-tactician',
        'warlord-dread',
        'warlord-warbanner',
        'warlord-overseer',
      ],
      contacts: [{ name: 'A pack of minions', description: 'Loyal so long as you win.' }],
      equipment: ['cruel-blade', 'warhorn', 'banner'],
      attributes: {},
      skills: { Command: 2, Sway: 1 },
    },
    {
      id: 'breaker',
      name: 'The Breaker',
      description: 'A mad tinker-monster who builds traps, contraptions, and worse.',
      startingAbilities: ['breaker-contraption'],
      specialAbilities: [
        'breaker-contraption',
        'breaker-demolitions',
        'breaker-scavenger',
        'breaker-tinker',
        'breaker-fortifier',
      ],
      contacts: [{ name: 'A scrap-warren', description: 'Endless junk to plunder for parts.' }],
      equipment: ['tool-rig', 'blast-charges', 'salvage'],
      attributes: {},
      skills: { Tinker: 2, Scavenge: 1 },
    },
  ],

  specialAbilities: [
    // Brute
    {
      id: 'brute-unstoppable',
      name: 'Unstoppable',
      description: 'Shrug off blows that would fell others.',
      rules:
        'You may take 1 stress to ignore the penalty of a harm level for the rest of the scene.',
      tier: 1,
      category: 'brute',
    },
    {
      id: 'brute-thickhide',
      name: 'Thick Hide',
      description: 'Your skin is its own armor.',
      rules: 'You have an extra armor box that refreshes when you indulge your vice.',
      tier: 1,
      category: 'brute',
    },
    {
      id: 'brute-roar',
      name: 'Terrifying Roar',
      description: 'Scatter the weak with a bellow.',
      rules: 'When you roar, lesser foes flee or cower. Gain +1d to intimidate a group.',
      tier: 1,
      category: 'brute',
    },
    {
      id: 'brute-rampage',
      name: 'Rampage',
      description: 'The more you break, the harder you hit.',
      rules:
        'When you destroy something on your turn, gain +1 effect on your next attack this scene.',
      tier: 2,
      category: 'brute',
    },
    {
      id: 'brute-hurl',
      name: 'Hurl',
      description: 'Throw foes and furniture alike.',
      rules:
        'You can lift and throw heavy objects or people as a weapon. Treat such attacks as having increased effect.',
      tier: 1,
      category: 'brute',
    },

    // Sneak
    {
      id: 'sneak-backstab',
      name: 'Backstab',
      description: 'A strike from hiding is a killing blow.',
      rules: 'When you attack an unaware target, gain +1d and increased effect.',
      tier: 1,
      category: 'sneak',
    },
    {
      id: 'sneak-skitter',
      name: 'Skitter',
      description: 'Climb and crawl anywhere, fast.',
      rules:
        'You can scuttle across walls and ceilings. Gain +1d to prowl through cramped or vertical spaces.',
      tier: 1,
      category: 'sneak',
    },
    {
      id: 'sneak-trapper',
      name: 'Trapper',
      description: 'You litter the dark with nasty surprises.',
      rules:
        'You can set a trap quickly with materials at hand. Triggered traps deal increased effect.',
      tier: 1,
      category: 'sneak',
    },
    {
      id: 'sneak-pilferer',
      name: 'Pilferer',
      description: 'Your sticky fingers never come back empty.',
      rules: 'When you scavenge or steal during a raid, you find an extra useful or valuable item.',
      tier: 1,
      category: 'sneak',
    },
    {
      id: 'sneak-vanish',
      name: 'Vanish',
      description: 'Be gone before the blow lands.',
      rules:
        'Spend 1 stress to slip out of sight and reposition, even when watched, so long as there is any shadow to take.',
      tier: 2,
      category: 'sneak',
    },

    // Shaman
    {
      id: 'shaman-darkmagic',
      name: 'Dark Magic',
      description: 'Hurl spite as raw power.',
      rules:
        'You can cast a harmful or warping spell. Spend stress to raise its effect; the magic may have unsavory side effects.',
      tier: 1,
      category: 'shaman',
    },
    {
      id: 'shaman-curse',
      name: 'Curse',
      description: 'Lay a lingering hex on a foe.',
      rules:
        'When you curse a target you have a token of, they suffer reduced effect against you and yours until the curse is broken.',
      tier: 1,
      category: 'shaman',
    },
    {
      id: 'shaman-ritualist',
      name: 'Ritualist',
      description: 'Greater magic, given time and blood.',
      rules:
        'During downtime you may perform a ritual for a significant dark effect, fueled by sacrifice or plunder.',
      tier: 1,
      category: 'shaman',
    },
    {
      id: 'shaman-bloodpact',
      name: 'Blood Pact',
      description: 'Pay in flesh for power.',
      rules: 'When you channel, you may take harm instead of stress to fuel the magic.',
      tier: 2,
      category: 'shaman',
    },
    {
      id: 'shaman-summoner',
      name: 'Summoner',
      description: 'Call lesser horrors to your side.',
      rules:
        'You can summon a minor servitor for a scene. It acts as a weak cohort under your command.',
      tier: 2,
      category: 'shaman',
    },

    // Warlord
    {
      id: 'warlord-command',
      name: 'Command',
      description: 'Drive minions beyond their nature.',
      rules:
        'When you lead a group action, the minions you command gain +1 effect, and you may take their stress as your own.',
      tier: 1,
      category: 'warlord',
    },
    {
      id: 'warlord-tactician',
      name: 'Tactician',
      description: 'A plan for every battlefield.',
      rules: 'Reduce the stress cost of your battle flashbacks by 1 (minimum 0).',
      tier: 1,
      category: 'warlord',
    },
    {
      id: 'warlord-dread',
      name: 'Dread Presence',
      description: 'Your displeasure is deadly.',
      rules:
        'Underlings obey out of fear; gain +1d to command those who serve you, and they will not break ranks easily.',
      tier: 1,
      category: 'warlord',
    },
    {
      id: 'warlord-warbanner',
      name: 'War Banner',
      description: 'Rally the warband around your standard.',
      rules:
        'While your banner stands, allied cohorts resist morale loss and gain +1d to hold a position.',
      tier: 2,
      category: 'warlord',
    },
    {
      id: 'warlord-overseer',
      name: 'Overseer',
      description: 'Wring more from the dungeon’s labor.',
      rules:
        'When the dungeon undertakes a project during downtime, its clock fills faster under your lash.',
      tier: 1,
      category: 'warlord',
    },

    // Breaker
    {
      id: 'breaker-contraption',
      name: 'Contraption',
      description: 'Bolt together a wicked device.',
      rules:
        'You can build a single-use contraption during downtime that produces a notable mechanical effect when sprung.',
      tier: 1,
      category: 'breaker',
    },
    {
      id: 'breaker-demolitions',
      name: 'Demolitions',
      description: 'You make things explode on cue.',
      rules:
        'Your blasting charges have increased effect and you can rig them to detonate exactly when you wish.',
      tier: 1,
      category: 'breaker',
    },
    {
      id: 'breaker-scavenger',
      name: 'Scavenger',
      description: 'Turn junk into treasure.',
      rules:
        'When you scavenge wreckage or spoils, gain +1d, and you can fashion a needed tool from scrap on the spot.',
      tier: 1,
      category: 'breaker',
    },
    {
      id: 'breaker-tinker',
      name: 'Master Tinker',
      description: 'Locks and mechanisms hold no secrets.',
      rules:
        'When you bypass or sabotage a device or mechanism, treat your effect as one level higher.',
      tier: 1,
      category: 'breaker',
    },
    {
      id: 'breaker-fortifier',
      name: 'Fortifier',
      description: 'Turn the lair into a death trap.',
      rules:
        'When you build defenses for the dungeon, gain +1d. Intruders suffer reduced effect against your fortifications.',
      tier: 2,
      category: 'breaker',
    },
  ],

  equipment: {
    loadCapacity: { light: 3, normal: 5, heavy: 6 },
    items: [
      {
        id: 'great-club',
        name: 'A Great Club',
        description: 'Crude, heavy, effective.',
        load: 2,
        category: 'weapon',
      },
      {
        id: 'cruel-blade',
        name: 'A Cruel Blade',
        description: 'Notched and stained.',
        load: 1,
        category: 'weapon',
      },
      {
        id: 'poison-dagger',
        name: 'A Poisoned Dagger',
        description: 'A nick is enough.',
        load: 1,
        category: 'weapon',
      },
      {
        id: 'trophy-hide',
        name: 'Trophy Hide',
        description: 'Thick armor from a past kill.',
        load: 2,
        category: 'gear',
      },
      {
        id: 'trap-kit',
        name: 'Trap Kit',
        description: 'Snares, spikes, and triggers.',
        load: 1,
        category: 'gear',
      },
      {
        id: 'climbing-claws',
        name: 'Climbing Claws',
        description: 'For walls and throats.',
        load: 1,
        category: 'gear',
      },
      {
        id: 'bone-totem',
        name: 'Bone Totem',
        description: 'A focus for dark magic.',
        load: 0,
        category: 'gear',
      },
      {
        id: 'ritual-supplies',
        name: 'Ritual Supplies',
        description: 'Chalk, blood, and worse.',
        load: 1,
        category: 'gear',
      },
      {
        id: 'cursed-relic',
        name: 'Cursed Relic',
        description: 'Powerful, and hungry.',
        load: 0,
        category: 'gear',
      },
      {
        id: 'warhorn',
        name: 'War Horn',
        description: 'Summons the warband.',
        load: 0,
        category: 'gear',
      },
      {
        id: 'banner',
        name: 'War Banner',
        description: 'A standard to rally around.',
        load: 1,
        category: 'gear',
      },
      {
        id: 'tool-rig',
        name: 'Tinker’s Rig',
        description: 'A clattering kit of tools.',
        load: 1,
        category: 'gear',
      },
      {
        id: 'blast-charges',
        name: 'Blast Charges',
        description: 'For breaking down doors and heroes.',
        load: 1,
        category: 'weapon',
      },
      {
        id: 'salvage',
        name: 'Sack of Salvage',
        description: 'Useful junk.',
        load: 1,
        category: 'gear',
      },
      {
        id: 'chains',
        name: 'Heavy Chains',
        description: 'For dragging captives.',
        load: 1,
        category: 'gear',
      },
    ],
    categories: [
      { id: 'weapon', name: 'Weapons', description: 'For rending heroes.' },
      { id: 'gear', name: 'Gear', description: 'Tools of wickedness.' },
    ],
  },

  advancement: {
    xpTriggers: [
      {
        id: 'desperate',
        name: 'Desperate Deed',
        description: 'Mark XP the first time you roll a desperate action in a session.',
        value: 1,
      },
      {
        id: 'wicked',
        name: 'Be Wicked',
        description: 'Mark XP when you act on your monstrous nature or calling.',
        value: 1,
      },
      {
        id: 'plunder',
        name: 'Plunder & Slaughter',
        description: 'Mark XP when you raid the surface or butcher would-be heroes.',
        value: 1,
      },
    ],
    advancementOptions: [
      {
        id: 'buy-ability',
        name: 'New Special Ability',
        description: 'When your calling track fills, take a new special ability.',
        cost: 0,
        category: 'ability',
      },
      {
        id: 'buy-action',
        name: 'Add an Action Dot',
        description: 'When an attribute track fills, add a dot to one of its actions.',
        cost: 0,
        category: 'skill',
      },
    ],
    xpTracks: { playbook: 8, attribute: 6 },
  },

  characterCreation: {
    // Playbooks pre-place 3 action dots (seeded above); the player assigns 4 more, max 2 at
    // creation — 7 total. Actions cap at 3 (4 via the dungeon's mastery upgrade).
    actionRatings: { points: 4, maxAtCreation: 2, max: 3 },
    abilityChoices: 1,
    steps: [
      {
        id: 'playbook',
        name: 'Choose Your Calling',
        description: 'Pick the kind of monster you are.',
        order: 1,
        required: true,
      },
      {
        id: 'action-ratings',
        name: 'Assign Action Ratings',
        description: 'Spend dots across the twelve actions (max 2 each at creation).',
        order: 2,
        required: true,
      },
      {
        id: 'special-abilities',
        name: 'Choose a Special Ability',
        description: 'Pick the wicked trick that defines you.',
        order: 3,
        required: false,
      },
      {
        id: 'identity',
        name: 'Kind, Origin & Vice',
        description: 'Your monstrous kind, where you crawled from, and the vice that sates you.',
        order: 4,
        required: false,
      },
      {
        id: 'review',
        name: 'Review',
        description: 'Look over the sheet and join the warband.',
        order: 5,
        required: true,
      },
    ],
  },

  stress: { max: 9, traumaMax: 4 },
  harm: { lesser: 2, moderate: 2, severe: 1 },

  crew: {
    types: [
      {
        id: 'dungeon',
        name: 'The Dungeon',
        description: 'Your shared lair: the warband and the warren it defends.',
      },
    ],
    abilities: [
      {
        id: 'dungeon-deep-delve',
        name: 'Deep Delve',
        description: 'Your warren runs deep — gain +1d to resist intruders reaching the heart.',
      },
      {
        id: 'dungeon-feared',
        name: 'Feared',
        description: 'The surface dreads you; gain +1d to cow or extort nearby settlements.',
      },
      {
        id: 'dungeon-hoarders',
        name: 'Hoarders',
        description: 'Plunder goes further — gain +1d when spending loot on dungeon projects.',
      },
      {
        id: 'dungeon-breeding-pits',
        name: 'Breeding Pits',
        description: 'Your minions replenish quickly; cohorts recover after a raid.',
      },
      {
        id: 'dungeon-dark-blessing',
        name: 'Dark Blessing',
        description: 'A patron power aids your rituals; reduce their stress cost by 1.',
      },
      {
        id: 'dungeon-warrens',
        name: 'Hidden Warrens',
        description:
          'Escape tunnels riddle the lair; gain +1d to flee or reposition during a defense.',
      },
    ],
    claims: [
      'Throne Room',
      'Treasure Vault',
      'Trap Corridors',
      'Breeding Pits',
      'Ritual Sanctum',
      'Beast Pens',
      'Hidden Tunnels',
      'Murder Holes',
      'Slave Pits',
      'Black Market Stall',
    ],
    resourcePools: [
      {
        id: 'hoard',
        name: 'Hoard',
        description:
          'Plunder stockpiled in the vault — spent on dungeon projects, upgrades, and bribes.',
        max: 12,
        startsAt: 0,
      },
      {
        id: 'threat',
        name: 'Threat',
        description: 'How much the surface world has noticed you. High threat draws bigger heroes.',
        max: 8,
        startsAt: 0,
      },
    ],
  },

  factions: [
    {
      name: 'The Kingdom of Men',
      type: 'Surface Power',
      tier: 5,
      description: 'The soft realm whose villages you raid.',
    },
    {
      name: 'The Heroes’ Guild',
      type: 'Surface Power',
      tier: 4,
      description: 'They send "adventurers" to cleanse your lair.',
    },
    {
      name: 'The Goblin Market',
      type: 'Underworld',
      tier: 2,
      description: 'Trades in plunder, secrets, and worse.',
    },
    {
      name: 'A Rival Warband',
      type: 'Monsters',
      tier: 2,
      description: 'Other wicked ones who covet your territory.',
    },
    {
      name: 'The Old Gods',
      type: 'Dark Power',
      tier: 4,
      description: 'Hungry patrons who grant power for offerings.',
    },
  ],
};
