'use client';

import { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import type { Character, Roll } from '@heist-mind/core';
import i18n from '@/lib/i18n';
import { useCharactersByPlayer } from '@/features/characters/data/queries';
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
}

export interface DashboardData {
  loading: boolean;
  error: string | null;
  campaigns: DashboardCampaign[];
  characters: Character[];
  activity: DashboardActivity[];
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
    return merged
      .sort((a, b) => new Date(b.roll.createdAt).getTime() - new Date(a.roll.createdAt).getTime())
      .slice(0, MAX_ACTIVITY);
    // activityQueries identity changes each render; key on the resolved data via a join of states.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activityQueries.map(q => q.dataUpdatedAt).join(','), campaigns]);

  const error = created.isError
    ? (created.error?.message ?? i18n.t('pages:dashboard.loadFailed'))
    : null;

  return {
    loading: created.isLoading || joined.isLoading || charactersQuery.isLoading,
    error,
    campaigns,
    characters: charactersQuery.data ?? [],
    activity,
  };
}
