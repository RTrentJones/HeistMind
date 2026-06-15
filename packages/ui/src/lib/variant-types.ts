/**
 * Type-safe variant constraints for component combinations
 * Prevents invalid variant combinations at compile time
 */

import { type VariantProps } from 'class-variance-authority';
import { buttonVariants } from '../components/Button';
import { cardVariants } from '../components/Card';
import { badgeVariants } from '../components/Badge';
import { inputVariants } from '../components/Input';

// Extract variant types from CVA definitions
export type ButtonVariant = NonNullable<VariantProps<typeof buttonVariants>['variant']>;
export type ButtonSize = NonNullable<VariantProps<typeof buttonVariants>['size']>;

export type CardVariant = NonNullable<VariantProps<typeof cardVariants>['variant']>;
export type CardSize = NonNullable<VariantProps<typeof cardVariants>['size']>;

export type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>['variant']>;
export type BadgeSize = NonNullable<VariantProps<typeof badgeVariants>['size']>;

export type InputVariant = NonNullable<VariantProps<typeof inputVariants>['variant']>;
export type InputSize = NonNullable<VariantProps<typeof inputVariants>['size']>;
export type InputState = NonNullable<VariantProps<typeof inputVariants>['state']>;

// Game-specific variant groupings
export type GameVariant = 'ember' | 'steel' | 'shadow' | 'crimson' | 'gold';
export type StateVariant = 'success' | 'warning' | 'error' | 'info';
export type SemanticVariant = 'default' | 'secondary' | 'destructive' | 'outline' | 'ghost';

// Constraint types for specific combinations
export type ValidButtonCombination =
  | { variant: 'default'; size: ButtonSize }
  | { variant: 'destructive'; size: ButtonSize }
  | { variant: 'outline'; size: ButtonSize }
  | { variant: 'secondary'; size: ButtonSize }
  | { variant: 'ghost'; size: ButtonSize }
  | { variant: 'link'; size: ButtonSize }
  | { variant: GameVariant; size: ButtonSize }
  | { variant: 'glass'; size: ButtonSize }
  | { variant: 'neon'; size: ButtonSize };

export type ValidCardCombination =
  | { variant: 'default'; size: CardSize; interactive?: boolean }
  | { variant: 'glass'; size: CardSize; interactive?: boolean }
  | { variant: 'elevated'; size: CardSize; interactive?: boolean }
  | { variant: 'outline'; size: CardSize; interactive?: boolean }
  | { variant: 'gradient'; size: CardSize; interactive?: boolean }
  | { variant: 'neumorphic'; size: CardSize; interactive?: boolean }
  | { variant: 'character'; size: CardSize; interactive?: boolean }
  | { variant: 'danger'; size: CardSize; interactive?: boolean }
  | { variant: 'success'; size: CardSize; interactive?: boolean };

// Utility types for ensuring valid ARIA combinations
export type ValidAriaAttributes = {
  'aria-label'?: string;
  'aria-labelledby'?: string;
  'aria-describedby'?: string;
} & (
  | { 'aria-label': string; 'aria-labelledby'?: never }
  | { 'aria-label'?: never; 'aria-labelledby': string }
  | { 'aria-label'?: never; 'aria-labelledby'?: never }
);

// State-specific constraint types
export type ValidInputState =
  | { state: 'default'; error?: never; success?: never; warning?: never }
  | { state: 'error'; error: string; success?: never; warning?: never }
  | { state: 'success'; error?: never; success: string; warning?: never }
  | { state: 'warning'; error?: never; success?: never; warning: string }
  | { state?: never; error?: string; success?: string; warning?: string };

// Brand safety types
export type BrandColor = 'brand-primary' | 'brand-secondary' | 'brand-accent';
export type GameColor = 'game-ember' | 'game-steel' | 'game-shadow' | 'game-crimson' | 'game-gold';
export type SemanticColor =
  | 'semantic-success'
  | 'semantic-warning'
  | 'semantic-error'
  | 'semantic-info';

// Theme-safe combinations
export type ValidThemeVariant<T extends string> = T extends GameVariant
  ? T
  : T extends StateVariant
    ? T
    : T extends SemanticVariant
      ? T
      : T;

// Size constraint helpers
export type ValidSizeCombination<TVariant, TSize> = TVariant extends 'icon' | 'icon-sm' | 'icon-lg'
  ? TSize extends 'icon' | 'icon-sm' | 'icon-lg'
    ? { variant: TVariant; size: TSize }
    : never
  : TVariant extends GameVariant
    ? TSize extends 'sm' | 'default' | 'lg' | 'xl'
      ? { variant: TVariant; size: TSize }
      : never
    : { variant: TVariant; size: TSize };

// Motion-safe type helpers
export type MotionSafeProps = {
  /** Whether reduced motion is preferred */
  reduceMotion?: boolean;
  /** Custom animation duration override */
  animationDuration?: number;
};

// Accessibility constraint types
export type ValidInteractiveProps = {
  /** Element is interactive */
  interactive: true;
  /** Must have accessible activation method */
  onClick?: () => void;
  onKeyDown?: (event: React.KeyboardEvent) => void;
  /** Must have accessible label */
} & ValidAriaAttributes;

export type ValidNonInteractiveProps = {
  /** Element is not interactive */
  interactive?: false;
  onClick?: never;
  onKeyDown?: never;
};

export type InteractiveConstraint = ValidInteractiveProps | ValidNonInteractiveProps;

// Validation utility functions
export function isValidVariantCombination<T extends Record<string, any>>(
  props: T,
  allowedCombinations: T[]
): props is T {
  return allowedCombinations.some(combo =>
    Object.entries(combo).every(([key, value]) => props[key] === value)
  );
}

export function validateAriaAttributes(props: ValidAriaAttributes): string[] {
  const warnings: string[] = [];

  if (props['aria-label'] && props['aria-labelledby']) {
    warnings.push(
      'Both aria-label and aria-labelledby provided. aria-labelledby takes precedence.'
    );
  }

  return warnings;
}

// Design token constraint types
export type ValidDesignToken = BrandColor | GameColor | SemanticColor;

export function isValidDesignToken(token: string): token is ValidDesignToken {
  const validTokens: ValidDesignToken[] = [
    'brand-primary',
    'brand-secondary',
    'brand-accent',
    'game-ember',
    'game-steel',
    'game-shadow',
    'game-crimson',
    'game-gold',
    'semantic-success',
    'semantic-warning',
    'semantic-error',
    'semantic-info',
  ];

  return validTokens.includes(token as ValidDesignToken);
}
