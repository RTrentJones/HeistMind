'use client';

import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import type { Character, Roll } from '@heist-mind/core';
import i18n from '@/lib/i18n';
import { characterQueries, useCharactersByPlayer } from '@/features/characters/data/queries';
import {
  rolesFor,
  useGamesByCreator,
  useGamesByPlayer,
  type GameWithRole,
} from '@/features/games/data/queries';
import { rollsByGameOptions } from '@/features/rolls/data/queries';

export type DashboardCampaign = GameWithRole;

export interface DashboardActivity {
  roll: Roll;
  gameName: string;
  /** Older crew updates folded into this (newest) crew row — round 4 P2-N6. */
  collapsed?: number;
}

/**
 * Fold each run of back-to-back CREW events from the same campaign into its newest row with a
 * count: marking crew XP is one log row per box ("Crew XP 6/8", "7/8", "8/8"…), which pushed
 * everything else out of a six-row feed. Input newest-first; character/roll rows never fold.
 */
export function collapseCrewRuns(entries: DashboardActivity[]): DashboardActivity[] {
  const out: DashboardActivity[] = [];
  for (const entry of entries) {
    const prev = out[out.length - 1];
    if (
      prev &&
      entry.roll.kind === 'crew' &&
      prev.roll.kind === 'crew' &&
      prev.roll.gameId === entry.roll.gameId
    ) {
      out[out.length - 1] = { ...prev, collapsed: (prev.collapsed ?? 0) + 1 };
      continue;
    }
    out.push(entry);
  }
  return out;
}

/**
 * One dashboard section's async state — kept DISTINCT per section so a failed query never renders
 * as that section's empty state ("No activity" when the feed actually failed to load).
 */
export interface SectionStatus {
  loading: boolean;
  error: string | null;
  retry: () => void;
}

export interface DashboardData {
  campaigns: DashboardCampaign[];
  characters: Character[];
  /**
   * Names for every character an activity row references — the viewer's own plus the rosters of
   * campaigns whose feed mentions a character the viewer doesn't own (a GM sees players' rolls).
   */
  characterNames: Record<string, string>;
  activity: DashboardActivity[];
  campaignsStatus: SectionStatus;
  charactersStatus: SectionStatus;
  activityStatus: SectionStatus;
}

// Bound the activity fan-out: a few of the user's campaigns, a few events each, newest few overall.
const MAX_ACTIVITY_GAMES = 10;
const PER_GAME_ACTIVITY = 5;
const MAX_ACTIVITY = 6;

/**
 * Aggregates the logged-in home over the React Query data seam: the user's campaigns (GM + joined),
 * their characters, and a merged "recent activity" feed across those campaigns. Composes the
 * per-concept hooks (no direct repository access) — campaigns/characters from their query hooks, and
 * a bounded `useQueries` fan-out for the per-campaign rolls.
 */
export function useDashboardData(userId: string | undefined): DashboardData {
  const created = useGamesByCreator(userId);
  const joined = useGamesByPlayer(userId);
  const charactersQuery = useCharactersByPlayer(userId);

  // Union created (GM) + joined (member), deduped by id; role from createdBy.
  const campaigns = useMemo<DashboardCampaign[]>(
    () => rolesFor(userId ?? '', created.data, joined.data),
    [created.data, joined.data, userId]
  );

  // Recent activity: a bounded fan-out of per-campaign rolls.
  const activityGames = campaigns.slice(0, MAX_ACTIVITY_GAMES);
  const activityQueries = useQueries({
    queries: activityGames.map(c => ({
      ...rollsByGameOptions(c.game.id, PER_GAME_ACTIVITY),
      enabled: !!userId,
    })),
  });

  const activity = useMemo<DashboardActivity[]>(() => {
    const merged: DashboardActivity[] = [];
    activityQueries.forEach((q, i) => {
      const gameName = activityGames[i]?.game.name ?? '';
      for (const roll of q.data ?? []) merged.push({ roll, gameName });
    });
    return collapseCrewRuns(
      merged.sort(
        (a, b) => new Date(b.roll.createdAt).getTime() - new Date(a.roll.createdAt).getTime()
      )
    ).slice(0, MAX_ACTIVITY);
    // activityQueries identity changes each render; key on the resolved data via a join of states.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activityQueries.map(q => q.dataUpdatedAt).join(','), campaigns]);

  // Rosters for the campaigns whose recent activity names a character the viewer doesn't own —
  // only those games, so a player-only dashboard costs no extra queries.
  const ownCharacters = charactersQuery.data;
  const rosterGameIds = useMemo(() => {
    const own = new Set((ownCharacters ?? []).map(c => c.id));
    const ids = new Set<string>();
    for (const a of activity) {
      if (a.roll.characterId && !own.has(a.roll.characterId)) ids.add(a.roll.gameId);
    }
    return [...ids].sort();
  }, [activity, ownCharacters]);
  const rosterQueries = useQueries({
    queries: rosterGameIds.map(id => ({ ...characterQueries.byGame(id), enabled: !!userId })),
  });
  const characterNames = useMemo<Record<string, string>>(() => {
    const names: Record<string, string> = {};
    for (const q of rosterQueries) for (const c of q.data ?? []) names[c.id] = c.name;
    for (const c of ownCharacters ?? []) names[c.id] = c.name;
    return names;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rosterQueries.map(q => q.dataUpdatedAt).join(','), ownCharacters]);

  const loadFailed = i18n.t('pages:dashboard.loadFailed');
  const campaignsLoading = created.isLoading || joined.isLoading;
  const campaignsError = created.error ?? joined.error;
  const campaignsStatus: SectionStatus = {
    loading: campaignsLoading,
    error: campaignsError ? campaignsError.message || loadFailed : null,
    retry: () => {
      if (created.isError) void created.refetch();
      if (joined.isError) void joined.refetch();
    },
  };

  const charactersStatus: SectionStatus = {
    loading: charactersQuery.isLoading,
    error: charactersQuery.error ? charactersQuery.error.message || loadFailed : null,
    retry: () => void charactersQuery.refetch(),
  };

  // The activity fan-out only STARTS once campaigns resolve, so its loading flag must cover both
  // the campaigns load and every per-campaign query still in flight — otherwise "No activity"
  // flashes between the two (F79 residue, review item 7).
  const activityError = campaignsError ?? activityQueries.find(q => q.isError)?.error ?? null;
  const activityStatus: SectionStatus = {
    // …and the rosters that name other players' characters, so a row never gains its "who" late.
    loading:
      campaignsLoading ||
      activityQueries.some(q => q.isLoading) ||
      rosterQueries.some(q => q.isLoading),
    error: activityError ? activityError.message || loadFailed : null,
    retry: () => {
      campaignsStatus.retry();
      activityQueries.filter(q => q.isError).forEach(q => void q.refetch());
    },
  };

  return {
    campaigns,
    characters: charactersQuery.data ?? [],
    characterNames,
    activity,
    campaignsStatus,
    charactersStatus,
    activityStatus,
  };
}
