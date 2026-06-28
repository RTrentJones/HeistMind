'use client';

import { useEffect, useState } from 'react';
import type { Character, Game, Roll } from '@heist-mind/database';
import { getRepositories } from '@/lib/auth';

export interface DashboardCampaign {
  game: Game;
  role: 'gm' | 'player';
}

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
 * Aggregates the logged-in home: the user's campaigns (GM + joined), their characters, and a merged
 * "recent activity" feed across those campaigns — all over the existing repositories (no new data
 * layer, no schema change). The character/campaign data also backs the "My Characters" surface we
 * otherwise lack (see COMPETITIVE.md P0 #2 / FINDINGS F56).
 */
export function useDashboardData(userId: string | undefined): DashboardData {
  const [data, setData] = useState<DashboardData>({
    loading: true,
    error: null,
    campaigns: [],
    characters: [],
    activity: [],
  });

  useEffect(() => {
    if (!userId) return;
    let active = true;
    setData(d => ({ ...d, loading: true, error: null }));

    (async () => {
      const repos = getRepositories();
      const [createdRes, joinedRes, charsRes] = await Promise.all([
        repos.games.findByCreator(userId),
        repos.games.findByPlayer(userId),
        repos.characters.findByPlayer(userId),
      ]);
      if (!active) return;

      if (!createdRes.success) {
        setData(d => ({
          ...d,
          loading: false,
          error: createdRes.error?.message ?? 'load-failed',
        }));
        return;
      }

      // Union created (GM) + joined (member), deduped by id; role from createdBy.
      const byId = new Map<string, DashboardCampaign>();
      for (const g of createdRes.data) byId.set(g.id, { game: g, role: 'gm' });
      if (joinedRes.success) {
        for (const g of joinedRes.data) {
          if (!byId.has(g.id)) {
            byId.set(g.id, { game: g, role: g.createdBy === userId ? 'gm' : 'player' });
          }
        }
      }
      const campaigns = [...byId.values()];
      const characters = charsRes.success ? charsRes.data : [];

      // Recent activity: a few rolls per campaign (capped), merged newest-first.
      const activityLists = await Promise.all(
        campaigns.slice(0, MAX_ACTIVITY_GAMES).map(c =>
          repos.rolls
            .findByGame(c.game.id, PER_GAME_ACTIVITY)
            .then(r => (r.success ? r.data.map(roll => ({ roll, gameName: c.game.name })) : []))
        )
      );
      if (!active) return;
      const activity = activityLists
        .flat()
        .sort(
          (a, b) => new Date(b.roll.createdAt).getTime() - new Date(a.roll.createdAt).getTime()
        )
        .slice(0, MAX_ACTIVITY);

      setData({ loading: false, error: null, campaigns, characters, activity });
    })().catch(err => {
      if (active) setData(d => ({ ...d, loading: false, error: String(err) }));
    });

    return () => {
      active = false;
    };
  }, [userId]);

  return data;
}
