// The slash-command manifest — the single source of truth the registration script PUTs to
// Discord (bulk overwrite; atomic + idempotent). Commands are designed in their FINAL shape and
// only gain options across phases, so player muscle memory never breaks. Every command is
// registered for BOTH install models (guild + user) and all contexts — Phase 0/1 gameplay works
// in any server or DM via user-install ("sheet anywhere").
import {
  ApplicationCommandOptionType,
  ApplicationIntegrationType,
  InteractionContextType,
  type RESTPostAPIChatInputApplicationCommandsJSONBody,
} from 'discord-api-types/v10';

const EVERYWHERE = {
  integration_types: [
    ApplicationIntegrationType.GuildInstall,
    ApplicationIntegrationType.UserInstall,
  ],
  contexts: [
    InteractionContextType.Guild,
    InteractionContextType.BotDM,
    InteractionContextType.PrivateChannel,
  ],
};

// GM commands act on the campaign linked to THIS server surface — meaningless in DMs.
const GUILD_ONLY = {
  integration_types: [
    ApplicationIntegrationType.GuildInstall,
    ApplicationIntegrationType.UserInstall,
  ],
  contexts: [InteractionContextType.Guild],
};

const POSITIONS = ['controlled', 'risky', 'desperate'] as const;
const EFFECTS = ['limited', 'standard', 'great'] as const;

const FACTION_STATUSES = [
  { name: '-3 (war)', value: -3 },
  { name: '-2 (hostile)', value: -2 },
  { name: '-1 (interfering)', value: -1 },
  { name: '0 (neutral)', value: 0 },
  { name: '+1 (helpful)', value: 1 },
  { name: '+2 (friendly)', value: 2 },
  { name: '+3 (allied)', value: 3 },
];

