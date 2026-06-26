'use client';

import {
  BRACKWATER_BUILTIN,
  LoadBuiltinRulesetButton,
} from '@/features/rulesets/components/LoadBuiltinRulesetButton';

/**
 * Back-compat thin wrapper: loads the bundled Brackwater starter. New code should prefer
 * `LoadBuiltinRulesetButton` with an explicit `builtin` from the `BUILTIN_RULESETS` catalog.
 */
export function LoadDefaultRulesetButton({
  variant = 'ember',
  onLoaded,
}: {
  variant?: 'ember' | 'outline';
  onLoaded?: () => void;
}) {
  return (
    <LoadBuiltinRulesetButton builtin={BRACKWATER_BUILTIN} variant={variant} onLoaded={onLoaded} />
  );
}
