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
  rollTitle: (dice: number) =>
    dice === 0 ? 'Action roll — 0d (2d, take lowest)' : `Action roll — ${dice}d`,
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
  noCategoryHere:
    'This channel isn’t inside a category — link the channel or the whole server instead.',
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
  loggedFooter: (campaign: string) => `Logged to ${campaign}`,
  notLoggedNotLinked: 'Not logged — this channel isn’t linked to a campaign.',
  notLoggedNoCharacter: 'Not logged — no active character. `/character use` picks one.',
  notLoggedNotMember: 'Not logged — you’re not a member of the linked campaign.',
  notLoggedWrongCampaign: 'Not logged — your active character isn’t in the linked campaign.',
  pushedCharged: 'Pushed (+1d) — 2 stress marked on your sheet',
  resistCharged: (character: string, stress: number) =>
    stress < 0
      ? `Critical — **1 stress cleared** on ${character}’s sheet.`
      : stress === 0
        ? `Resisted for free — ${character}’s sheet unchanged.`
        : `**${stress} stress** marked on ${character}’s sheet.`,
  rollNeedsActiveCharacter: (siteUrl: string) =>
    `Sheet rolls need an active character — \`/character use\` picks one (or sign in with Discord at ${siteUrl} first).`,
  unknownAction: (name: string) =>
    `“${name}” isn't an action on your active character's ruleset. Try the autocomplete suggestions.`,
  pushedReminder: 'Pushed (+1d) — mark 2 stress on your sheet',
  sheetRollTitle: (character: string, action: string, rating: number, modifier: number) => {
    const mod = modifier > 0 ? ` +${modifier}d` : modifier < 0 ? ` −${-modifier}d` : '';
    return `${character} — ${action} ${rating}d${mod}`;
  },
  noActiveScore: 'No active score — `/score start` begins one.',
  scoreStarted: (name: string | null) => (name ? `Score started — **${name}**.` : 'Score started.'),
  scoreEnded: (name: string | null) => (name ? `Score wrapped — **${name}**.` : 'Score wrapped.'),
  scoreLogStart: 'Score started',
  scoreLogEnd: 'Score ended',
  noCrew: 'No crew sheet yet — create it on the web app first.',
  crewTierNotReady: (rep: number) => `The Rep track isn’t full — ${rep}/12.`,
  crewLogHeat: (amount: number) => `+${amount} heat`,
  crewLogTier: 'Advanced a tier',
  crewLogIncarcerate: 'Incarceration — Wanted down one, Heat cleared',
  harmPenaltyNote: '−1d (moderate harm)',
  severeHarmNote: 'Severe harm — acting needs help or a push',
  crewLogXp: (xp: number, total: number) => `Crew XP ${xp}/${total}`,
  crewXpMarked: (xp: number, total: number, ready: boolean) =>
    `Crew XP **${xp}/${total}**${ready ? ' — full! Take it with `/crew advance`.' : '.'}`,
  crewAdvanceNotReady: (xp: number, total: number) =>
    `The advancement track isn’t full — ${xp}/${total}.`,
  crewLogAdvance: 'Crew advance taken — new crew ability unlocked',
  crewAdvanceTaken: 'Advance taken — the track resets. Pick a new crew ability on the crew sheet.',
  clockNotFound: (name: string) => `No clock “${name}”. Try the autocomplete suggestions.`,
  clockTicked: (name: string, filled: number, segments: number) =>
    `**${name}** — ${filled}/${segments}.`,
  clockCompleted: '**It comes to a head!**',
  clockLogFilled: (name: string) => `${name} filled`,
  factionNotFound: (name: string) => `No faction “${name}”. Try the autocomplete suggestions.`,
  factionStatusFmt: (status: number) => (status > 0 ? `+${status}` : `${status}`),
  factionSet: (name: string, statusLabel: string) => `**${name}** — status **${statusLabel}**.`,
  factionLogStatus: (statusLabel: string) => `Status → ${statusLabel}`,
  gmActionFailed: (reason: string) => `Couldn’t do that: ${reason}`,
  stressLine: (name: string, stress: number, max: number) =>
    `**${name}** — stress **${stress}/${max}**.`,
  stressUnchanged: (name: string) =>
    `**${name}**’s stress track is already there — nothing changed.`,
  harmTaken: (name: string, level: string, description: string) =>
    `**${name}** takes **${level}** harm: “${description}”.`,
  harmEscalated: (dealt: string, applied: string) =>
    `Dealt at ${dealt} — landed at **${applied}** (the ${dealt} track is full).`,
  harmFull:
    'Every harm track is full — that’s trauma/death territory. Settle it at the table, then update the sheet on the web.',
  harmCleared: (name: string, description: string) =>
    `**${name}** recovers — “${description}” cleared.`,
  harmNotFound: (entry: string) =>
    `No harm entry “${entry}” on that track. Try the autocomplete suggestions.`,
  harmLogTaken: (level: string, description: string) => `Took ${level} harm: ${description}`,
  harmLogCleared: (level: string, description: string) => `Cleared ${level} harm: ${description}`,
  // F44 — spend armor: the harm drops a level (lesser is absorbed outright).
  harmAbsorbed: (name: string, description: string) =>
    `**${name}** spends armor — “${description}” glances off. No harm marked.`,
  harmArmorReduced: 'Armor spent — the harm landed one level lighter.',
  harmLogAbsorbed: (description: string) => `Spent armor — absorbed the harm: ${description}`,
  noArmor:
    'No armor to spend — none carried in the current loadout, or it’s already spent this score.',
  viceTitle: (name: string, dice: number) =>
    dice === 0 ? `${name} indulges — 0d (2d, take lowest)` : `${name} indulges — ${dice}d`,
  viceCleared: (cleared: number, stress: number, max: number) =>
    `Cleared **${cleared}** stress — now ${stress}/${max}.`,
  viceOverindulged:
    'Overindulged — you cleared more than was marked. The GM narrates the complication (RAW).',
  viceLog: 'Indulged their vice',
  xpMarked: (name: string, amount: number, total: number) =>
    `**${name}** marks ${amount} XP — **${total}** banked.`,
  xpMarkedTrack: (name: string, amount: number, trackLabel: string, marks: number, size: number) =>
    `**${name}** marks ${amount} XP — **${trackLabel} ${marks}/${size}**.`,
  xpPlaybookTrack: 'Playbook',
  xpTrackInvalid: 'That isn’t an XP track on your ruleset. Try the autocomplete suggestions.',
  xpLogMark: (amount: number) => `Marked ${amount} XP`,
  xpReasonDefault: 'Marked via Discord',
  xpAdvanced: (name: string, what: string) => `**${name}** advances — ${what}.`,
  xpAdvanceFailed: (reason: string) => `Couldn’t advance: ${reason}`,
  xpPickInvalid: 'Pick an advance from the autocomplete suggestions.',
  xpLogAbility: (name: string) => `Learned ${name}`,
  xpLogDot: (action: string) => `+1 ${action} dot`,
  learnAbility: (name: string) => `learned **${name}**`,
  actionDot: (name: string) => `+1 **${name}** dot`,
  helpTitle: 'HeistMind — commands',
  helpBody: (siteUrl: string) =>
    [
      '**Dice — no account needed**',
      '`/roll dice:3` action roll · `/resist` · `/fortune` · `/dice 2d6+1`',
      '',
      '**Your sheet** — sign in with Discord on the site once, then `/character use`',
      '`/roll action:Skirmish` (+`extra`, `push`) · `/character show` · `/stress add|clear` · `/harm take|clear` (+`armor` to soak a level) · `/vice indulge` · `/xp mark|advance`',
      '',
      '**Linked campaigns** — the GM runs `/heist link` in a channel',
      'Sheet rolls and `/resist` there land in the campaign log. `/log` records a settled result · `/heist status` shows score/crew/clocks.',
      '',
      '**GM controls — in the linked channel**',
      '`/score start|end` · `/crew heat|tier|incarcerate|xp|advance` · `/clock tick` · `/faction status`',
      '',
      `Build characters, campaigns, and rulesets at ${siteUrl}.`,
    ].join('\n'),
  aboutTitle: 'HeistMind — the mechanical layer for Forged-in-the-Dark play',
  aboutBody: (siteUrl: string, sha: string) =>
    [
      `Rules-driven FitD dice, right here. Build characters and run campaigns at ${siteUrl}.`,
      '',
      'No data is stored for manual rolls — no account needed.',
      `Deployed: \`${sha}\``,
    ].join('\n'),
} as const;
