/**
 * HeistMind Design System
 *
 * Comprehensive design tokens and patterns for consistent UI implementation.
 * This file serves as the single source of truth for design decisions.
 */

// Color Palette
export const colors = {
  // Base System Colors
  background: '#09090b',
  foreground: '#fafafa',

  // Zinc Scale (Primary Neutrals)
  zinc: {
    50: '#fafafa',
    100: '#f4f4f5',
    200: '#e4e4e7',
    300: '#d4d4d8',
    400: '#a1a1aa',
    500: '#71717a',
    600: '#52525b',
    700: '#3f3f46',
    800: '#27272a',
    900: '#18181b',
    950: '#09090b',
  },

  // Purple Scale (Primary Brand)
  purple: {
    50: '#faf7ff',
    100: '#f4edff',
    200: '#e9ddff',
    300: '#d6c1ff',
    400: '#bc97ff',
    500: '#9f65ff',
    600: '#8b3eff',
    700: '#7c25f7',
    800: '#6a1bd1',
    900: '#5818ab',
    950: '#390d74',
  },

  // Heist-Specific Colors
  heist: {
    ember: '#ff8a4c', // Warm, action-oriented
    steel: '#64748b', // Cool, tactical
    shadow: '#0f172a', // Deep, mysterious
    whisper: '#f8fafc', // Light, ethereal
    gold: '#eab308', // Valuable, important
    crimson: '#dc2626', // Dangerous, critical
    midnight: '#1e293b', // Dark, atmospheric
    smoke: '#334155', // Subtle, background
  },

  // Status Colors
  status: {
    success: '#22c55e',
    warning: '#eab308',
    error: '#ef4444',
    info: '#3b82f6',
  },
} as const;

// Typography Scale
export const typography = {
  fontFamilies: {
    display: ['Cinzel', 'Playfair Display', 'serif'],
    sans: ['Inter', 'system-ui', 'sans-serif'],
    mono: ['JetBrains Mono', 'monospace'],
  },

  fontSizes: {
    '2xs': ['0.625rem', { lineHeight: '0.75rem' }],
    xs: ['0.75rem', { lineHeight: '1rem' }],
    sm: ['0.875rem', { lineHeight: '1.25rem' }],
    base: ['1rem', { lineHeight: '1.5rem' }],
    lg: ['1.125rem', { lineHeight: '1.75rem' }],
    xl: ['1.25rem', { lineHeight: '1.75rem' }],
    '2xl': ['1.5rem', { lineHeight: '2rem' }],
    '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
    '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
    '5xl': ['3rem', { lineHeight: '1' }],
    '6xl': ['3.75rem', { lineHeight: '1' }],
  },

  fontWeights: {
    thin: '100',
    extralight: '200',
    light: '300',
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
    extrabold: '800',
    black: '900',
  },
} as const;

// Spacing Scale
export const spacing = {
  0: '0px',
  px: '1px',
  0.5: '0.125rem',
  1: '0.25rem',
  1.5: '0.375rem',
  2: '0.5rem',
  2.5: '0.625rem',
  3: '0.75rem',
  3.5: '0.875rem',
  4: '1rem',
  5: '1.25rem',
  6: '1.5rem',
  7: '1.75rem',
  8: '2rem',
  9: '2.25rem',
  10: '2.5rem',
  11: '2.75rem',
  12: '3rem',
  13: '3.25rem',
  14: '3.5rem',
  15: '3.75rem',
  16: '4rem',
  18: '4.5rem',
  20: '5rem',
  24: '6rem',
  28: '7rem',
  32: '8rem',
  36: '9rem',
  40: '10rem',
  44: '11rem',
  48: '12rem',
  52: '13rem',
  56: '14rem',
  60: '15rem',
  64: '16rem',
  72: '18rem',
  80: '20rem',
  96: '24rem',
} as const;

