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

const POSITIONS = ['controlled', 'risky', 'desperate'] as const;
const EFFECTS = ['limited', 'standard', 'great'] as const;

// Chat-input commands only (the narrower type keeps `description` required and typo-checked).
export const COMMAND_MANIFEST: RESTPostAPIChatInputApplicationCommandsJSONBody[] = [
  {
    name: 'roll',
    description: 'Roll a Forged-in-the-Dark action pool (0d rolls 2, take lowest)',
    ...EVERYWHERE,
    options: [
      {
        type: ApplicationCommandOptionType.Integer,
        name: 'dice',
        description: 'Your dice pool (action rating + bonuses)',
        required: true,
        min_value: 0,
        max_value: 10,
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
    ],
  },
];