// Chat-input commands only (the narrower type keeps `description` required and typo-checked).
export const COMMAND_MANIFEST: RESTPostAPIChatInputApplicationCommandsJSONBody[] = [
  {
    name: 'roll',
    description: 'Roll a Forged-in-the-Dark action — your sheet’s action or a manual pool',
    ...EVERYWHERE,
    options: [
      {
        type: ApplicationCommandOptionType.Integer,
        name: 'dice',
        description: 'Manual dice pool (skip this when rolling a sheet action)',
        min_value: 0,
        max_value: 10,
      },
      {
        type: ApplicationCommandOptionType.String,
        name: 'action',
        description: 'Roll your ACTIVE character’s action (e.g. Skirmish)',
        autocomplete: true,
        max_length: 100,
      },
      {
        type: ApplicationCommandOptionType.Integer,
        name: 'extra',
        description: 'Bonus dice (assists, devil’s bargains)',
        min_value: 0,
        max_value: 3,
      },
      {
        type: ApplicationCommandOptionType.Boolean,
        name: 'push',
        description: 'Push yourself: +1d for 2 stress',
      },
      {
        type: ApplicationCommandOptionType.String,
        name: 'position',
        description: 'The position you act from',
        choices: POSITIONS.map(p => ({ name: p, value: p })),
      },
      {
        type: ApplicationCommandOptionType.String,
        name: 'effect',
        description: 'The effect level at stake',
        choices: EFFECTS.map(e => ({ name: e, value: e })),
      },
      {
        type: ApplicationCommandOptionType.String,
        name: 'note',
        description: 'What you are attempting',
        max_length: 200,
      },
    ],
  },
  {
    name: 'resist',
    description: 'Roll to resist a consequence (stress = 6 − highest die; a critical clears 1)',
    ...EVERYWHERE,
    options: [
      {
        type: ApplicationCommandOptionType.Integer,
        name: 'dice',
        description: 'Your attribute rating',
        required: true,
        min_value: 0,
        max_value: 10,
      },
      {
        type: ApplicationCommandOptionType.String,
        name: 'attribute',
        description: 'Which attribute resists (e.g. Prowess)',
        max_length: 40,
      },
    ],
  },
  {
    name: 'fortune',
    description: 'Roll a fortune pool (the GM’s odds roll)',
    ...EVERYWHERE,
    options: [
      {
        type: ApplicationCommandOptionType.Integer,
        name: 'dice',
        description: 'The fortune pool (0d rolls 2, take lowest)',
        required: true,
        min_value: 0,
        max_value: 10,
      },
      {
        type: ApplicationCommandOptionType.String,
        name: 'note',
        description: 'What fortune decides',
        max_length: 200,
      },
    ],
  },
  {
    name: 'dice',
    description: 'Roll plain dice: NdM with an optional modifier, e.g. 2d6, 4d8+2',
    ...EVERYWHERE,
    options: [
      {
        type: ApplicationCommandOptionType.String,
        name: 'notation',
        description: 'NdM[+/-k] — up to 100 dice, d1000',
        required: true,
        max_length: 16,
      },
    ],
  },
  {
    name: 'character',
    description: 'Your active HeistMind character — the sheet your rolls use',
    ...EVERYWHERE,
    options: [
      {
        type: ApplicationCommandOptionType.Subcommand,
        name: 'use',
        description: 'Set your active character (one at a time)',
        options: [
          {
            type: ApplicationCommandOptionType.String,
            name: 'name',
            description: 'One of your characters',
            required: true,
            autocomplete: true,
            max_length: 100,
          },
        ],
      },
      {
        type: ApplicationCommandOptionType.Subcommand,
        name: 'show',
        description: 'Show your active character sheet',
        options: [
          {
            type: ApplicationCommandOptionType.Boolean,
            name: 'share',
            description: 'Post it to the channel instead of just to you',
          },
        ],
      },
      {
        type: ApplicationCommandOptionType.Subcommand,
        name: 'unset',
        description: 'Clear your active character',
      },
    ],
  },
  {
    name: 'heist',
    description: 'HeistMind — account, campaign links, and info',
    ...EVERYWHERE,
    options: [
      {
        type: ApplicationCommandOptionType.Subcommand,
        name: 'about',
        description: 'What this bot is, privacy, and the deployed version',
      },
      {
        type: ApplicationCommandOptionType.Subcommand,
        name: 'help',
        description: 'Every command, grouped by what it needs',
      },
      {
        type: ApplicationCommandOptionType.Subcommand,
        name: 'account',
        description: 'Your linked HeistMind account and active character',
      },
      {
        type: ApplicationCommandOptionType.Subcommand,
        name: 'link',
        description: 'GM: link a campaign to this channel, its category, or the whole server',
        options: [
          {
            type: ApplicationCommandOptionType.String,
            name: 'campaign',
            description: 'One of your campaigns',
            required: true,
            autocomplete: true,
            max_length: 100,
          },
          {
            type: ApplicationCommandOptionType.String,
            name: 'scope',
            description: 'What this link covers (default: this channel)',
            choices: [
              { name: 'channel', value: 'channel' },
              { name: 'category', value: 'category' },
              { name: 'server', value: 'server' },
            ],
          },
        ],
      },
      {
        type: ApplicationCommandOptionType.Subcommand,
        name: 'unlink',
        description: 'GM: remove the campaign link for this surface',
      },
      {
        type: ApplicationCommandOptionType.Subcommand,
        name: 'status',
        description: 'The linked campaign at a glance: score, crew, clocks',
      },
    ],
  },
  {
    name: 'stress',
    description: 'Mark or clear stress on your active character’s sheet',
    ...EVERYWHERE,
    options: [
      {
        type: ApplicationCommandOptionType.Subcommand,
        name: 'add',
        description: 'Mark stress (a cost you’re paying)',
        options: [
          {
            type: ApplicationCommandOptionType.Integer,
            name: 'amount',
            description: 'How much stress to mark',
            required: true,
            min_value: 1,
            max_value: 9,
          },
        ],
      },
      {
        type: ApplicationCommandOptionType.Subcommand,
        name: 'clear',
        description: 'Clear stress (recovery)',
        options: [
          {
            type: ApplicationCommandOptionType.Integer,
            name: 'amount',
            description: 'How much stress to clear',
            required: true,
            min_value: 1,
            max_value: 9,
          },
        ],
      },
    ],
  },
  {
    name: 'harm',
    description: 'Take or clear harm on your active character (logged to the campaign)',
    ...EVERYWHERE,
    options: [
      {
        type: ApplicationCommandOptionType.Subcommand,
        name: 'take',
        description: 'Take harm — a full track escalates it upward (RAW)',
        options: [
          {
            type: ApplicationCommandOptionType.String,
            name: 'level',
            description: 'The level the harm was dealt at',
            required: true,
            choices: [
              { name: 'lesser', value: 'lesser' },
              { name: 'moderate', value: 'moderate' },
              { name: 'severe', value: 'severe' },
            ],
          },
          {
            type: ApplicationCommandOptionType.String,
            name: 'description',
            description: 'The injury as it reads on the sheet (e.g. Broken ribs)',
            required: true,
            max_length: 100,
          },
        ],
      },
      {
        type: ApplicationCommandOptionType.Subcommand,
        name: 'clear',
        description: 'Clear one harm entry (recovery)',
        options: [
          {
            type: ApplicationCommandOptionType.String,
            name: 'level',
            description: 'The track the entry sits on',
            required: true,
            choices: [
              { name: 'lesser', value: 'lesser' },
              { name: 'moderate', value: 'moderate' },
              { name: 'severe', value: 'severe' },
            ],
          },
          {
            type: ApplicationCommandOptionType.String,
            name: 'entry',
            description: 'Which entry to clear',
            required: true,
            autocomplete: true,
            max_length: 100,
          },
        ],
      },
    ],
  },
  {
    name: 'vice',
    description: 'Indulge your vice (downtime): roll your lowest attribute, clear that much stress',
    ...EVERYWHERE,
    options: [
      {
        type: ApplicationCommandOptionType.Subcommand,
        name: 'indulge',
        description: 'Roll the vice pool and clear stress (overindulgence is flagged)',
      },
    ],
  },
  {
    name: 'xp',
    description: 'Mark XP or spend an advance on your active character',
    ...EVERYWHERE,
    options: [
      {
        type: ApplicationCommandOptionType.Subcommand,
        name: 'mark',
        description: 'Mark XP into your pool (logged to the campaign)',
        options: [
          {
            type: ApplicationCommandOptionType.Integer,
            name: 'amount',
            description: 'How much XP (default 1)',
            min_value: 1,
            max_value: 5,
          },
          {
            type: ApplicationCommandOptionType.String,
            name: 'reason',
            description: 'Why (recorded with the mark)',
            max_length: 100,
          },
        ],
      },
      {
        type: ApplicationCommandOptionType.Subcommand,
        name: 'advance',
        description: 'Spend XP: learn an ability or add an action dot',
        options: [
          {
            type: ApplicationCommandOptionType.String,
            name: 'pick',
            description: 'What to buy',
            required: true,
            autocomplete: true,
            max_length: 100,
          },
        ],
      },
    ],
  },
  {
    name: 'score',
    description: 'GM: start or wrap the linked campaign’s score (operation)',
    ...GUILD_ONLY,
    options: [
      {
        type: ApplicationCommandOptionType.Subcommand,
        name: 'start',
        description: 'Start a score (one active at a time)',
        options: [
          {
            type: ApplicationCommandOptionType.String,
            name: 'name',
            description: 'What the crew is attempting',
            max_length: 100,
          },
        ],
      },
      {
        type: ApplicationCommandOptionType.Subcommand,
        name: 'end',
        description: 'Wrap the active score',
      },
    ],
  },
  {
    name: 'crew',
    description: 'GM: crew progression — heat, tier, incarceration',
    ...GUILD_ONLY,
    options: [
      {
        type: ApplicationCommandOptionType.Subcommand,
        name: 'heat',
        description: 'Add heat (a full track marks a Wanted level)',
        options: [
          {
            type: ApplicationCommandOptionType.Integer,
            name: 'amount',
            description: 'Heat to add',
            required: true,
            min_value: 1,
            max_value: 9,
          },
        ],
      },
      {
        type: ApplicationCommandOptionType.Subcommand,
        name: 'tier',
        description: 'Spend a full Rep track to advance the crew a tier',
      },
      {
        type: ApplicationCommandOptionType.Subcommand,
        name: 'incarcerate',
        description: 'Someone takes the fall: Wanted −1, Heat cleared',
      },
    ],
  },
  {
    name: 'clock',
    description: 'GM: tick a progress clock (filling it announces the milestone)',
    ...GUILD_ONLY,
    options: [
      {
        type: ApplicationCommandOptionType.Subcommand,
        name: 'tick',
        description: 'Advance (or wind back) a clock',
        options: [
          {
            type: ApplicationCommandOptionType.String,
            name: 'clock',
            description: 'Which clock',
            required: true,
            autocomplete: true,
            max_length: 100,
          },
          {
            type: ApplicationCommandOptionType.Integer,
            name: 'segments',
            description: 'Segments to add (default 1; negative winds back)',
            min_value: -8,
            max_value: 8,
          },
        ],
      },
    ],
  },
  {
    name: 'faction',
    description: 'GM: set a faction’s status toward the crew',
    ...GUILD_ONLY,
    options: [
      {
        type: ApplicationCommandOptionType.Subcommand,
        name: 'status',
        description: 'Set the standing (−3 war … +3 allied)',
        options: [
          {
            type: ApplicationCommandOptionType.String,
            name: 'faction',
            description: 'Which faction',
            required: true,
            autocomplete: true,
            max_length: 100,
          },
          {
            type: ApplicationCommandOptionType.Integer,
            name: 'status',
            description: 'The new standing',
            required: true,
            choices: FACTION_STATUSES,
          },
        ],
      },
    ],
  },
  {
    name: 'log',
    description: 'Record a settled result into the linked campaign’s log',
    ...GUILD_ONLY,
    options: [
      {
        type: ApplicationCommandOptionType.String,
        name: 'text',
        description: 'What happened (attributed to you; tagged to the active score)',
        required: true,
        max_length: 500,
      },
    ],
  },
];
