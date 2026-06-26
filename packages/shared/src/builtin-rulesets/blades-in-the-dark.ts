// Blades in the Dark — a built-in ruleset.
//
// Uses the system's recognizable structure and names (attributes, the twelve actions, the seven
// playbooks, the crew types) from the Forged in the Dark SRD, which John Harper / One Seven Design
// licensed under CC BY 3.0. The attribution notice is recorded on the catalog entry in `index.ts`.
// All ability *rules text* below is original, concise mechanical wording written for HeistMind — it
// is not transcribed from the book's prose. Game mechanics aren't copyrightable; only expression is.
//
// Shape mirrors `default-ruleset.ts` / `e2e/fixtures/rulesets/cinders.json` so the creation wizard
// and the character-rules engine accept it unchanged: action-rating creation, BitD stress 9 / trauma
// 4, harm 2/2/1, XP tracks (playbook 8 / attribute 6).
import type { RulesetContent } from '@heist-mind/database';

export const BLADES_IN_THE_DARK: RulesetContent = {
  metadata: {
    name: 'Blades in the Dark',
    version: '1.0.0',
    author: 'John Harper / One Seven Design (CC BY 3.0)',
    description:
      'A daring crew of scoundrels seeking their fortunes in the haunted, industrial-fantasy city ' +
      'of Duskvol. The reference Forged-in-the-Dark system: rate your actions, push your luck on ' +
      'the dice, run your crew, and weather the consequences. Licensed under CC BY 3.0 — edit freely.',
    system: 'Forged in the Dark',
  },

  // The three BitD attributes, each listing its four actions. Action-rating creation rates the
  // twelve actions; the attribute rating is derived (count of its actions rated ≥ 1).
  attributes: [
    {
      id: 'insight',
      name: 'Insight',
      description: 'Perception, study, and clever hands.',
      skills: ['Hunt', 'Study', 'Survey', 'Tinker'],
      defaultValue: 0,
      maxValue: 4,
    },
    {
      id: 'prowess',
      name: 'Prowess',
      description: 'Athletics, stealth, and violence.',
      skills: ['Finesse', 'Prowl', 'Skirmish', 'Wreck'],
      defaultValue: 0,
      maxValue: 4,
    },
    {
      id: 'resolve',
      name: 'Resolve',
      description: 'Will, presence, and the occult.',
      skills: ['Attune', 'Command', 'Consort', 'Sway'],
      defaultValue: 0,
      maxValue: 4,
    },
  ],

  skills: [],

  playbooks: [
    {
      id: 'cutter',
      name: 'The Cutter',
      description: 'A dangerous and intimidating fighter who holds the line and breaks the rest.',
      startingAbilities: ['cutter-battleborn'],
      specialAbilities: [
        'cutter-battleborn',
        'cutter-bodyguard',
        'cutter-ghostfighter',
        'cutter-leadfighter',
        'cutter-mule',
        'cutter-savage',
        'cutter-vigorous',
      ],
      contacts: [
        { name: 'A crime boss', description: 'Pays well, forgets nothing.' },
        { name: 'A bare-knuckle champion', description: 'Owes you a fight, or a favor.' },
      ],
      equipment: ['blade', 'armor', 'heavy-blade'],
      attributes: {},
      skills: { Skirmish: 1 },
    },
    {
      id: 'hound',
      name: 'The Hound',
      description: 'A deadly marksman and tracker who never loses the trail.',
      startingAbilities: ['hound-deadeye'],
      specialAbilities: [
        'hound-deadeye',
        'hound-focused',
        'hound-ghosthunter',
        'hound-survivor',
        'hound-sharpshooter',
        'hound-tracker',
        'hound-vigorous',
      ],
      contacts: [
        { name: 'A bounty hunter', description: 'Shares leads — for a cut.' },
        { name: 'A pet hound or hawk', description: 'Loyal, and a useful set of senses.' },
      ],
      equipment: ['pistol', 'fine-rifle', 'spyglass'],
      attributes: {},
      skills: { Hunt: 1 },
    },
    {
      id: 'leech',
      name: 'The Leech',
      description: 'A saboteur, alchemist, and tinkerer who solves problems with the right tool.',
      startingAbilities: ['leech-alchemist'],
      specialAbilities: [
        'leech-alchemist',
        'leech-saboteur',
        'leech-physicker',
        'leech-venomous',
        'leech-fortitude',
        'leech-analyst',
        'leech-ghostward',
      ],
      contacts: [
        { name: 'An apothecary', description: 'Stocks rare reagents, asks no questions.' },
        { name: 'A surgeon', description: 'Patches the crew up after a bad score.' },
      ],
      equipment: ['tinkering-tools', 'alchemy-kit', 'documents'],
      attributes: {},
      skills: { Tinker: 1 },
    },
    {
      id: 'lurk',
      name: 'The Lurk',
      description: 'A stealthy infiltrator and burglar who is gone before anyone notices.',
      startingAbilities: ['lurk-infiltrator'],
      specialAbilities: [
        'lurk-infiltrator',
        'lurk-ambush',
        'lurk-ghost',
        'lurk-shadow',
        'lurk-daredevil',
        'lurk-reflexes',
        'lurk-expertise',
      ],
      contacts: [
        { name: 'A fence', description: 'Moves stolen goods, quietly.' },
        { name: 'A roof-runner', description: 'Knows every way over the city.' },
      ],
      equipment: ['burglary-gear', 'climbing-gear', 'blade'],
      attributes: {},
      skills: { Prowl: 1 },
    },
    {
      id: 'slide',
      name: 'The Slide',
      description: 'A subtle manipulator and spy who gets in close and turns people to their ends.',
      startingAbilities: ['slide-rooktwist'],
      specialAbilities: [
        'slide-rooktwist',
        'slide-mesmerism',
        'slide-cloakspider',
        'slide-likelooks',
        'slide-ghostvoice',
        'slide-coverid',
        'slide-acalculating',
      ],
      contacts: [
        { name: 'A double agent', description: 'Sells secrets in both directions.' },
        { name: 'A drug dealer', description: 'A useful in to the right rooms.' },
      ],
      equipment: ['fine-clothes', 'disguise-kit', 'documents'],
      attributes: {},
      skills: { Consort: 1 },
    },
    {
      id: 'spider',
      name: 'The Spider',
      description: 'A calculating mastermind who plans the score and pulls every string.',
      startingAbilities: ['spider-foresight'],
      specialAbilities: [
        'spider-foresight',
        'spider-calculating',
        'spider-connected',
        'spider-jailbird',
        'spider-functioningvice',
        'spider-mastermind',
        'spider-weavingwebs',
      ],
      contacts: [
        { name: 'A city official', description: 'Looks the other way, for a price.' },
        { name: 'A spirit trafficker', description: 'Deals in things best left buried.' },
      ],
      equipment: ['fine-clothes', 'documents', 'subterfuge-supplies'],
      attributes: {},
      skills: { Study: 1 },
    },
    {
      id: 'whisper',
      name: 'The Whisper',
      description: 'An arcane adept who bargains with ghosts and channels the electroplasmic dark.',
      startingAbilities: ['whisper-compel'],
      specialAbilities: [
        'whisper-compel',
        'whisper-tempest',
        'whisper-ghostmind',
        'whisper-warded',
        'whisper-ritual',
        'whisper-occultist',
        'whisper-strange',
      ],
      contacts: [
        {
          name: 'A spirit warden',
          description: 'Hunts ghosts — and notices those who court them.',
        },
        { name: 'A vampire', description: 'An ancient patron with an agenda.' },
      ],
      equipment: ['arcane-implements', 'spirit-mask', 'documents'],
      attributes: {},
      skills: { Attune: 1 },
    },
  ],

  // Concise, original mechanical wording — not the book's prose. Veteran-style picks are tier 2.
  specialAbilities: [
    // Cutter
    {
      id: 'cutter-battleborn',
      name: 'Battleborn',
      description: 'Trade armor for harm or for a push in a fight.',
      rules: 'You may expend your armor to reduce harm taken or to push yourself during a fight.',
      tier: 1,
      category: 'cutter',
    },
    {
      id: 'cutter-bodyguard',
      name: 'Bodyguard',
      description: 'Protect an ally with a hit of your own.',
      rules:
        'When you protect a teammate, take +1d to your resistance roll. You may expend armor to protect them instead of yourself.',
      tier: 1,
      category: 'cutter',
    },
    {
      id: 'cutter-ghostfighter',
      name: 'Ghost Fighter',
      description: 'Your strikes can wound the dead.',
      rules:
        'You can touch and grapple ghosts and your weapons harm spirits. You gain potency against the supernatural in close combat.',
      tier: 2,
      category: 'cutter',
    },
    {
      id: 'cutter-leadfighter',
      name: 'Leader',
      description: 'A cohort you lead in a group fight hits harder.',
      rules: 'When you lead a group action in combat, the cohorts you command gain +1 effect.',
      tier: 1,
      category: 'cutter',
    },
    {
      id: 'cutter-mule',
      name: 'Mule',
      description: 'Carry more without slowing down.',
      rules:
        'Your load limits are increased by 2. The maximum you can carry is raised accordingly.',
      tier: 1,
      category: 'cutter',
    },
    {
      id: 'cutter-savage',
      name: 'Savage',
      description: 'Terrify with sudden violence.',
      rules:
        'When you unleash brutal force, you gain +1d to intimidate. Frightened foes will believe you mean exactly what you threaten.',
      tier: 1,
      category: 'cutter',
    },
    {
      id: 'cutter-vigorous',
      name: 'Vigorous',
      description: 'Heal faster and shrug off the worst.',
      rules:
        'Your healing clock has fewer segments and you take reduced harm penalties at the moderate level. Recovery comes quickly to you.',
      tier: 2,
      category: 'cutter',
    },

    // Hound
    {
      id: 'hound-deadeye',
      name: 'Sharpshooter',
      description: 'Range and cover mean nothing to your aim.',
      rules:
        'You may take a ranged shot at extreme distance and ignore cover when you fire with care. Targeting at range counts as standard effect.',
      tier: 1,
      category: 'hound',
    },
    {
      id: 'hound-focused',
      name: 'Focused',
      description: 'Steady your nerves to act with precision.',
      rules:
        'Spend 1 stress to act with calm precision; you ignore distraction and chaos around you for that action.',
      tier: 1,
      category: 'hound',
    },
    {
      id: 'hound-ghosthunter',
      name: 'Ghost Hunter',
      description: 'Your prey includes the restless dead.',
      rules:
        'You have a trained animal or arcane tool that helps you track and harm spirits. Gain potency when hunting the supernatural.',
      tier: 2,
      category: 'hound',
    },
    {
      id: 'hound-survivor',
      name: 'Survivor',
      description: 'You weather hardship that breaks others.',
      rules:
        'Reduce stress costs to resist consequences of exposure, exhaustion, and the wilds. You recover stress more readily on the road.',
      tier: 1,
      category: 'hound',
    },
    {
      id: 'hound-sharpshooter',
      name: 'Scout',
      description: 'A keen eye for the lay of a place.',
      rules:
        'When you gather information by observing from a vantage, you also learn the best approach and any obvious dangers.',
      tier: 1,
      category: 'hound',
    },
    {
      id: 'hound-tracker',
      name: 'Tracker',
      description: 'No trail goes cold for you.',
      rules:
        'When you follow a target, take +1d to track and to anticipate where they will go next.',
      tier: 1,
      category: 'hound',
    },
    {
      id: 'hound-vigorous',
      name: 'Vigorous',
      description: 'Heal faster and shrug off the worst.',
      rules:
        'Your healing clock has fewer segments and you take reduced harm penalties at the moderate level.',
      tier: 2,
      category: 'hound',
    },

    // Leech
    {
      id: 'leech-alchemist',
      name: 'Alchemist',
      description: 'Brew potent formulas between scores.',
      rules:
        'You begin with a unique alchemical formula and can craft more during downtime. Your concoctions gain increased effect.',
      tier: 1,
      category: 'leech',
    },
    {
      id: 'leech-saboteur',
      name: 'Saboteur',
      description: 'Your wrecking is quiet and thorough.',
      rules:
        'When you destroy or disable a device, structure, or mechanism, the work is unobtrusive — nothing seems amiss until it fails.',
      tier: 1,
      category: 'leech',
    },
    {
      id: 'leech-physicker',
      name: 'Physicker',
      description: 'Tend the crew’s wounds skillfully.',
      rules:
        'You can treat harm. When you help someone heal, their recovery clock fills faster. Gain +1d to Tinker for medical work.',
      tier: 1,
      category: 'leech',
    },
    {
      id: 'leech-venomous',
      name: 'Venomous',
      description: 'You have built a tolerance — and a supply.',
      rules:
        'You are immune to a chosen toxin and carry a dose. You may apply it in the moment without preparation.',
      tier: 2,
      category: 'leech',
    },
    {
      id: 'leech-fortitude',
      name: 'Fortitude',
      description: 'Chemicals keep you on your feet.',
      rules:
        'Spend 1 stress to ignore the effects of fatigue, intoxication, or one tick of harm penalty for the rest of the scene.',
      tier: 1,
      category: 'leech',
    },
    {
      id: 'leech-analyst',
      name: 'Analyst',
      description: 'Read a device or a body for its secrets.',
      rules:
        'When you study a mechanism or examine the aftermath of an event, you gain an extra useful detail beyond your questions.',
      tier: 1,
      category: 'leech',
    },
    {
      id: 'leech-ghostward',
      name: 'Ghost Ward',
      description: 'Your craft holds spirits at bay.',
      rules:
        'You can build wards and traps that repel or contain ghosts. Spirits suffer reduced effect against your prepared defenses.',
      tier: 2,
      category: 'leech',
    },

    // Lurk
    {
      id: 'lurk-infiltrator',
      name: 'Infiltrator',
      description: 'Locks and alarms barely slow you.',
      rules:
        'You are never short of tools. When you bypass security obstacles, treat your effect as one level higher.',
      tier: 1,
      category: 'lurk',
    },
    {
      id: 'lurk-ambush',
      name: 'Ambush',
      description: 'Strike first, strike hard, from hiding.',
      rules: 'When you attack from concealment or surprise, you gain +1d and increased effect.',
      tier: 1,
      category: 'lurk',
    },
    {
      id: 'lurk-ghost',
      name: 'Ghost Veil',
      description: 'Slip briefly into the shadow realm.',
      rules:
        'Spend stress to become shadowy and insubstantial for a few moments — passing through bars and unseen, harder to harm.',
      tier: 2,
      category: 'lurk',
    },
    {
      id: 'lurk-shadow',
      name: 'Shadow',
      description: 'Move unseen and unheard.',
      rules:
        'When you move in stealth, you gain +1d to prowl. Pursuers lose your trail unless they are exceptionally keen.',
      tier: 1,
      category: 'lurk',
    },
    {
      id: 'lurk-daredevil',
      name: 'Daredevil',
      description: 'Recklessness pays off for you.',
      rules: 'When you take a desperate action without reducing its risk, gain +1d to the roll.',
      tier: 1,
      category: 'lurk',
    },
    {
      id: 'lurk-reflexes',
      name: 'Reflexes',
      description: 'You act first when it counts.',
      rules:
        'When there is a question of who acts first, you do. You react with uncanny speed to sudden danger.',
      tier: 1,
      category: 'lurk',
    },
    {
      id: 'lurk-expertise',
      name: 'Expertise',
      description: 'A signature method you have honed.',
      rules:
        'Choose one action; once per score, when you make a roll with it, you may roll a single extra die and keep the best result.',
      tier: 2,
      category: 'lurk',
    },

    // Slide
    {
      id: 'slide-rooktwist',
      name: 'Rook’s Gambit',
      description: 'Turn a misstep into a lure.',
      rules:
        'When you suffer a consequence, you may take 1 stress to turn it into an opportunity that misleads your mark.',
      tier: 1,
      category: 'slide',
    },
    {
      id: 'slide-mesmerism',
      name: 'Mesmerism',
      description: 'Smooth over what someone just saw.',
      rules:
        'When you spin a quick falsehood to an onlooker, you may cloud a recent memory or suspicion with stress instead of a roll.',
      tier: 2,
      category: 'slide',
    },
    {
      id: 'slide-cloakspider',
      name: 'Subterfuge',
      description: 'Hide in plain sight behind a role.',
      rules:
        'When you maintain a cover identity, suspicious onlookers suffer reduced effect to see through it.',
      tier: 1,
      category: 'slide',
    },
    {
      id: 'slide-likelooks',
      name: 'Like Looks',
      description: 'Win quick trust from a stranger.',
      rules:
        'When you first meet someone, you may have already cultivated a useful rapport or shared acquaintance. Gain +1d to consort them.',
      tier: 1,
      category: 'slide',
    },
    {
      id: 'slide-ghostvoice',
      name: 'Ghost Voice',
      description: 'Spirits answer when you speak.',
      rules:
        'You can speak with and sway ghosts as you would the living. Gain +1d to consort the dead.',
      tier: 2,
      category: 'slide',
    },
    {
      id: 'slide-coverid',
      name: 'Connected Cover',
      description: 'Your false self has real backing.',
      rules:
        'Establish a standing cover identity with its own contacts and standing. It holds up to casual scrutiny without effort.',
      tier: 1,
      category: 'slide',
    },
    {
      id: 'slide-acalculating',
      name: 'Cold Read',
      description: 'You see what a person wants.',
      rules:
        'When you study someone in conversation, you learn their desire, their fear, or how to best appeal to them.',
      tier: 1,
      category: 'slide',
    },

    // Spider
    {
      id: 'spider-foresight',
      name: 'Foresight',
      description: 'You planned for this.',
      rules:
        'Once per score, declare a small preparation you made in advance, no flashback roll required, to smooth the way.',
      tier: 1,
      category: 'spider',
    },
    {
      id: 'spider-calculating',
      name: 'Calculating',
      description: 'Cheaper flashbacks, sharper plans.',
      rules:
        'Reduce the stress cost of your flashbacks by 1 (minimum 0). Your forethought is hard to catch out.',
      tier: 1,
      category: 'spider',
    },
    {
      id: 'spider-connected',
      name: 'Connected',
      description: 'You always know someone useful.',
      rules:
        'During downtime, your reduce-heat and acquire-asset efforts gain +1 result level thanks to your web of contacts.',
      tier: 1,
      category: 'spider',
    },
    {
      id: 'spider-jailbird',
      name: 'Jailbird',
      description: 'Prison holds no fear for you.',
      rules:
        'When you serve time, reduce the level of any incarceration penalty. You keep your contacts and standing inside.',
      tier: 1,
      category: 'spider',
    },
    {
      id: 'spider-functioningvice',
      name: 'Functioning Vice',
      description: 'Your indulgence never gets the better of you.',
      rules: 'When you indulge your vice, you may resist any overindulgence consequence for free.',
      tier: 1,
      category: 'spider',
    },
    {
      id: 'spider-mastermind',
      name: 'Mastermind',
      description: 'Spend your own nerve to steady an ally.',
      rules:
        'You may take 1 stress to help a teammate without being present, having anticipated their need.',
      tier: 2,
      category: 'spider',
    },
    {
      id: 'spider-weavingwebs',
      name: 'Weaving Webs',
      description: 'Set rivals against one another.',
      rules:
        'When you scheme against a faction during downtime, your project clock fills faster and your involvement stays hidden.',
      tier: 2,
      category: 'spider',
    },

    // Whisper
    {
      id: 'whisper-compel',
      name: 'Compel',
      description: 'Summon and bind a nearby ghost.',
      rules:
        'You can call a lingering spirit and command a single task of it. Hostile ghosts may resist with their own will.',
      tier: 1,
      category: 'whisper',
    },
    {
      id: 'whisper-tempest',
      name: 'Tempest',
      description: 'Unleash the raw electroplasmic storm.',
      rules:
        'Channel destructive energy as a ranged or area attack. Spend stress to increase its effect; bystanders may be caught in it.',
      tier: 2,
      category: 'whisper',
    },
    {
      id: 'whisper-ghostmind',
      name: 'Ghost Mind',
      description: 'Your senses reach into the spectral.',
      rules:
        'You perceive ghosts, ghost-doors, and lingering arcane energy. Gain +1d to attune when navigating the spirit world.',
      tier: 1,
      category: 'whisper',
    },
    {
      id: 'whisper-warded',
      name: 'Warded',
      description: 'Spirits struggle to touch you.',
      rules:
        'Ghosts and possessing entities suffer reduced effect against you, and you gain +1d to resist their influence.',
      tier: 1,
      category: 'whisper',
    },
    {
      id: 'whisper-ritual',
      name: 'Ritual',
      description: 'Work greater magic with time and preparation.',
      rules:
        'You know how to perform rituals. During downtime you may research and enact a ritual to achieve a significant arcane effect.',
      tier: 1,
      category: 'whisper',
    },
    {
      id: 'whisper-occultist',
      name: 'Occultist',
      description: 'You know the city’s hidden powers.',
      rules:
        'When you gather information about the supernatural or the powerful entities of the world, ask one extra question.',
      tier: 1,
      category: 'whisper',
    },
    {
      id: 'whisper-strange',
      name: 'Strange Methods',
      description: 'Trade flesh for arcane potency.',
      rules:
        'When you push yourself for an arcane action, you may take harm instead of stress to fuel the power.',
      tier: 2,
      category: 'whisper',
    },
  ],

  equipment: {
    loadCapacity: { light: 3, normal: 5, heavy: 6 },
    items: [
      {
        id: 'blade',
        name: 'A Blade or Two',
        description: 'Quick, concealable steel.',
        load: 1,
        category: 'weapon',
      },
      {
        id: 'heavy-blade',
        name: 'A Large Weapon',
        description: 'A sword, axe, or club.',
        load: 2,
        category: 'weapon',
      },
      {
        id: 'pistol',
        name: 'A Pistol',
        description: 'Or a brace of them.',
        load: 1,
        category: 'weapon',
      },
      {
        id: 'fine-rifle',
        name: 'A Fine Rifle',
        description: 'Long-range and reliable.',
        load: 2,
        category: 'weapon',
      },
      {
        id: 'armor',
        name: 'Armor',
        description: 'Spend it to shrug off harm.',
        load: 2,
        category: 'gear',
      },
      {
        id: 'burglary-gear',
        name: 'Burglary Gear',
        description: 'Picks, pries, and wires.',
        load: 1,
        category: 'gear',
      },
      {
        id: 'climbing-gear',
        name: 'Climbing Gear',
        description: 'Lines, hooks, and clamps.',
        load: 2,
        category: 'gear',
      },
      {
        id: 'tinkering-tools',
        name: 'Tinkering Tools',
        description: 'For fixing and breaking.',
        load: 1,
        category: 'gear',
      },
      {
        id: 'alchemy-kit',
        name: 'Alchemy Supplies',
        description: 'Reagents and apparatus.',
        load: 1,
        category: 'gear',
      },
      {
        id: 'arcane-implements',
        name: 'Arcane Implements',
        description: 'Foci for the occult arts.',
        load: 1,
        category: 'gear',
      },
      {
        id: 'spirit-mask',
        name: 'Spirit Mask',
        description: 'Shields the mind from spirits.',
        load: 1,
        category: 'gear',
      },
      {
        id: 'documents',
        name: 'Documents',
        description: 'Papers, maps, and ledgers.',
        load: 0,
        category: 'gear',
      },
      {
        id: 'subterfuge-supplies',
        name: 'Subterfuge Supplies',
        description: 'Forgery and small cons.',
        load: 1,
        category: 'gear',
      },
      {
        id: 'disguise-kit',
        name: 'A Disguise',
        description: 'Become someone else.',
        load: 1,
        category: 'gear',
      },
      {
        id: 'fine-clothes',
        name: 'Fine Clothes',
        description: 'Open the right doors.',
        load: 1,
        category: 'gear',
      },
      {
        id: 'spyglass',
        name: 'A Spyglass',
        description: 'See the score from afar.',
        load: 0,
        category: 'gear',
      },
    ],
    categories: [
      { id: 'weapon', name: 'Weapons', description: 'Things that end arguments.' },
      { id: 'gear', name: 'Gear', description: 'Tools of the trade.' },
    ],
  },

  advancement: {
    xpTriggers: [
      {
        id: 'desperate',
        name: 'Desperate Action',
        description: 'Mark XP the first time you roll a desperate action in a session.',
        value: 1,
      },
      {
        id: 'playbook',
        name: 'Express Your Playbook',
        description:
          'Mark playbook XP when you express your beliefs, drives, heritage, or background.',
        value: 1,
      },
      {
        id: 'struggle',
        name: 'Struggle With Vice',
        description: 'Mark XP when you struggle with trouble from your vice or traumas.',
        value: 1,
      },
    ],
    advancementOptions: [
      {
        id: 'buy-ability',
        name: 'New Special Ability',
        description: 'When your playbook track fills, take a new special ability.',
        cost: 0,
        category: 'ability',
      },
      {
        id: 'buy-action',
        name: 'Add an Action Dot',
        description: 'When an attribute track fills, add a dot to one of that attribute’s actions.',
        cost: 0,
        category: 'skill',
      },
    ],
    xpTracks: { playbook: 8, attribute: 6 },
  },

  characterCreation: {
    actionRatings: { points: 7, maxAtCreation: 2, max: 3 },
    abilityChoices: 1,
    steps: [
      {
        id: 'playbook',
        name: 'Choose Your Playbook',
        description: 'Pick the kind of scoundrel you are.',
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
        description: 'Pick the ability that defines your edge.',
        order: 3,
        required: false,
      },
      {
        id: 'identity',
        name: 'Heritage, Background & Vice',
        description: 'Where you come from, what you did before, and the vice that steadies you.',
        order: 4,
        required: false,
      },
      {
        id: 'review',
        name: 'Review',
        description: 'Look over the sheet and join the crew.',
        order: 5,
        required: true,
      },
    ],
  },

  stress: { max: 9, traumaMax: 4 },
  harm: { lesser: 2, moderate: 2, severe: 1 },

  crew: {
    types: [
      { id: 'assassins', name: 'Assassins', description: 'A band of killers for hire.' },
      { id: 'bravos', name: 'Bravos', description: 'A mercenary gang of muscle and menace.' },
      { id: 'cult', name: 'Cult', description: 'Acolytes serving a forgotten god or dark power.' },
      { id: 'hawkers', name: 'Hawkers', description: 'Dealers who sell vice across the city.' },
      { id: 'shadows', name: 'Shadows', description: 'Thieves, burglars, and infiltrators.' },
      {
        id: 'smugglers',
        name: 'Smugglers',
        description: 'Runners who move contraband past the law.',
      },
    ],
    abilities: [
      {
        id: 'crew-deadly',
        name: 'Deadly',
        description: 'Each crew member gains an action dot in a chosen attribute.',
      },
      {
        id: 'crew-no-traces',
        name: 'No Traces',
        description: 'When you reduce heat after a score, reduce it by an extra amount.',
      },
      {
        id: 'crew-the-good-stuff',
        name: 'The Good Stuff',
        description: 'Your product is potent — coin from sales rolls with +1d.',
      },
      {
        id: 'crew-network',
        name: 'The Connections',
        description: 'Take +1d to acquire assets during downtime.',
      },
      {
        id: 'crew-deadly-friends',
        name: 'Deadly Friends',
        description: 'Your cohorts are elite — they roll with increased effect.',
      },
      {
        id: 'crew-patron',
        name: 'Patron',
        description: 'A powerful backer provides coin or cover when you call on them.',
      },
      {
        id: 'crew-fortified',
        name: 'Fortified',
        description: 'Your lair is hardened — gain +1d to resist intrusion and raids.',
      },
    ],
    claims: [
      'Lair',
      'Turf',
      'Cover Operation',
      'Eye for Gems',
      'Informants',
      'Protection Racket',
      'Vice Den',
      'Smuggling Routes',
      'Cover Identity',
      'Boltholes',
    ],
  },

  factions: [
    {
      name: 'The Bluecoats',
      type: 'City',
      tier: 3,
      description: 'The city watch — corrupt, but everywhere.',
    },
    {
      name: 'The Spirit Wardens',
      type: 'Institution',
      tier: 4,
      description: 'They hunt ghosts and dispose of the dead.',
    },
    {
      name: 'The Lampblacks',
      type: 'Underworld',
      tier: 2,
      description: 'A rough gang of oil-soaked thugs.',
    },
    {
      name: 'The Red Sashes',
      type: 'Underworld',
      tier: 2,
      description: 'Disciplined sword-fighters and rivals.',
    },
    {
      name: 'The Crows',
      type: 'Underworld',
      tier: 0,
      description: 'A leaderless gang ripe for the taking.',
    },
    {
      name: 'The Circle of Flame',
      type: 'Nobility',
      tier: 4,
      description: 'An occult society of wealthy schemers.',
    },
  ],
};
