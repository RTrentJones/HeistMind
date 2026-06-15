// Generic dice outcomes - no game-specific terminology
export const DICE_OUTCOMES = {
  CRIT: 'critical',
  SUCCESS: 'success',
  PARTIAL: 'partial',
  FAIL: 'fail',
} as const;

// Generic interfaces for configurable game mechanics
export interface GameMechanics {
  positions: string[];
  effects: string[];
  outcomes: typeof DICE_OUTCOMES;
  diceSystem: {
    critThreshold: number;
    successThreshold: number;
    partialThreshold: number;
  };
}

// Default generic example (no copyrighted content)
export const EXAMPLE_MECHANICS: GameMechanics = {
  positions: ['safe', 'normal', 'dangerous'],
  effects: ['weak', 'standard', 'strong'],
  outcomes: DICE_OUTCOMES,
  diceSystem: {
    critThreshold: 6,
    successThreshold: 4,
    partialThreshold: 1,
  },
};