// Border Radius Scale
export const borderRadius = {
  none: '0px',
  sm: '0.125rem',
  default: '0.25rem',
  md: '0.375rem',
  lg: '0.5rem',
  xl: '0.75rem',
  '2xl': '1rem',
  '3xl': '1.5rem',
  full: '9999px',
} as const;

// Shadow Scale
export const shadows = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  default: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',

  // Glow Effects
  glow: {
    purple: '0 0 20px rgba(139, 62, 255, 0.4)',
    ember: '0 0 25px rgba(255, 138, 76, 0.4)',
    crimson: '0 0 20px rgba(220, 38, 38, 0.4)',
    steel: '0 0 20px rgba(100, 116, 139, 0.4)',
  },

  // Glass Morphism
  glass: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',

  // Neumorphism
  neu: {
    inset: 'inset 8px 8px 16px #16162a, inset -8px -8px 16px #2a2a3e',
    raised: '8px 8px 16px #16162a, -8px -8px 16px #2a2a3e',
  },
} as const;

// Animation Durations & Easings
export const animation = {
  durations: {
    fast: '150ms',
    normal: '200ms',
    slow: '300ms',
    slower: '500ms',
  },

  easings: {
    linear: 'linear',
    out: 'cubic-bezier(0, 0, 0.2, 1)',
    in: 'cubic-bezier(0.4, 0, 1, 1)',
    inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },
} as const;

// Component Variants
export const componentVariants = {
  // Button variants
  button: {
    sizes: ['sm', 'default', 'lg', 'xl', 'icon', 'icon-sm', 'icon-lg'],
    variants: [
      'default',
      'destructive',
      'outline',
      'secondary',
      'ghost',
      'link',
      'ember',
      'steel',
      'shadow',
      'crimson',
      'glass',
      'neon',
    ],
  },

  // Card variants
  card: {
    sizes: ['sm', 'default', 'lg', 'xl'],
    variants: [
      'default',
      'glass',
      'elevated',
      'outline',
      'gradient',
      'neumorphic',
      'character',
      'danger',
      'success',
    ],
  },

  // Input variants
  input: {
    sizes: ['sm', 'default', 'lg', 'xl'],
    variants: ['default', 'glass', 'neon', 'ember', 'steel', 'ghost'],
    states: ['default', 'error', 'success', 'warning'],
  },

  // Badge variants
  badge: {
    sizes: ['sm', 'default', 'lg', 'xl'],
    variants: [
      'default',
      'secondary',
      'destructive',
      'outline',
      'glass',
      'ember',
      'steel',
      'shadow',
      'crimson',
      'gold',
    ],
    levels: ['novice', 'trained', 'expert', 'master'],
    stress: ['stress-low', 'stress-medium', 'stress-high', 'stress-critical'],
  },
} as const;

// Accessibility Guidelines
export const accessibility = {
  // Minimum touch targets
  minTouchTarget: '44px',

  // Focus indicators
  focusRing: {
    width: '2px',
    offset: '2px',
    color: colors.purple[500],
  },

  // Color contrast ratios (WCAG AA compliance)
  contrast: {
    normal: 4.5,
    large: 3,
    enhanced: 7,
  },
} as const;

// Breakpoints (for responsive design)
export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

// Z-Index Scale
export const zIndex = {
  hide: -1,
  auto: 'auto',
  base: 0,
  docked: 10,
  dropdown: 1000,
  sticky: 1100,
  banner: 1200,
  overlay: 1300,
  modal: 1400,
  popover: 1500,
  skipLink: 1600,
  toast: 1700,
  tooltip: 1800,
} as const;

// Export everything as a comprehensive design system
export const designSystem = {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  animation,
  componentVariants,
  accessibility,
  breakpoints,
  zIndex,
} as const;

export type DesignSystem = typeof designSystem;
export type Colors = typeof colors;
export type Typography = typeof typography;
export type ComponentVariants = typeof componentVariants;
