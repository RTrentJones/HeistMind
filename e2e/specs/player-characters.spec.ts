// Player journeys — SCAFFOLD (test.fixme). See gm-games.spec.ts for why these are pending.
// The playerPage fixture provides an authenticated, NON-GM context, ready to drive the UI
// once character/invite features exist.

import { test, expect } from '../support/fixtures';

test.describe('Player: join & characters', () => {
  test.fixme('player accepts an invite and joins a game', async ({ playerPage }) => {
    // await playerPage.goto(`/invite/${token}`); → expect membership.
    expect(playerPage).toBeTruthy();
  });

  test.fixme(
    'player creates a rule-based character from the game ruleset',
    async ({ playerPage }) => {
      expect(playerPage).toBeTruthy();
    }
  );

  test.fixme(
    'player advances a character (progression actions persist)',
    async ({ playerPage }) => {
      expect(playerPage).toBeTruthy();
    }
  );
});
