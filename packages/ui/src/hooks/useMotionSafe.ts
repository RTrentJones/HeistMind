/**
 * useMotionSafe hook
 * Respects user's motion preferences for accessible animations
 */

import { useState, useEffect } from 'react';

export interface MotionPreferences {
  /** Whether the user prefers reduced motion */
  prefersReducedMotion: boolean;
  /** Whether motion is considered safe to use */
  isMotionSafe: boolean;
}

/**
 * Hook that respects user's motion preferences
 */
export const useMotionSafe = (): MotionPreferences => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    // Check initial preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    // Listen for changes
    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, []);

  return {
    prefersReducedMotion,
    isMotionSafe: !prefersReducedMotion,
  };
};
