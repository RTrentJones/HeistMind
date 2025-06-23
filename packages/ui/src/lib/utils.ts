import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility function for merging Tailwind CSS classes with clsx
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Generate a random ID for component instances
 */
export function generateId(prefix: string = 'hm'): string {
  return `${prefix}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Debounce utility for performance optimization
 */
export function debounce<T extends (...args: any[]) => any>(
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
  const percentage = (current / max) * 100;
  if (percentage < 25) return 'low';
  if (percentage < 50) return 'medium';
  if (percentage < 75) return 'high';
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
