// Blades in the Dark — a built-in ruleset.
//
// Uses the system's recognizable structure and names (attributes, the twelve actions, the seven
// playbooks, the crew types) from the Forged in the Dark SRD, which John Harper / One Seven Design
// licensed under CC BY 3.0. The attribution notice is recorded on the catalog entry in `index.ts`.
//
// Ability rules text — provenance (rules-accuracy round, review #4):
// - Where the SRD (bladesinthedark.com/character-playbook, /crew-playbook) prints an ability, its
//   rules text below is the SRD's own wording (CC BY 3.0, covered by the attribution above). The
//   SRD's setting-neutral names are used for its variants (Arcane Fighter, Supernatural Ward,
//   Arcane Mind) instead of the book's ghost-specific ones.
// - Abilities the book's playbooks carry but the SRD doesn't print (Veteran, Ghost Hunter, Survivor,
//   Physicker, Venomous, Ghost Veil, Cloak & Dagger, Ghost Voice, Functioning Vice, Ghost Contract,
//   Jail Bird, Compel, Occultist, Tempest, The Good Stuff) are faithful ORIGINAL paraphrases of the
//   mechanic — game mechanics aren't copyrightable; only expression is — with no setting terms.
// - Ability `tier` is deliberately absent: the SRD has no ability tiers. Cross-playbook picks need a
//   Veteran slot (the playbook "Veteran" ability, `effects.veteran`), whatever the ability.
//
// The CC BY grant covers the SRD *system* only — it excludes the Duskwall setting, its NPCs and
// factions, artwork, and maps. This builtin therefore ships no setting content: no city or faction
// names, no setting-specific terms. GMs seed their own factions per campaign.
//
// Shape mirrors `default-ruleset.ts` / `e2e/fixtures/rulesets/cinders.json` so the creation wizard
// and the character-rules engine accept it unchanged: action-rating creation, BitD stress 9 / trauma
// 4, harm 2/2/1, XP tracks (playbook 8 / attribute 6).
import type { AbilityDefinition, RulesetContent } from '@heist-mind/core';

// The SRD's shared special-armor clause (every "expend your special armor" ability carries it).
const SPECIAL_ARMOR =
  'When you use this ability, tick the special armor box on your playbook sheet. If you use this ' +
  'ability to push yourself, you get one of the benefits (+1d, +1 effect, act despite severe harm) ' +
  'but you don’t take 2 stress. Your special armor is restored at the beginning of downtime.';

// The SRD's shared "push yourself to do one of the following" clause.
const PUSH_FEAT =
  'When you push yourself to activate this ability, you still get one of the normal benefits of ' +
  'pushing yourself (+1d, +1 effect, etc.) in addition to the special ability.';

// Veteran — on every playbook, takeable up to three times (each take opens ONE cross-playbook pick).
const VETERAN_IDS = ['veteran', 'veteran-2', 'veteran-3'] as const;
const VETERAN: AbilityDefinition[] = [
  {
    id: 'veteran',
    name: 'Veteran',
    description: 'Learn a trick from another walk of life.',
    rules:
      'Choose a special ability from another playbook and add it to your sheet. You may take ' +
      'Veteran up to three times; each take opens one ability from outside your playbook.',
    category: 'veteran',
    effects: { veteran: 1 },
  },
  {
    id: 'veteran-2',
    name: 'Veteran (second)',
    description: 'A second borrowed trick.',
    rules: 'Take Veteran again: choose another special ability from another playbook.',
    prerequisite: 'veteran',
    category: 'veteran',
    effects: { veteran: 1 },
  },
  {
    id: 'veteran-3',
    name: 'Veteran (third)',
    description: 'A third borrowed trick.',
    rules: 'Take Veteran a third time: choose another special ability from another playbook.',
    prerequisite: 'veteran-2',
    category: 'veteran',
    effects: { veteran: 1 },
  },
];

const roster = (...ids: string[]): string[] => [...ids, ...VETERAN_IDS];

