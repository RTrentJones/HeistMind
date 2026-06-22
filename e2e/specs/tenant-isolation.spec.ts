// Multi-tenant RLS isolation — SCAFFOLD (test.fixme).
//
// The headline guarantee in CLAUDE.md: "Multi-tenant data isolation is enforced via Supabase
// Row Level Security." This is where it gets proven end-to-end, using the two independent
// authenticated contexts (gmPage = owner, playerPage = a different user) that admin session
// injection gives us for free.
//
// Pending the game/character features (see gm-games.spec.ts). The dual-context shape below is
// ready: the moment a GM can create a game with private data, assert the Player context cannot
// read or mutate it — both through the UI and via a direct authenticated Supabase call.

import { test, expect } from '../support/fixtures';

test.describe('RLS: tenant isolation', () => {
  test.fixme("a player cannot see another GM's game data", async ({ gmPage, playerPage }) => {
    // 1. gmPage creates a game with some private content.
    // 2. playerPage (not a member) must NOT see it on their dashboard / via a direct fetch.
    expect(gmPage).toBeTruthy();
    expect(playerPage).toBeTruthy();
  });

  test.fixme('a non-member is denied joining a game without an invite', async ({ playerPage }) => {
    expect(playerPage).toBeTruthy();
  });

  test.fixme('GM-only actions are not available to a player member', async ({ playerPage }) => {
    expect(playerPage).toBeTruthy();
  });
});
