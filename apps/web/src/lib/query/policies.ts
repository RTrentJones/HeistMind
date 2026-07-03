/**
 * Freshness policy for SHARED campaign state (roster, crew, clocks, factions, scores, the roll
 * feed): other players and the GM write it from their own clients, and there is no realtime
 * layer — in-app invalidation can never cover those writes. Per the BRD's load-on-view model,
 * treat it as never fresh: revalidate on every mount AND on window focus (returning to the tab
 * is the async-play "check the table" gesture). Cached data still renders instantly; the refetch
 * is a background revalidation, no empty flicker.
 *
 * User-owned data (own profile, own rulesets, own game list) stays on the client defaults
 * (30s staleTime, no focus refetch) — only this client writes it, so invalidation covers it.
 */
export const sharedCampaignState = {
  staleTime: 0,
  refetchOnMount: 'always',
  refetchOnWindowFocus: true,
} as const;