export const BLADES_IN_THE_DARK: RulesetContent = {
  metadata: {
    name: 'Blades in the Dark',
    version: '1.1.0',
    author: 'John Harper / One Seven Design (CC BY 3.0)',
    description:
      'A daring crew of scoundrels seeking their fortunes in a haunted, industrial-fantasy city. ' +
      'The reference Forged-in-the-Dark system: rate your actions, push your luck on ' +
      'the dice, run your crew, and weather the consequences. Licensed under CC BY 3.0.',
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
      specialAbilities: roster(
        'cutter-battleborn',
        'cutter-bodyguard',
        'cutter-ghostfighter',
        'cutter-leadfighter',
        'cutter-mule',
        'cutter-nottobetrifled',
        'cutter-savage',
        'cutter-vigorous'
      ),
      contacts: [
        { name: 'A crime boss', description: 'Pays well, forgets nothing.' },
        { name: 'A bare-knuckle champion', description: 'Owes you a fight, or a favor.' },
      ],
      equipment: ['blade', 'armor', 'heavy-blade'],
      attributes: {},
      skills: { Skirmish: 2, Command: 1 },
      xpTrigger: 'You addressed a challenge with violence or coercion.',
    },
    {
      id: 'hound',
      name: 'The Hound',
      description: 'A deadly marksman and tracker who never loses the trail.',
      startingAbilities: ['hound-sharpshooter'],
      specialAbilities: roster(
        'hound-sharpshooter',
        'hound-focused',
        'hound-ghosthunter',
        'hound-deadeye',
        'hound-survivor',
        'hound-toughasnails',
        'hound-vengeful'
      ),
      contacts: [
        { name: 'A bounty hunter', description: 'Shares leads — for a cut.' },
        { name: 'A pet hound or hawk', description: 'Loyal, and a useful set of senses.' },
      ],
      equipment: ['pistol', 'fine-rifle', 'spyglass'],
      attributes: {},
      skills: { Hunt: 2, Survey: 1 },
      xpTrigger: 'You addressed a challenge with tracking or violence.',
    },
    {
      id: 'leech',
      name: 'The Leech',
      description: 'A saboteur, alchemist, and tinkerer who solves problems with the right tool.',
      startingAbilities: ['leech-alchemist'],
      specialAbilities: roster(
        'leech-alchemist',
        'leech-analyst',
        'leech-artificer',
        'leech-fortitude',
        'leech-ghostward',
        'leech-physicker',
        'leech-saboteur',
        'leech-venomous'
      ),
      contacts: [
        { name: 'An apothecary', description: 'Stocks rare reagents, asks no questions.' },
        { name: 'A surgeon', description: 'Patches the crew up after a bad score.' },
      ],
      equipment: ['tinkering-tools', 'alchemy-kit', 'documents'],
      attributes: {},
      skills: { Tinker: 2, Wreck: 1 },
      xpTrigger: 'You addressed a challenge with technical skill or mayhem.',
    },
    {
      id: 'lurk',
      name: 'The Lurk',
      description: 'A stealthy infiltrator and burglar who is gone before anyone notices.',
      startingAbilities: ['lurk-infiltrator'],
      specialAbilities: roster(
        'lurk-infiltrator',
        'lurk-ambush',
        'lurk-daredevil',
        'lurk-devilsfootsteps',
        'lurk-expertise',
        'lurk-ghost',
        'lurk-reflexes',
        'lurk-shadow'
      ),
      contacts: [
        { name: 'A fence', description: 'Moves stolen goods, quietly.' },
        { name: 'A roof-runner', description: 'Knows every way over the city.' },
      ],
      equipment: ['burglary-gear', 'climbing-gear', 'blade'],
      attributes: {},
      skills: { Prowl: 2, Finesse: 1 },
      xpTrigger: 'You addressed a challenge with stealth or evasion.',
    },
    {
      id: 'slide',
      name: 'The Slide',
      description: 'A subtle manipulator and spy who gets in close and turns people to their ends.',
      startingAbilities: ['slide-rooktwist'],
      specialAbilities: roster(
        'slide-rooktwist',
        'slide-cloakdagger',
        'slide-ghostvoice',
        'slide-likelooks',
        'slide-somethingontheside',
        'slide-mesmerism',
        'slide-cloakspider',
        'slide-trustinme'
      ),
      contacts: [
        { name: 'A double agent', description: 'Sells secrets in both directions.' },
        { name: 'A drug dealer', description: 'A useful in to the right rooms.' },
      ],
      equipment: ['fine-clothes', 'disguise-kit', 'documents'],
      attributes: {},
      skills: { Consort: 2, Sway: 1 },
      xpTrigger: 'You addressed a challenge with deception or influence.',
    },
    {
      id: 'spider',
      name: 'The Spider',
      description: 'A calculating mastermind who plans the score and pulls every string.',
      startingAbilities: ['spider-foresight'],
      specialAbilities: roster(
        'spider-foresight',
        'spider-calculating',
        'spider-connected',
        'spider-functioningvice',
        'spider-ghostcontract',
        'spider-jailbird',
        'spider-mastermind',
        'spider-weavingwebs'
      ),
      contacts: [
        { name: 'A city official', description: 'Looks the other way, for a price.' },
        { name: 'A spirit trafficker', description: 'Deals in things best left buried.' },
      ],
      equipment: ['fine-clothes', 'documents', 'subterfuge-supplies'],
      attributes: {},
      skills: { Study: 2, Consort: 1 },
      xpTrigger: 'You addressed a challenge with calculation or conspiracy.',
    },
    {
      id: 'whisper',
      name: 'The Whisper',
      description: 'An arcane adept who bargains with ghosts and channels the spectral dark.',
      startingAbilities: ['whisper-compel'],
      specialAbilities: roster(
        'whisper-compel',
        'whisper-ghostmind',
        'whisper-ironwill',
        'whisper-occultist',
        'whisper-ritual',
        'whisper-strange',
        'whisper-tempest',
        'whisper-warded'
      ),
      contacts: [
        {
          name: 'A ghost hunter',
          description: 'Hunts ghosts — and notices those who court them.',
        },
        { name: 'A vampire', description: 'An ancient patron with an agenda.' },
      ],
      equipment: ['arcane-implements', 'spirit-mask', 'documents'],
      attributes: {},
      skills: { Attune: 2, Study: 1 },
      xpTrigger: 'You addressed a challenge with knowledge or arcane power.',
    },
  ],

  // Ids are stable across revisions (a renamed ability keeps its id), so they don't always read
  // like the display name — e.g. `hound-deadeye` is Scout, `slide-cloakspider` is Subterfuge.
  specialAbilities: [
    // Cutter
    {
      id: 'cutter-battleborn',
      name: 'Battleborn',
      description: 'Spend special armor to blunt a blow or push in a fight.',
      rules:
        'You may expend your special armor to reduce harm from an attack in combat or to push ' +
        'yourself during a fight. If you “reduce harm” that means the level of harm you’re facing ' +
        `right now is reduced by one. ${SPECIAL_ARMOR}`,
      category: 'cutter',
    },
    {
      id: 'cutter-bodyguard',
      name: 'Bodyguard',
      description: 'Shield a teammate and read the room for threats.',
      rules:
        'When you protect a teammate, take +1d to your resistance roll. When you gather info to ' +
        'anticipate possible threats in the current situation, you get +1 effect.',
      category: 'cutter',
    },
    {
      id: 'cutter-ghostfighter',
      name: 'Arcane Fighter',
      description: 'Your strikes carry spirit energy.',
      rules:
        'You may imbue your hands, melee weapons, or tools with spirit energy. You gain potency in ' +
        'combat vs. the supernatural.',
      category: 'cutter',
    },
    {
      id: 'cutter-leadfighter',
      name: 'Leader',
      description: 'Cohorts you command fight on.',
      rules:
        'When you Command a cohort in combat, they continue to fight when they would otherwise ' +
        'break (they’re not taken out when they suffer level 3 harm). They gain +1 effect and 1 armor.',
      category: 'cutter',
    },
    {
      id: 'cutter-mule',
      name: 'Mule',
      description: 'Carry more without slowing down.',
      rules: 'Your load limits are higher. Light: 5. Normal: 7. Heavy: 8.',
      category: 'cutter',
      effects: { loadCapacity: { light: 5, normal: 7, heavy: 8 } },
    },
    {
      id: 'cutter-nottobetrifled',
      name: 'Not to Be Trifled With',
      description: 'Feats of force; take on a gang alone.',
      rules:
        'You can push yourself to do one of the following: perform a feat of physical force that ' +
        'verges on the superhuman — engage a small gang on equal footing in close combat. ' +
        PUSH_FEAT,
      category: 'cutter',
    },
    {
      id: 'cutter-savage',
      name: 'Savage',
      description: 'Your violence frightens.',
      rules:
        'When you unleash physical violence, it’s especially frightening. When you Command a ' +
        'frightened target, take +1d.',
      category: 'cutter',
    },
    {
      id: 'cutter-vigorous',
      name: 'Vigorous',
      description: 'You recover from harm faster.',
      rules:
        'You recover from harm faster. Permanently fill in one of your healing clock segments ' +
        '(your healing clock becomes a 3-clock). Take +1d to healing treatment rolls.',
      category: 'cutter',
    },

    // Hound
    {
      id: 'hound-sharpshooter',
      name: 'Sharpshooter',
      description: 'Impossible shots and suppressing fire.',
      rules:
        'You can push yourself to do one of the following: make a ranged attack at extreme distance ' +
        'beyond what’s normal for the weapon — unleash a barrage of rapid fire to suppress the ' +
        `enemy. ${PUSH_FEAT}`,
      category: 'hound',
    },
    {
      id: 'hound-focused',
      name: 'Focused',
      description: 'Spend special armor to keep your head or your aim.',
      rules:
        'You may expend your special armor to resist a consequence of surprise or mental harm ' +
        '(fear, confusion, losing track of someone) or to push yourself for ranged combat or ' +
        'tracking. If you “resist a consequence” of the appropriate type, you avoid it completely. ' +
        SPECIAL_ARMOR,
      category: 'hound',
    },
    {
      id: 'hound-ghosthunter',
      name: 'Ghost Hunter',
      description: 'Your hunting animal is touched by spirit energy.',
      rules:
        'Your hunting pet is imbued with spirit energy: it gains potency when tracking or fighting ' +
        'the supernatural, and gains one arcane ability — it can become insubstantial for a moment, ' +
        'share its senses with you over a distance, or move with uncanny speed. Take this ability ' +
        'again to give your pet an additional arcane ability.',
      category: 'hound',
    },
    {
      // Id kept from an earlier revision (was mis-named); this is the SRD's Scout.
      id: 'hound-deadeye',
      name: 'Scout',
      description: 'Find the target; stay unseen while you watch.',
      rules:
        'When you gather information to discover the location of a target, you get +1 effect. ' +
        'When you hide in a prepared position or use camouflage you get +1d to rolls to avoid ' +
        'detection.',
      category: 'hound',
    },
    {
      id: 'hound-survivor',
      name: 'Survivor',
      description: 'Hard-won toughness: one more stress box.',
      rules:
        'Hard experience has toughened you against poisonous air and meagre rations — you can ' +
        'endure harsh, deprived conditions others can’t. You get +1 stress box.',
      category: 'hound',
      effects: { stressBoxes: 1 },
    },
    {
      id: 'hound-toughasnails',
      name: 'Tough as Nails',
      description: 'Harm hits you one level softer.',
      rules:
        'Penalties from harm are one level less severe (though level 4 harm is still fatal). ' +
        'Record the harm at its original level — for healing purposes, the original harm level ' +
        'applies.',
      category: 'hound',
    },
    {
      id: 'hound-vengeful',
      name: 'Vengeful',
      description: 'Payback earns you XP.',
      rules:
        'You gain an additional xp trigger: You got payback against someone who harmed you or ' +
        'someone you care about. If your crew helped you get payback, also mark crew xp.',
      category: 'hound',
    },

    // Leech
    {
      id: 'leech-alchemist',
      name: 'Alchemist',
      description: 'Better alchemical creations; one formula known.',
      rules:
        'When you invent or craft a creation with alchemical features, you get +1 result level to ' +
        'your roll (a 1-3 becomes a 4/5, etc.). You begin with one special formula already known.',
      category: 'leech',
    },
    {
      id: 'leech-analyst',
      name: 'Analyst',
      description: 'Extra progress on research projects.',
      rules:
        'During downtime, you get two ticks to distribute among any long term project clocks that ' +
        'involve investigation or learning a new formula or design plan.',
      category: 'leech',
    },
    {
      id: 'leech-artificer',
      name: 'Artificer',
      description: 'Better spark-craft creations; one design known.',
      rules:
        'When you invent or craft a creation with spark-craft features, you get +1 result level ' +
        'to your roll (a 1-3 becomes a 4/5, etc.). You begin with one special design already known.',
      category: 'leech',
    },
    {
      id: 'leech-fortitude',
      name: 'Fortitude',
      description: 'Spend special armor against fatigue and chemicals.',
      rules:
        'You may expend your special armor to resist a consequence of fatigue, weakness, or ' +
        'chemical effects, or to push yourself when working with technical skill or handling ' +
        'alchemicals. If you “resist a consequence” of the appropriate type, you avoid it ' +
        `completely. ${SPECIAL_ARMOR}`,
      category: 'leech',
    },
    {
      id: 'leech-ghostward',
      name: 'Supernatural Ward',
      description: 'Make a place anathema — or enticing — to the supernatural.',
      rules:
        'When you Wreck an area with arcane substances, ruining it for any other use, it becomes ' +
        'anathema or enticing to the supernatural (your choice).',
      category: 'leech',
    },
    {
      id: 'leech-physicker',
      name: 'Physicker',
      description: 'Treat wounds; the whole crew heals better.',
      rules:
        'You can Tinker with bones, blood, and bodily fluids to treat wounds or stabilize the ' +
        'dying, and you may Study a malady or a corpse. Everyone in your crew (including you) gets ' +
        '+1d to their healing treatment rolls.',
      category: 'leech',
    },
    {
      id: 'leech-saboteur',
      name: 'Saboteur',
      description: 'Quiet, well-hidden wrecking.',
      rules:
        'When you Wreck, your work is much quieter than it should be and the damage is very ' +
        'well-hidden from casual inspection.',
      category: 'leech',
    },
    {
      id: 'leech-venomous',
      name: 'Venomous',
      description: 'Immune to one toxin — and able to deliver it.',
      rules:
        'Choose a drug or poison (from your stock of alchemicals) to which you have become immune. ' +
        'You can push yourself to secrete it through your skin or saliva, or exhale it as a vapor.',
      category: 'leech',
    },

    // Lurk
    {
      id: 'lurk-infiltrator',
      name: 'Infiltrator',
      description: 'Security quality and Tier don’t slow you.',
      rules: 'You are not affected by quality or Tier when you bypass security measures.',
      category: 'lurk',
    },
    {
      id: 'lurk-ambush',
      name: 'Ambush',
      description: 'Strike from hiding.',
      rules: 'When you attack from hiding or spring a trap, you get +1d to your roll.',
      category: 'lurk',
    },
    {
      id: 'lurk-daredevil',
      name: 'Daredevil',
      description: 'A gamble on desperate rolls.',
      rules:
        'When you roll a desperate action, you get +1d to your roll if you also take -1d to any ' +
        'resistance rolls against consequences from your action.',
      category: 'lurk',
    },
    {
      id: 'lurk-devilsfootsteps',
      name: 'The Devil’s Footsteps',
      description: 'Superhuman athletics; turn enemies on each other.',
      rules:
        'You can push yourself to do one of the following: perform a feat of athletics that ' +
        'verges on the superhuman — maneuver to confuse your enemies so they mistakenly attack ' +
        `each other. ${PUSH_FEAT}`,
      category: 'lurk',
    },
    {
      id: 'lurk-expertise',
      name: 'Expertise',
      description: 'Cover your team in a group action.',
      rules:
        'Choose one of your action ratings. When you lead a group action using that action, you ' +
        'can suffer only 1 stress at most, regardless of the number of failed rolls.',
      category: 'lurk',
    },
    {
      id: 'lurk-ghost',
      name: 'Ghost Veil',
      description: 'Become shadowy and insubstantial for a moment.',
      rules:
        'You may shift partially into the spirit world, becoming shadowy and insubstantial for a ' +
        'few moments. Take 2 stress when you shift, plus 1 stress for each extra feature: it lasts ' +
        'for a few minutes rather than moments — you are invisible rather than shadowy — you may ' +
        'float through the air.',
      category: 'lurk',
    },
    {
      id: 'lurk-reflexes',
      name: 'Reflexes',
      description: 'You act first.',
      rules: 'When there’s a question about who acts first, the answer is you.',
      category: 'lurk',
    },
    {
      id: 'lurk-shadow',
      name: 'Shadow',
      description: 'Spend special armor against detection.',
      rules:
        'You may expend your special armor to resist a consequence from detection or security ' +
        'measures, or to push yourself for a feat of athletics or stealth. If you “resist a ' +
        `consequence” of the appropriate type, you avoid it completely. ${SPECIAL_ARMOR}`,
      category: 'lurk',
    },

    // Slide
    {
      id: 'slide-rooktwist',
      name: 'Rook’s Gambit',
      description: 'Roll your best action in place of another.',
      rules:
        'Take 2 stress to roll your best action rating while performing a different action. Say ' +
        'how you adapt your skill to this use.',
      category: 'slide',
    },
    {
      id: 'slide-cloakdagger',
      name: 'Cloak & Dagger',
      description: 'Disguises deflect suspicion; unmasking seizes the moment.',
      rules:
        'When you use a disguise or other form of covert misdirection, you get +1d to rolls to ' +
        'confuse or deflect suspicion. When you throw off your disguise, the resulting surprise ' +
        'gives you the initiative in the situation.',
      category: 'slide',
    },
    {
      id: 'slide-ghostvoice',
      name: 'Ghost Voice',
      description: 'Speak with spirits as with the living.',
      rules:
        'You know the secret method to interact with a ghost or other spirit as if it were a ' +
        'normal person, however wild or feral it appears. You gain potency when communicating ' +
        'with the supernatural.',
      category: 'slide',
    },
    {
      id: 'slide-likelooks',
      name: 'Like Looking into a Mirror',
      description: 'You always know a lie.',
      rules: 'You can always tell when someone is lying to you.',
      category: 'slide',
    },
    {
      id: 'slide-somethingontheside',
      name: 'A Little Something on the Side',
      description: '+2 stash each downtime.',
      rules:
        'At the end of each downtime phase, you earn +2 stash. (It arrives after all downtime ' +
        'actions resolve, so it can’t fund extra activities until your next downtime phase.)',
      category: 'slide',
    },
    {
      id: 'slide-mesmerism',
      name: 'Mesmerism',
      description: 'Make them forget you swayed them.',
      rules:
        'When you Sway someone, you may cause them to forget that it’s happened until they next ' +
        'interact with you.',
      category: 'slide',
    },
    {
      // Id kept from an earlier revision; this is the SRD's Subterfuge.
      id: 'slide-cloakspider',
      name: 'Subterfuge',
      description: 'Spend special armor against suspicion.',
      rules:
        'You may expend your special armor to resist a consequence from suspicion or persuasion, ' +
        'or to push yourself for subterfuge. If you “resist a consequence” of the appropriate ' +
        `type, you avoid it completely. ${SPECIAL_ARMOR}`,
      category: 'slide',
    },
    {
      id: 'slide-trustinme',
      name: 'Trust in Me',
      description: '+1d against someone close to you.',
      rules: 'You get +1d vs. a target with whom you have an intimate relationship.',
      category: 'slide',
    },

    // Spider
    {
      id: 'spider-foresight',
      name: 'Foresight',
      description: 'Assist for free, twice per score.',
      rules:
        'Two times per score you can assist a teammate without paying stress. Describe how you ' +
        'prepared for this.',
      category: 'spider',
    },
    {
      id: 'spider-calculating',
      name: 'Calculating',
      description: 'An extra downtime activity.',
      rules:
        'Due to your careful planning, during downtime, you may give yourself or another crew ' +
        'member +1 downtime activity.',
      category: 'spider',
    },
    {
      id: 'spider-connected',
      name: 'Connected',
      description: 'Better acquire-asset and reduce-heat results.',
      rules: 'During downtime, you get +1 result level when you acquire an asset or reduce heat.',
      category: 'spider',
    },
    {
      id: 'spider-functioningvice',
      name: 'Functioning Vice',
      description: 'Tune your vice roll.',
      rules:
        'When you indulge your vice, you may adjust the dice outcome by 1 or 2 (up or down). An ' +
        'ally who joins in your vice may do the same.',
      category: 'spider',
    },
    {
      id: 'spider-ghostcontract',
      name: 'Ghost Contract',
      description: 'Oaths you seal are binding — on both parties.',
      rules:
        'When you shake on a deal, you and your partner — human or otherwise — both bear a mark ' +
        'of your oath. If either party breaks the contract, they take level 3 harm, "Cursed".',
      category: 'spider',
    },
    {
      id: 'spider-jailbird',
      name: 'Jail Bird',
      description: 'Prison is home turf.',
      rules:
        'When incarcerated, your wanted level counts as 1 less, your Tier as 1 more, and you gain ' +
        '+1 faction status with a faction you help on the inside (in addition to your ' +
        'incarceration roll).',
      category: 'spider',
    },
    {
      id: 'spider-mastermind',
      name: 'Mastermind',
      description: 'Spend special armor to protect a teammate from afar.',
      rules:
        'You may expend your special armor to protect a teammate, or to push yourself when you ' +
        'gather information or work on a long-term project. If you protect a teammate, this ' +
        'ability negates or reduces the severity of a consequence or harm that your teammate is ' +
        'facing — you don’t have to be present; say how you prepared. ' +
        SPECIAL_ARMOR,
      category: 'spider',
    },
    {
      id: 'spider-weavingwebs',
      name: 'Weaving the Web',
      description: 'Your network feeds the plan.',
      rules:
        'You gain +1d to Consort when you gather information on a target for a score. You get +1d ' +
        'to the engagement roll for that operation.',
      category: 'spider',
    },

    // Whisper
    {
      id: 'whisper-compel',
      name: 'Compel',
      description: 'Summon a nearby ghost and command it.',
      rules:
        'You can Attune to the spirit world to force a nearby ghost to appear and obey a command ' +
        'you give it. You are not supernaturally terrified by a ghost you summon or compel (though ' +
        'your allies may be).',
      category: 'whisper',
    },
    {
      id: 'whisper-ghostmind',
      name: 'Arcane Mind',
      description: 'Always aware of the supernatural.',
      rules:
        'You’re always aware of supernatural entities in your presence. Take +1d whenever you ' +
        'gather information about the supernatural by any means.',
      category: 'whisper',
    },
    {
      id: 'whisper-ironwill',
      name: 'Iron Will',
      description: 'Immune to supernatural terror.',
      rules:
        'You are immune to the terror that some supernatural entities inflict on sight. When you ' +
        'make a resistance roll with Resolve, take +1d.',
      category: 'whisper',
    },
    {
      id: 'whisper-occultist',
      name: 'Occultist',
      description: 'Deal with ancient powers — and command their worshippers.',
      rules:
        'You know the secret ways to Consort with ancient powers, forgotten gods, or demons. Once ' +
        'you’ve consorted with one, you get +1d to command cultists who worship it.',
      category: 'whisper',
    },
    {
      id: 'whisper-ritual',
      name: 'Ritual',
      description: 'Perform ritual sorcery; one ritual known.',
      rules:
        'You know the arcane methods to perform ritual sorcery. You can Study an occult ritual (or ' +
        'create a new one) to summon a supernatural effect or being. You begin with one ritual ' +
        'already learned.',
      category: 'whisper',
    },
    {
      id: 'whisper-strange',
      name: 'Strange Methods',
      description: 'Better arcane creations; one design known.',
      rules:
        'When you invent or craft a creation with arcane features, get +1 result level to your ' +
        'roll (a 1-3 becomes a 4/5, etc.). You begin with one arcane design already known.',
      category: 'whisper',
    },
    {
      id: 'whisper-tempest',
      name: 'Tempest',
      description: 'Call lightning or a storm.',
      rules:
        'You can push yourself to do one of the following: unleash a stroke of lightning as a ' +
        'weapon — summon a storm in your immediate vicinity (torrential rain, roaring winds, heavy ' +
        `fog, chilling frost or snow, etc.). ${PUSH_FEAT}`,
      category: 'whisper',
    },
    {
      id: 'whisper-warded',
      name: 'Warded',
      description: 'Spend special armor against the supernatural.',
      rules:
        'You may expend your special armor to resist a supernatural consequence, or to push ' +
        'yourself when you contend with or employ arcane forces. If you resist a consequence, ' +
        `this ability negates or reduces its severity. ${SPECIAL_ARMOR}`,
      category: 'whisper',
    },

    // Every playbook
    ...VETERAN,

    // Retired — earlier versions of this built-in shipped these non-SRD abilities. They stay only so
    // a sheet that already holds one still shows its text after a GM refreshes their copy; they are
    // on no roster and `retired` keeps them out of every pick (wizard, editor, bot, Veteran).
    {
      id: 'hound-tracker',
      name: 'Tracker',
      description: 'No trail goes cold for you.',
      rules:
        'When you follow a target, take +1d to track and to anticipate where they will go next.',
      category: 'hound',
      retired: true,
    },
    {
      id: 'hound-vigorous',
      name: 'Vigorous',
      description: 'Heal faster and shrug off the worst.',
      rules:
        'Your healing clock has fewer segments and you take reduced harm penalties at the moderate level.',
      category: 'hound',
      retired: true,
    },
    {
      id: 'slide-coverid',
      name: 'Connected Cover',
      description: 'Your false self has real backing.',
      rules:
        'Establish a standing cover identity with its own contacts and standing. It holds up to casual scrutiny without effort.',
      category: 'slide',
      retired: true,
    },
    {
      id: 'slide-acalculating',
      name: 'Cold Read',
      description: 'You see what a person wants.',
      rules:
        'When you study someone in conversation, you learn their desire, their fear, or how to best appeal to them.',
      category: 'slide',
      retired: true,
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
    // RAW (bladesinthedark.com/advancement): a desperate action roll marks 1 xp in the ATTRIBUTE
    // of the action rolled (the engine marks it with the roll); at the end of the session each
    // trigger that happened marks 1 xp (2 if it happened a lot) on any track — the playbook's own
    // trigger (`playbooks[].xpTrigger`) plus the two common ones below.
    xpTriggers: [
      {
        id: 'desperate',
        name: 'Desperate Action',
        description:
          'Every time you make a desperate action roll, mark 1 xp in the attribute for the action ' +
          'you rolled.',
        value: 1,
        kind: 'desperate-roll',
      },
      {
        id: 'playbook',
        name: 'Beliefs, Drives, Heritage, Background',
        description: 'You expressed your beliefs, drives, heritage, or background.',
        value: 1,
        kind: 'end-of-session',
      },
      {
        id: 'struggle',
        name: 'Vice or Trauma',
        description: 'You struggled with issues from your vice or traumas during the session.',
        value: 1,
        kind: 'end-of-session',
      },
    ],
    advancementOptions: [
      {
        id: 'buy-ability',
        name: 'New Special Ability',
        description:
          'When your playbook track fills, take a new special ability from your playbook (or, ' +
          'with a free Veteran slot, from another playbook).',
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
    // BitD creation: the playbook pre-places 3 action dots (seeded per playbook above — a floor the
    // player can't move), and the player assigns 4 more (max 2 in any action at creation) — 7 total.
    // Action ratings cap at 3 (4 only via the crew's "Mastery" upgrade — see crew abilities).
    // https://bladesinthedark.com/character-creation
    actionRatings: { points: 4, maxAtCreation: 2, max: 3 },
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
      // Identity, one field per step (the schema's home for listed choices: a step's `options`).
      // Heritage stays free text — BitD's heritages are setting content (excluded from the CC BY
      // grant). Backgrounds are the book's seven categories; vice texts are the SRD's
      // (bladesinthedark.com/character-creation, CC BY 3.0).
      {
        id: 'heritage',
        name: 'Heritage',
        description: 'Where your family line is from — and a detail about your family life.',
        order: 4,
        required: false,
      },
      {
        id: 'background',
        name: 'Background',
        description: 'What you did before you joined the crew. Add a specific detail.',
        order: 5,
        required: false,
        options: [
          {
            id: 'academic',
            name: 'Academic',
            description: 'A professor, student, researcher, or other scholar.',
          },
          {
            id: 'labor',
            name: 'Labor',
            description: 'A factory worker, dock hand, miner, hunter, sailor, or other tradesman.',
          },
          {
            id: 'law',
            name: 'Law',
            description: 'A lawyer, constable, investigator, bounty hunter, or jailer.',
          },
          {
            id: 'trade',
            name: 'Trade',
            description: 'A merchant, shopkeeper, artisan, or other business owner.',
          },
          {
            id: 'military',
            name: 'Military',
            description: 'A soldier, marine, officer, mercenary, or deserter.',
          },
          {
            id: 'noble',
            name: 'Noble',
            description: 'Born to wealth and title — fallen, disowned, or slumming it.',
          },
          {
            id: 'underworld',
            name: 'Underworld',
            description: 'A street urchin, gang member, fence, smuggler, or career criminal.',
          },
        ],
      },
      {
        id: 'vice',
        name: 'Vice',
        description:
          'Choose your vice, then name its specifics and your vice purveyor (who and where).',
        order: 6,
        // RAW character creation includes choosing a vice — and with none, indulging is impossible.
        required: true,
        options: [
          {
            id: 'faith',
            name: 'Faith',
            description: 'You’re dedicated to an unseen power, forgotten god, ancestor, etc.',
          },
          {
            id: 'gambling',
            name: 'Gambling',
            description: 'You crave games of chance, betting on sporting events, etc.',
          },
          {
            id: 'luxury',
            name: 'Luxury',
            description: 'Expensive or ostentatious displays of opulence.',
          },
          {
            id: 'obligation',
            name: 'Obligation',
            description: 'You’re devoted to a family, a cause, an organization, a charity, etc.',
          },
          {
            id: 'pleasure',
            name: 'Pleasure',
            description: 'Gratification from lovers, food, drink, drugs, art, theater, etc.',
          },
          {
            id: 'stupor',
            name: 'Stupor',
            description:
              'You seek oblivion in the abuse of drugs, drinking to excess, getting beaten to a ' +
              'pulp in the fighting pits, etc.',
          },
          {
            id: 'weird',
            name: 'Weird',
            description:
              'You experiment with strange essences, consort with rogue spirits, observe bizarre ' +
              'rituals or taboos, etc.',
          },
        ],
      },
      {
        id: 'review',
        name: 'Review',
        description: 'Look over the sheet and join the crew.',
        order: 7,
        required: true,
      },
    ],
  },

  stress: { max: 9, traumaMax: 4 },
  // The 8 canonical BitD trauma conditions; the validator enforces trauma ∈ this set.
  traumaConditions: [
    'Cold',
    'Haunted',
    'Obsessed',
    'Paranoid',
    'Reckless',
    'Soft',
    'Unstable',
    'Vicious',
  ],
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
    // SRD wording (bladesinthedark.com/crew-playbook) where printed; Mastery, Veteran and The Good
    // Stuff are book mechanics in original words.
    abilities: [
      {
        id: 'crew-deadly',
        name: 'Deadly',
        crewType: 'assassins',
        description:
          'Each PC may add +1 action rating to Hunt, Prowl, or Skirmish (up to a max rating of 3). ' +
          'If you take this ability during initial character and crew creation, it supersedes the ' +
          'normal starting limit for action ratings.',
        effects: {
          bonusActionDots: 1,
          bonusActionDotsIn: ['Hunt', 'Prowl', 'Skirmish'],
          bonusDotsExceedCreationCap: true,
        },
      },
      {
        id: 'crew-death-veil',
        name: 'Death Veil',
        crewType: 'assassins',
        description:
          'Due to hard-won experience or occult ritual, you don’t take extra heat when killing is ' +
          'involved on a score.',
      },
      {
        id: 'crew-no-traces',
        name: 'No Traces',
        crewType: 'assassins',
        description:
          'When you keep an operation quiet or make it look like an accident, you get half the rep ' +
          'value of the target (round up) instead of zero. When you end downtime with zero heat, ' +
          'take +1 rep.',
      },
      {
        id: 'crew-predators',
        name: 'Predators',
        crewType: 'assassins',
        description:
          'When you use a stealth or deception plan to commit murder, take +1d to the engagement ' +
          'roll.',
      },
      {
        id: 'crew-fiends',
        name: 'Fiends',
        crewType: 'bravos',
        description:
          'Fear is as good as respect. You may count each wanted level as if it were turf. ' +
          '(Regardless of turf, the minimum rep cost to advance your Tier is always 6.)',
      },
      {
        id: 'crew-forged-in-the-fire',
        name: 'Forged in the Fire',
        crewType: 'bravos',
        description:
          'Each PC has been toughened by cruel experience. You get +1d to resistance rolls.',
      },
      {
        id: 'crew-war-dogs',
        name: 'War Dogs',
        crewType: 'bravos',
        description:
          'When you’re at war (-3 faction status), your crew does not suffer -1 hold and PCs still ' +
          'get two downtime activities, instead of just one.',
      },
      {
        id: 'crew-anointed',
        name: 'Anointed',
        crewType: 'cult',
        description:
          'You gain +1d to resistance rolls against supernatural threats. You get +1d to healing ' +
          'rolls when you have supernatural harm.',
      },
      {
        id: 'crew-accord',
        name: 'Accord',
        crewType: 'hawkers',
        description:
          'Sometimes friends are as good as territory. You may treat up to three +3 faction ' +
          'statuses you hold as if they are turf. (Regardless of turf, the minimum rep cost to ' +
          'advance your Tier is always 6.)',
      },
      {
        id: 'crew-high-society',
        name: 'High Society',
        crewType: 'hawkers',
        description:
          'It’s all about who you know. Take -1 heat during downtime and +1d to gather information ' +
          'about the city’s elite.',
      },
      {
        id: 'crew-the-good-stuff',
        name: 'The Good Stuff',
        crewType: 'hawkers',
        description:
          'Your merchandise is exquisite: its quality is equal to your Tier +2. When you deal with ' +
          'a crew or faction, the GM tells you who among them is hooked on your product (one, a ' +
          'few, many, or all).',
      },
      {
        id: 'crew-network',
        name: 'Pack Rats',
        crewType: 'shadows',
        description:
          'Your lair is a jumble of stolen items. When you roll to acquire an asset, take +1d.',
      },
      {
        id: 'crew-second-story',
        name: 'Second Story',
        crewType: 'shadows',
        description:
          'When you execute a clandestine infiltration, you get +1d to the engagement roll.',
      },
      {
        id: 'crew-synchronized',
        name: 'Synchronized',
        crewType: 'shadows',
        description:
          'When you perform a group action, you may count multiple 6s from different rolls as a ' +
          'critical success.',
      },
      {
        id: 'crew-all-hands',
        name: 'All Hands',
        crewType: 'smugglers',
        description:
          'During downtime, one of your cohorts may perform a downtime activity for the crew to ' +
          'acquire an asset, reduce heat, or work on a long-term project.',
      },
      {
        id: 'crew-just-passing-through',
        name: 'Just Passing Through',
        crewType: 'smugglers',
        description:
          'During downtime, take -1 heat. When your heat is 4 or less, you get +1d to deceive ' +
          'people when you pass yourselves off as ordinary citizens.',
      },
      {
        // On the Assassins, Bravos, Hawkers and Shadows sheets [book].
        id: 'crew-patron',
        name: 'Patron',
        crewTypes: ['assassins', 'bravos', 'hawkers', 'shadows'],
        description: 'When you advance your Tier, it costs half the coin it normally would.',
        effects: { halfTierCost: true },
      },
      // Veteran is on every crew sheet (three boxes, like the playbook Veteran) [book]: each take
      // opens ONE special ability from another crew type's list. It never lets members take other
      // playbooks' abilities — that is the playbook Veteran.
      {
        id: 'crew-veteran',
        name: 'Veteran',
        description: 'Choose a special ability from another crew type.',
        effects: { crewVeteran: 1 },
      },
      {
        id: 'crew-veteran-2',
        name: 'Veteran (second)',
        prerequisite: 'crew-veteran',
        description: 'Take Veteran again: choose another special ability from another crew type.',
        effects: { crewVeteran: 1 },
      },
      {
        id: 'crew-veteran-3',
        name: 'Veteran (third)',
        prerequisite: 'crew-veteran-2',
        description: 'Take Veteran a third time: another special ability from another crew type.',
        effects: { crewVeteran: 1 },
      },
      {
        // An UPGRADE, not a special ability (bladesinthedark.com/crew → Mastery): "You may advance
        // your PCs' action ratings to 4… This costs four upgrade boxes to unlock." — two crew
        // advances spent on upgrade boxes.
        id: 'crew-mastery',
        name: 'Mastery',
        description:
          'Your crew has access to master level training: PCs may advance their action ratings ' +
          'to 4 (instead of the usual cap of 3). Costs four upgrade boxes to unlock.',
        upgradeBoxes: 4,
        effects: { actionMax: 4 },
      },
      // Retired (non-SRD, shipped by earlier versions) — kept so a crew that holds one still shows it.
      {
        id: 'crew-deadly-friends',
        name: 'Deadly Friends',
        description: 'Your cohorts are elite — they roll with increased effect.',
        retired: true,
      },
      {
        id: 'crew-fortified',
        name: 'Fortified',
        description: 'Your lair is hardened — gain +1d to resist intrusion and raids.',
        retired: true,
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
};
