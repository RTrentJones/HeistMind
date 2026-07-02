import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { STRESS_THRESHOLDS, ID_PATTERNS } from './constants';

/**
 * Utility function for merging Tailwind CSS classes with clsx
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Generate a random ID for component instances with input validation
 */
export function generateId(prefix: string = ID_PATTERNS.DEFAULT_PREFIX): string {
  // Validate prefix to prevent XSS and invalid DOM IDs
  if (typeof prefix !== 'string') {
    throw new Error('Prefix must be a string');
  }

  if (prefix.length > ID_PATTERNS.MAX_PREFIX_LENGTH) {
    throw new Error(`Prefix cannot exceed ${ID_PATTERNS.MAX_PREFIX_LENGTH} characters`);
  }

  if (!ID_PATTERNS.PREFIX_REGEX.test(prefix)) {
    throw new Error(
      'Prefix must start with a letter and contain only letters, numbers, hyphens, and underscores'
    );
  }

  return `${prefix}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Debounce utility for performance optimization
 */
export function debounce<T extends (...args: never[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Format dice values for display
 */
export function formatDice(value: number): string {
  return value.toString().padStart(2, '0');
}

/**
 * Calculate stress levels for character sheets
 */
export function calculateStressLevel(
  current: number,
  max: number
): 'low' | 'medium' | 'high' | 'critical' {
  // Degrade gracefully rather than throw — this runs in render paths (e.g. the attribute dot
  // allocator), where a 0/empty track is legitimate and an exception would crash the page.
  if (max <= 0) return 'low';
  const safeCurrent = Math.max(0, current);

  const percentage = (safeCurrent / max) * 100;
  if (percentage < STRESS_THRESHOLDS.LOW) return 'low';
  if (percentage < STRESS_THRESHOLDS.MEDIUM) return 'medium';
  if (percentage < STRESS_THRESHOLDS.HIGH) return 'high';
  return 'critical';
}

/**
 * Animation variants for common motion patterns
 */
export const animations = {
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.2 },
  },
  slideIn: {
    initial: { opacity: 0, y: 10 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -10 },
    transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] },
  },
  scaleIn: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
    transition: { duration: 0.2, ease: 'easeOut' },
  },
  glow: {
    animate: {
      boxShadow: [
        '0 0 10px hsl(from var(--color-brand-primary) h s l / 0.3)',
        '0 0 20px hsl(from var(--color-brand-primary) h s l / 0.5)',
        '0 0 10px hsl(from var(--color-brand-primary) h s l / 0.3)',
      ],
    },
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};
