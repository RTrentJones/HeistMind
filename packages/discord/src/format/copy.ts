// Every user-facing string the bot sends, in one place (the client owns its copy — same rule as
// the web app's i18n). English-only for now; keyed functions so a locale layer can slot in.
import type { RollOutcome } from '@heist-mind/core';

export const OUTCOME_LABEL: Record<RollOutcome, string> = {
  crit: 'Critical!',
  success: 'Full success',
  partial: 'Partial success',
  bad: 'Bad outcome',
};

export const copy = {
  rollTitle: (dice: number) => (dice === 0 ? 'Action roll — 0d (2d, take lowest)' : `Action roll — ${dice}d`),
  fortuneTitle: (dice: number) =>
    dice === 0 ? 'Fortune roll — 0d (2d, take lowest)' : `Fortune roll — ${dice}d`,
  resistTitle: (dice: number, attribute: string | null) =>
    `Resistance roll${attribute ? ` — ${attribute}` : ''}${dice === 0 ? ' — 0d (2d, take lowest)' : ` — ${dice}d`}`,
  faces: (results: number[]) => `[${results.join(', ')}]`,
  positionEffect: (position: string | null, effect: string | null) =>
    position && effect ? `${position} / ${effect}` : (position ?? effect ?? ''),
  resistCost: (stress: number) =>
    stress < 0
      ? 'Critical — **clear 1 stress**.'
      : stress === 0
        ? 'Resisted for free — **0 stress**.'
        : `Resisted — mark **${stress} stress**.`,
  diceTitle: (notation: string) => `Roll — ${notation}`,
  diceTotal: (total: number) => `Total: **${total}**`,
  diceInvalid:
    'Use NdM with optional modifier, e.g. `2d6`, `4d8+2`, `1d20-1` (max 100 dice, d1000).',
  unknownCommand: "I don't know that command. Try `/roll` or `/heist about`.",
  notConfigured: 'Account features are not configured on this deployment yet.',
  signInFirst: (siteUrl: string) =>
    `No HeistMind account is linked to your Discord yet. Sign in with Discord at ${siteUrl} once — that's the whole link — then try again.`,
  somethingBroke: 'Something went wrong on our side — try again in a moment.',
  characterNotFound: (name: string, owned: number) =>
    owned === 0
      ? "You don't have any characters yet — build one on the site first."
      : `No character of yours is named “${name}”. Try the autocomplete suggestions.`,
  characterInUse: (name: string) =>
    `**${name}** is now your active character. Your rolls will use their sheet.`,
  characterUnset: 'Active character cleared — /roll falls back to manual dice pools.',
  noActiveCharacter: 'No active character. Pick one with `/character use`.',
  sheetPlaybook: 'Playbook',
  sheetStress: 'Stress',
  sheetCoin: 'Coin',
  sheetHarm: 'Harm',
  sheetNoHarm: 'Unharmed',
  sheetStandalone: 'Standalone — not in a campaign',
  sheetInCampaign: (game: string) => `Crewing in **${game}**`,
  rollNeedsDiceOrAction: 'Give me a pool (`/roll dice:3`) or an action (`/roll action:Skirmish`).',
  accountStatus: (username: string, activeCharacter: string | null) =>
    `Linked as **${username}**. Active character: ${activeCharacter ? `**${activeCharacter}**` : 'none — `/character use` picks one'}.`,
  guildOnly: 'That works inside a server channel, not here.',
  gmOnly: 'Only the campaign’s GM can do that.',
  notLinked: 'Nothing is linked here yet — the GM can run `/heist link`.',
  notMember: 'This channel is linked to a HeistMind campaign you’re not a member of.',
  campaignNotFound: (name: string) =>
    `No campaign of yours is named “${name}”. Try the autocomplete suggestions.`,
  noCategoryHere: 'This channel isn’t inside a category — link the channel or the whole server instead.',
  alreadyLinked: 'That Discord surface is already linked to a campaign — unlink it first.',
  linked: (campaign: string, scope: string) =>
    `**${campaign}** is now linked to this ${scope}. Rolls and \`/log\` entries here land in its campaign log.`,
  unlinked: (campaign: string) => `**${campaign}** is no longer linked here.`,
  linkFeedNote: (scope: string) => `Discord ${scope} linked`,
  unlinkFeedNote: 'Discord link removed',
  logRecorded: (text: string) => `Logged to the campaign: _${text}_`,
  statusTitle: (campaign: string) => `${campaign} — campaign status`,
  statusState: 'State',
  statusScore: 'Active score',
  statusNoScore: 'Between scores',
  statusCrew: 'Crew',
  statusCrewLine: (tier: number, heat: number, wanted: number) =>
    `Tier ${tier} · Heat ${heat}/9 · Wanted ${wanted}/4`,
  statusNoCrew: 'No crew sheet yet',
  statusClocks: 'Running clocks',
  statusNoClocks: 'None',
  rollNeedsActiveCharacter: (siteUrl: string) =>
    `Sheet rolls need an active character — \`/character use\` picks one (or sign in with Discord at ${siteUrl} first).`,
  unknownAction: (name: string) =>
    `“${name}” isn't an action on your active character's ruleset. Try the autocomplete suggestions.`,
  pushedReminder: 'Pushed (+1d) — mark 2 stress on your sheet',
  sheetRollTitle: (character: string, action: string, rating: number, extra: number, push: boolean) => {
    const bonus = extra + (push ? 1 : 0);
    return `${character} — ${action} ${rating}d${bonus > 0 ? ` +${bonus}d` : ''}`;
  },
  aboutTitle: 'HeistMind — the mechanical layer for Forged-in-the-Dark play',
  aboutBody: (siteUrl: string, sha: string) =>
    [
      `Rules-driven FitD dice, right here. Build characters and run campaigns at ${siteUrl}.`,
      '',
      'No data is stored for manual rolls — no account needed.',
      `Deployed: \`${sha}\``,
    ].join('\n'),
} as const;
