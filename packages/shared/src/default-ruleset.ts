// Brackwater — the built-in starter ruleset.
//
// A reskinned Forged-in-the-Dark system: original setting + names, FitD-compatible mechanics.
// The Blades in the Dark SRD is openly licensed for derivative/reskinned systems and the
// "Forged in the Dark" name; game mechanics aren't copyrightable. Everything here (setting,
// playbook names, ability names + prose) is original expression to stay clear of the BitD
// setting/text. Shapes mirror `e2e/fixtures/rulesets/cinders.json` so the creation wizard and
// the `character-rules` validation engine accept it unchanged.
//
// Setting: Brackwater, a drowned, lantern-lit canal city of smugglers under perpetual storm,
// where the dead rise from the water as the "Tide-touched" and fortunes are cut from smuggled
// saltglass. Every name below is content — rename freely by editing this file.
import type { RulesetContent } from '@heist-mind/database';

export const DEFAULT_RULESET: RulesetContent = {
  metadata: {
    name: 'Brackwater',
    version: '1.0.0',
    author: 'HeistMind',
    description:
      'A starter Forged-in-the-Dark ruleset. Play a crew of scoundrels in the drowned canal ' +
      'city of Brackwater — heists, rivalries, the restless Tide-touched, and fortunes made in ' +
      'smuggled saltglass. Original setting; FitD-compatible mechanics. Edit freely.',
    system: 'Forged in the Dark',
  },

  // Three attributes (BitD Insight/Prowess/Resolve, reskinned); each lists its four actions as
  // flavor. Point-buy in the wizard is on the three attributes (v1), so `skills` stays [].
  attributes: [
    {
      id: 'cunning',
      name: 'Cunning',
      description: 'Perception, study, and a knack for angles and machinery.',
      skills: ['Track', 'Examine', 'Scout', 'Rig'],
      defaultValue: 0,
      maxValue: 4,
    },
    {
      id: 'force',
      name: 'Force',
      description: 'Speed, stealth, and the will to do harm and weather it.',
      skills: ['Sleight', 'Skulk', 'Clash', 'Wreck'],
      defaultValue: 0,
      maxValue: 4,
    },
    {
      id: 'nerve',
      name: 'Nerve',
      description: 'Presence, command, and an unshakable spirit.',
      skills: ['Channel', 'Marshal', 'Mingle', 'Coax'],
      defaultValue: 0,
      maxValue: 4,
    },
  ],

  skills: [],

  playbooks: [
    {
      id: 'knife',
      name: 'The Knife',
      description: 'A dangerous enforcer who settles debts with steel and a level stare.',
      startingAbilities: ['knife-scarred'],
      specialAbilities: [
        'knife-scarred',
        'knife-bulwark',
        'knife-duelist',
        'knife-captain',
        'knife-packhorse',
        'knife-brutal',
        'knife-hardy',
      ],
      contacts: [
        { name: 'Vesh', description: 'A fence who never forgets a face — or a debt.' },
        { name: 'Old Marrow', description: 'A back-alley surgeon who asks no questions.' },
      ],
      equipment: ['blade', 'armor', 'large-weapon'],
      attributes: { force: 2, cunning: 0, nerve: 0 },
      skills: {},
    },
    {
      id: 'harpoon',
      name: 'The Harpoon',
      description: 'A patient hunter and marksman who maps every rooftop before the job.',
      startingAbilities: ['harpoon-deadeye'],
      specialAbilities: [
        'harpoon-deadeye',
        'harpoon-keen',
        'harpoon-wraithbane',
        'harpoon-pathfinder',
        'harpoon-diehard',
        'harpoon-quarry',
        'harpoon-steady',
      ],
      contacts: [
        { name: 'Mara', description: 'A roof-runner with eyes on every canal.' },
        { name: 'Tully', description: 'A dockside gunsmith who works on credit.' },
      ],
      equipment: ['pistol', 'large-weapon', 'climbing-gear'],
      attributes: { cunning: 1, force: 1, nerve: 0 },
      skills: {},
    },
    {
      id: 'brewer',
      name: 'The Brewer',
      description: 'An alchemist and field surgeon who turns chemistry into leverage.',
      startingAbilities: ['brewer-distiller'],
      specialAbilities: [
        'brewer-distiller',
        'brewer-sawbones',
        'brewer-gadgeteer',
        'brewer-wardsmith',
        'brewer-toxin',
        'brewer-irongut',
        'brewer-wrecker',
      ],
      contacts: [
        { name: 'Sister Quill', description: 'A defrocked apothecary with rare reagents.' },
        { name: 'Brace', description: 'A scrap-dealer who finds anything, eventually.' },
      ],
      equipment: ['burglar-rig', 'subterfuge-tools', 'documents'],
      attributes: { cunning: 2, force: 0, nerve: 0 },
      skills: {},
    },
    {
      id: 'eel',
      name: 'The Eel',
      description: 'A nimble infiltrator who slips through any lock, grate, or crowd.',
      startingAbilities: ['eel-slip'],
      specialAbilities: [
        'eel-slip',
        'eel-pounce',
        'eel-quick',
        'eel-fade',
        'eel-surefoot',
        'eel-catlike',
        'eel-daredevil',
      ],
      contacts: [
        { name: 'Pell', description: 'A locksmith of dubious loyalty.' },
        { name: 'The Gull', description: 'A smuggler who runs the low tunnels.' },
      ],
      equipment: ['blade', 'burglar-rig', 'climbing-gear'],
      attributes: { force: 1, cunning: 1, nerve: 0 },
      skills: {},
    },
    {
      id: 'mask',
      name: 'The Mask',
      description: 'A smooth manipulator who gets what they want with a word and a smile.',
      startingAbilities: ['mask-silvertongue'],
      specialAbilities: [
        'mask-silvertongue',
        'mask-read',
        'mask-mesmer',
        'mask-connected',
        'mask-ghostvoice',
        'mask-gambit',
        'mask-disguise',
      ],
      contacts: [
        { name: 'Lady Coll', description: 'A salon host who trades in secrets.' },
        { name: 'Den', description: 'A forger who can make anyone anyone.' },
      ],
      equipment: ['fine-clothes', 'subterfuge-tools', 'documents'],
      attributes: { nerve: 2, cunning: 0, force: 0 },
      skills: {},
    },
    {
      id: 'weaver',
      name: 'The Weaver',
      description: 'A mastermind who plans the job three moves before anyone else.',
      startingAbilities: ['weaver-mastermind'],
      specialAbilities: [
        'weaver-mastermind',
        'weaver-foresight',
        'weaver-calculating',
        'weaver-web',
        'weaver-fixer',
        'weaver-pact',
        'weaver-ironnerve',
      ],
      contacts: [
        { name: 'The Clerk', description: 'A records-keeper who sees every ledger in the city.' },
        { name: 'Rooke', description: 'A go-between with a hand in every faction.' },
      ],
      equipment: ['documents', 'fine-clothes', 'subterfuge-tools'],
      attributes: { cunning: 1, nerve: 1, force: 0 },
      skills: {},
    },
    {
      id: 'medium',
      name: 'The Medium',
      description: 'An occultist who bargains with the Tide-touched and the things beneath.',
      startingAbilities: ['medium-commune'],
      specialAbilities: [
        'medium-commune',
        'medium-compel',
        'medium-tempest',
        'medium-ironwill',
        'medium-veiledmind',
        'medium-strange',
        'medium-deathsdoor',
      ],
      contacts: [
        { name: 'The Drowned Choir', description: 'A cult that tends the restless dead.' },
        { name: 'Ashk', description: 'A relic-dealer trading in saltglass and worse.' },
      ],
      equipment: ['spirit-mask', 'documents', 'subterfuge-tools'],
      attributes: { nerve: 2, cunning: 0, force: 0 },
      skills: {},
    },
  ],

  // ~7 special abilities per playbook. Each playbook's roster makes all of these selectable at
  // creation (the engine unlocks tier ≥2 abilities that are in the chosen playbook's roster).
  specialAbilities: [
    // --- The Knife ---
    {
      id: 'knife-scarred',
      name: 'Scarred',
      tier: 1,
      category: 'knife',
      description: 'When you take harm, draw on grit — spend stress to shrug off the worst of it.',
    },
    {
      id: 'knife-bulwark',
      name: 'Bulwark',
      tier: 1,
      category: 'knife',
      description: 'Shield a teammate from a blow, taking or turning the harm, with extra effect.',
    },
    {
      id: 'knife-duelist',
      name: 'Duelist',
      tier: 1,
      category: 'knife',
      description: 'You can fight a group of lesser foes as though they were a single opponent.',
    },
    {
      id: 'knife-captain',
      name: 'Captain',
      tier: 1,
      category: 'knife',
      description: 'When you lead a group action, spend stress to grant an ally a bonus die.',
    },
    {
      id: 'knife-packhorse',
      name: 'Packhorse',
      tier: 1,
      category: 'knife',
      description: 'Your heavy load limit is higher; you carry more gear without slowing down.',
    },
    {
      id: 'knife-brutal',
      name: 'Brutal',
      tier: 2,
      category: 'knife',
      description: 'When you use violence to frighten or coerce, you act with increased effect.',
    },
    {
      id: 'knife-hardy',
      name: 'Hardy',
      tier: 1,
      category: 'knife',
      description: 'You heal from wounds faster and need less recovery to clear harm.',
    },

    // --- The Harpoon ---
    {
      id: 'harpoon-deadeye',
      name: 'Deadeye',
      tier: 1,
      category: 'harpoon',
      description: 'Take a careful shot to ignore cover and range; your aim finds the gap.',
    },
    {
      id: 'harpoon-keen',
      name: 'Keen',
      tier: 1,
      category: 'harpoon',
      description: 'When you track a quarry or study a target, push yourself for increased effect.',
    },
    {
      id: 'harpoon-wraithbane',
      name: 'Wraithbane',
      tier: 2,
      category: 'harpoon',
      description: 'Your shots and strikes wound the Tide-touched as if they were living flesh.',
    },
    {
      id: 'harpoon-pathfinder',
      name: 'Pathfinder',
      tier: 1,
      category: 'harpoon',
      description: "Quick, sharp reconnaissance reveals a target's defenses and weak points.",
    },
    {
      id: 'harpoon-diehard',
      name: 'Diehard',
      tier: 1,
      category: 'harpoon',
      description: 'Resist harm with nerve rather than body; you simply refuse to fall.',
    },
    {
      id: 'harpoon-quarry',
      name: 'Quarry',
      tier: 2,
      category: 'harpoon',
      prerequisite: 'harpoon-deadeye',
      description: 'Mark a single target as your quarry to gain increased effect against them.',
    },
    {
      id: 'harpoon-steady',
      name: 'Steady',
      tier: 1,
      category: 'harpoon',
      description: 'Your first action in a dangerous engagement gains a bonus die.',
    },

    // --- The Brewer ---
    {
      id: 'brewer-distiller',
      name: 'Distiller',
      tier: 1,
      category: 'brewer',
      description: 'Between jobs you brew alchemical formulas — oils, fires, trances, and drugs.',
    },
    {
      id: 'brewer-sawbones',
      name: 'Sawbones',
      tier: 1,
      category: 'brewer',
      description: 'Treat the wounded; those in your care heal faster and recover more fully.',
    },
    {
      id: 'brewer-gadgeteer',
      name: 'Gadgeteer',
      tier: 1,
      category: 'brewer',
      description: 'Build small sparkcraft devices and gadgets suited to the job at hand.',
    },
    {
      id: 'brewer-wardsmith',
      name: 'Wardsmith',
      tier: 2,
      category: 'brewer',
      description: 'Craft wards and charms that turn aside the Tide-touched.',
    },
    {
      id: 'brewer-toxin',
      name: 'Toxin',
      tier: 2,
      category: 'brewer',
      description: 'You are immune to one chosen toxin and can brew more of it at will.',
    },
    {
      id: 'brewer-irongut',
      name: 'Iron Gut',
      tier: 1,
      category: 'brewer',
      description: 'Shrug off the effects of exhaustion, poison, and bad chems.',
    },
    {
      id: 'brewer-wrecker',
      name: 'Wrecker',
      tier: 1,
      category: 'brewer',
      description: 'When you sabotage a device, the failure strikes later, with hidden effect.',
    },

    // --- The Eel ---
    {
      id: 'eel-slip',
      name: 'Slip',
      tier: 1,
      category: 'eel',
      description: 'When you bypass security measures, reduce their quality against you.',
    },
    {
      id: 'eel-pounce',
      name: 'Pounce',
      tier: 1,
      category: 'eel',
      description: 'Attacking from hiding or surprise grants you a bonus die.',
    },
    {
      id: 'eel-quick',
      name: 'Quick',
      tier: 1,
      category: 'eel',
      description: 'When chaos erupts, you act first; your reflexes outpace the room.',
    },
    {
      id: 'eel-fade',
      name: 'Fade',
      tier: 2,
      category: 'eel',
      description: 'Briefly become as mist — slip through a gap, a grate, a closing door.',
    },
    {
      id: 'eel-surefoot',
      name: 'Sure-Footed',
      tier: 2,
      category: 'eel',
      prerequisite: 'eel-quick',
      description: 'Push yourself for an extra burst of speed, climbing, or acrobatics.',
    },
    {
      id: 'eel-catlike',
      name: 'Catlike',
      tier: 1,
      category: 'eel',
      description: 'Gain a bonus die to skulk, climb, and slip locks unseen.',
    },
    {
      id: 'eel-daredevil',
      name: 'Daredevil',
      tier: 1,
      category: 'eel',
      description: 'When you take a desperate action, gain a bonus die and resist its fallout.',
    },

    // --- The Mask ---
    {
      id: 'mask-silvertongue',
      name: 'Silver Tongue',
      tier: 1,
      category: 'mask',
      description: 'Gain a bonus die when you deceive or charm your way to what you want.',
    },
    {
      id: 'mask-read',
      name: 'Read',
      tier: 1,
      category: 'mask',
      description: 'Study a person to learn what they want, fear, or are hiding.',
    },
    {
      id: 'mask-mesmer',
      name: 'Mesmer',
      tier: 2,
      category: 'mask',
      description: 'Leave a mark with a false memory of your meeting.',
    },
    {
      id: 'mask-connected',
      name: 'Connected',
      tier: 1,
      category: 'mask',
      description: 'Earn a little extra coin on the side from your dealings each job.',
    },
    {
      id: 'mask-ghostvoice',
      name: 'Ghost Voice',
      tier: 2,
      category: 'mask',
      description: 'Speak with the Tide-touched calmly, without fear or harm.',
    },
    {
      id: 'mask-gambit',
      name: 'Gambit',
      tier: 1,
      category: 'mask',
      description: 'Once per job, reroll a desperate action by playing the angles.',
    },
    {
      id: 'mask-disguise',
      name: 'Disguise',
      tier: 1,
      category: 'mask',
      description: 'Resist with nerve when a disguise or a lie is about to slip.',
    },

    // --- The Weaver ---
    {
      id: 'weaver-mastermind',
      name: 'Mastermind',
      tier: 1,
      category: 'weaver',
      description: "Protect an ally's resolve; when you lead, you take less stress doing it.",
    },
    {
      id: 'weaver-foresight',
      name: 'Foresight',
      tier: 1,
      category: 'weaver',
      description: 'Gain an extra downtime activity to prepare a scheme.',
    },
    {
      id: 'weaver-calculating',
      name: 'Calculating',
      tier: 1,
      category: 'weaver',
      description: 'Improve the detail and effect of a plan you set in motion.',
    },
    {
      id: 'weaver-web',
      name: 'Weaving the Web',
      tier: 2,
      category: 'weaver',
      description: "Turn a rival faction's move against them when you've laid the groundwork.",
    },
    {
      id: 'weaver-fixer',
      name: 'Fixer',
      tier: 1,
      category: 'weaver',
      description: 'Use contacts to reduce heat and smooth over entanglements.',
    },
    {
      id: 'weaver-pact',
      name: 'Bound Pact',
      tier: 2,
      category: 'weaver',
      prerequisite: 'weaver-mastermind',
      description: 'Bind a Tide-touched to a bargain, sealed in saltglass.',
    },
    {
      id: 'weaver-ironnerve',
      name: 'Iron Nerve',
      tier: 1,
      category: 'weaver',
      description: 'Endure confinement, interrogation, and pressure without breaking.',
    },

    // --- The Medium ---
    {
      id: 'medium-commune',
      name: 'Commune',
      tier: 1,
      category: 'medium',
      description: 'Perform rituals to call, question, and bargain with the Tide-touched.',
    },
    {
      id: 'medium-compel',
      name: 'Compel',
      tier: 1,
      category: 'medium',
      description: 'Briefly command a nearby spirit to act on your word.',
    },
    {
      id: 'medium-tempest',
      name: 'Tempest',
      tier: 2,
      category: 'medium',
      prerequisite: 'medium-commune',
      description: 'Channel raw storm and brine through yourself, at a cost.',
    },
    {
      id: 'medium-ironwill',
      name: 'Iron Will',
      tier: 1,
      category: 'medium',
      description: 'Terror cannot break you; resist fear with cold focus.',
    },
    {
      id: 'medium-veiledmind',
      name: 'Veiled Mind',
      tier: 1,
      category: 'medium',
      description: 'Your thoughts are shrouded, and you sense the uncanny nearby.',
    },
    {
      id: 'medium-strange',
      name: 'Strange Methods',
      tier: 1,
      category: 'medium',
      description: 'Devise strange arcane methods, designs, and apparatus.',
    },
    {
      id: 'medium-deathsdoor',
      name: "Death's Door",
      tier: 2,
      category: 'medium',
      prerequisite: 'medium-commune',
      description: 'When you are near death, draw power from the Tide to act once more.',
    },
  ],

  equipment: {
    loadCapacity: { light: 3, normal: 5, heavy: 6 },
    items: [
      {
        id: 'blade',
        name: 'A Fine Blade',
        description: 'Balanced steel.',
        load: 1,
        category: 'weapon',
      },
      {
        id: 'pistol',
        name: 'Pistol',
        description: 'A reliable hand cannon.',
        load: 1,
        category: 'weapon',
      },
      {
        id: 'large-weapon',
        name: 'A Large Weapon',
        description: 'A cleaver, axe, or longblade.',
        load: 2,
        category: 'weapon',
      },
      {
        id: 'throwing-knives',
        name: 'Throwing Knives',
        description: 'Silent at a distance.',
        load: 1,
        category: 'weapon',
      },
      {
        id: 'armor',
        name: 'Armor',
        description: 'Worn leather and plate.',
        load: 2,
        category: 'gear',
      },
      {
        id: 'heavy-armor',
        name: 'Heavy Armor',
        description: 'Slow, but it stops a lot.',
        load: 3,
        category: 'gear',
      },
      {
        id: 'burglar-rig',
        name: "Burglar's Rig",
        description: 'Picks, pries, and prybars.',
        load: 1,
        category: 'tool',
      },
      {
        id: 'climbing-gear',
        name: 'Climbing Gear',
        description: 'Rope, hooks, and harness.',
        load: 2,
        category: 'tool',
      },
      {
        id: 'subterfuge-tools',
        name: 'Subterfuge Tools',
        description: 'Forgery kit, listening cone, fine tools.',
        load: 1,
        category: 'tool',
      },
      {
        id: 'documents',
        name: 'Documents',
        description: 'Papers, ledgers, and letters.',
        load: 0,
        category: 'gear',
      },
      {
        id: 'fine-clothes',
        name: 'Fine Clothes',
        description: 'Dress for any station.',
        load: 1,
        category: 'gear',
      },
      {
        id: 'spirit-mask',
        name: 'Spirit Mask',
        description: 'A warded mask for facing the Tide-touched.',
        load: 1,
        category: 'tool',
      },
    ],
    categories: [
      { id: 'weapon', name: 'Weapons', description: 'Things that end arguments.' },
      { id: 'tool', name: 'Tools', description: 'For the trickier work.' },
      { id: 'gear', name: 'Gear', description: 'Everything else.' },
    ],
  },

  advancement: {
    xpTriggers: [
      {
        id: 'desperate',
        name: 'Desperate Action',
        description: 'Mark 1 XP when you roll a desperate action.',
        value: 1,
      },
      {
        id: 'edge',
        name: 'Played to Your Strengths',
        description: 'Mark XP when you tackled a tough obstacle with Cunning, Force, or Nerve.',
        value: 1,
      },
      {
        id: 'identity',
        name: 'Expressed Who You Are',
        description: 'Mark XP when you expressed your heritage, background, or beliefs.',
        value: 1,
      },
      {
        id: 'vice',
        name: 'Struggled With a Flaw',
        description: 'Mark XP when you struggled with your vice or a trauma during the job.',
        value: 1,
      },
    ],
    advancementOptions: [
      {
        id: 'buy-ability',
        name: 'New Special Ability',
        description: 'Learn a new special ability from your playbook.',
        cost: 8,
        category: 'ability',
      },
      {
        id: 'raise-attribute',
        name: 'Raise an Attribute (+1)',
        description: 'Increase one attribute rating by 1 (up to the maximum of 4).',
        cost: 8,
        category: 'attribute',
      },
    ],
  },

  // Stress/trauma bounds (BitD-standard). Trauma conditions, for flavor: Hollow, Hunted, Fixated,
  // Wary, Rash, Tender, Brittle, Cruel — fill traumaMax and the character retires. (Naming them
  // in the trauma UI is a future enhancement; the schema tracks trauma as a count.)
  stress: { max: 9, traumaMax: 4 },

  characterCreation: {
    pointBuy: {
      totalPoints: 7,
      // Identity cost map → points spent = sum of attribute ratings (preserves the wizard's
      // "/ 7 points spent" budget). Attributes cap at 4; creation caps them at 3 (below).
      attributeCosts: { 1: 1, 2: 2, 3: 3, 4: 4 },
      skillCosts: { 1: 1, 2: 2 },
    },
    abilityChoices: 2,
    restrictions: [
      {
        field: 'attributes.cunning',
        condition: 'max',
        value: 3,
        message: 'Cunning cannot exceed 3 at character creation (raise it later with advancement).',
      },
      {
        field: 'attributes.force',
        condition: 'max',
        value: 3,
        message: 'Force cannot exceed 3 at character creation (raise it later with advancement).',
      },
      {
        field: 'attributes.nerve',
        condition: 'max',
        value: 3,
        message: 'Nerve cannot exceed 3 at character creation (raise it later with advancement).',
      },
    ],
    steps: [
      {
        id: 'playbook',
        name: 'Choose Crew Role',
        description: 'Pick the archetype your scoundrel is built on.',
        order: 1,
        required: true,
      },
      {
        id: 'action-ratings',
        name: 'Assign Attributes',
        description: 'Spend your starting points across Cunning, Force, and Nerve.',
        order: 2,
        required: true,
      },
      {
        id: 'special-abilities',
        name: 'Pick Special Abilities',
        description: 'Choose the abilities that bend the rules in your favor.',
        order: 3,
        required: false,
      },
      {
        // Heritage/background/vice are single-field option steps; the wizard's IdentityStep renders
        // each option list as selectable cards (it falls back to free text for a generic ruleset
        // that defines a single combined "identity" step instead).
        id: 'heritage',
        name: 'Heritage',
        description: 'Where in the drowned cities do you hail from?',
        order: 4,
        required: false,
        options: [
          {
            id: 'harbor-born',
            name: 'Harbor-born',
            description: 'Raised on the wharves of Brackwater itself.',
          },
          {
            id: 'isle-blood',
            name: 'Isle-blood',
            description: 'From the scattered isles beyond the storm-wall.',
          },
          {
            id: 'highlander',
            name: 'Highlander',
            description: 'From the dry uplands, far from the tide.',
          },
          {
            id: 'marshfolk',
            name: 'Marshfolk',
            description: 'From the saltmarsh villages and their old ways.',
          },
          {
            id: 'far-traveler',
            name: 'Far-traveler',
            description: 'A foreigner who washed up and stayed.',
          },
        ],
      },
      {
        id: 'background',
        name: 'Background',
        description: 'What life did you leave behind for the crew?',
        order: 5,
        required: false,
        options: [
          { id: 'labor', name: 'Labor', description: 'Docks, factories, and the working trades.' },
          { id: 'trade', name: 'Trade', description: 'Merchants, clerks, and shopkeeps.' },
          {
            id: 'academic',
            name: 'Academic',
            description: 'Scholars, students, and the lettered.',
          },
          { id: 'military', name: 'Military', description: 'Soldiers, watch, and harbor patrol.' },
          { id: 'underworld', name: 'Underworld', description: 'Gangs, smugglers, and thieves.' },
          { id: 'highborn', name: 'Highborn', description: 'The fallen or wayward gentry.' },
          { id: 'cult', name: 'Cult', description: 'The faithful of drowned gods and the Tide.' },
        ],
      },
      {
        id: 'vice',
        name: 'Vice',
        description: 'What habit steadies your nerves between jobs?',
        order: 6,
        required: false,
        options: [
          {
            id: 'devotion',
            name: 'Devotion',
            description: 'Faith, ritual, and the comfort of belief.',
          },
          { id: 'wager', name: 'Wager', description: 'Cards, dice, and the long odds.' },
          { id: 'excess', name: 'Excess', description: 'Fine things and lavish comforts.' },
          { id: 'duty', name: 'Duty', description: 'An obligation you cannot let go.' },
          {
            id: 'indulgence',
            name: 'Indulgence',
            description: 'Company, pleasure, and the senses.',
          },
          { id: 'oblivion', name: 'Oblivion', description: 'Drink, smoke, and forgetting.' },
          {
            id: 'strange',
            name: 'The Strange',
            description: 'Forbidden lore and the call of the deep.',
          },
        ],
      },
      {
        id: 'crew-ties',
        name: 'Crew Ties',
        description: 'How does this scoundrel relate to the rest of the crew?',
        order: 7,
        required: false,
        options: [
          { id: 'loyal', name: 'Loyal', description: 'You would take a blade for the crew.' },
          { id: 'indebted', name: 'Indebted', description: 'You owe someone here, badly.' },
          {
            id: 'rival',
            name: 'Rival',
            description: 'You and another member have unfinished business.',
          },
        ],
      },
      {
        id: 'review',
        name: 'Confirm Crew Member',
        description:
          'Review the sheet, then send them into Brackwater. (Stress 9; four trauma and they ' +
          'retire — Hollow, Hunted, Fixated, Wary, Rash, Tender, Brittle, or Cruel.)',
        order: 8,
        required: true,
      },
    ],
  },
};
