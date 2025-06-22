/**
 * Design tokens for HeistMind UI
 * Replaces magic strings with consistent, theme-aware values
 */

// Core design tokens
export const tokens = {
  // Component variants
  variants: {
    // Base variants
    default: 'default',
    secondary: 'secondary',
    destructive: 'destructive',
    outline: 'outline',
    ghost: 'ghost',
    link: 'link',

    // Game-themed variants
    ember: 'ember',
    steel: 'steel',
    shadow: 'shadow',
    crimson: 'crimson',
    gold: 'gold',
    glass: 'glass',
    neon: 'neon',

    // State variants
    success: 'success',
    warning: 'warning',
    error: 'error',
    info: 'info',

    // Card specific
    elevated: 'elevated',
    gradient: 'gradient',
    neumorphic: 'neumorphic',
    character: 'character',
    danger: 'danger',

    // Theme variants
    dark: 'dark',
    light: 'light',
  } as const,

  // Component sizes
  sizes: {
    xs: 'xs',
    sm: 'sm',
    default: 'default',
    lg: 'lg',
    xl: 'xl',
    '2xl': '2xl',

    // Icon sizes
    icon: 'icon',
    'icon-sm': 'icon-sm',
    'icon-lg': 'icon-lg',
  } as const,

  // Form states
  states: {
    default: 'default',
    error: 'error',
    success: 'success',
    warning: 'warning',
    loading: 'loading',
    disabled: 'disabled',
  } as const,

  // Badge specific variants
  badgeVariants: {
    // Skill levels
    novice: 'novice',
    trained: 'trained',
    expert: 'expert',
    master: 'master',

    // Stress levels
    'stress-low': 'stress-low',
    'stress-medium': 'stress-medium',
    'stress-high': 'stress-high',
    'stress-critical': 'stress-critical',
  } as const,

  // Animation speeds
  animations: {
    fast: '150ms',
    normal: '200ms',
    slow: '300ms',
  } as const,

  // Spring animations (separate from string durations)
  springs: {
    fast: { type: 'spring', stiffness: 400, damping: 30 },
    normal: { type: 'spring', stiffness: 300, damping: 25 },
    slow: { type: 'spring', stiffness: 200, damping: 20 },
  } as const,

  // Spacing scale
  spacing: {
    xs: '0.25rem', // 4px
    sm: '0.5rem', // 8px
    md: '1rem', // 16px
    lg: '1.5rem', // 24px
    xl: '2rem', // 32px
    '2xl': '3rem', // 48px
    '3xl': '4rem', // 64px
  } as const,

  // Border radius
  radius: {
    none: '0',
    sm: '0.25rem', // 4px
    md: '0.5rem', // 8px
    lg: '0.75rem', // 12px
    xl: '1rem', // 16px
    '2xl': '1.5rem', // 24px
    full: '9999px',
  } as const,

  // Typography scale
  typography: {
    fontSizes: {
      xs: '0.75rem', // 12px
      sm: '0.875rem', // 14px
      base: '1rem', // 16px
      lg: '1.125rem', // 18px
      xl: '1.25rem', // 20px
      '2xl': '1.5rem', // 24px
      '3xl': '2rem', // 32px
      '4xl': '2.5rem', // 40px
    },

    fontWeights: {
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
      black: '900',
    },

    lineHeights: {
      tight: '1.25',
      normal: '1.5',
      relaxed: '1.75',
    },

    letterSpacings: {
      tight: '-0.025em',
      normal: '0',
      wide: '0.025em',
    },
  } as const,

  // Shadows
  shadows: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
    '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',

    // Game-specific shadows
    glow: '0 0 20px rgb(147 51 234 / 0.5)',
    'glow-sm': '0 0 10px rgb(147 51 234 / 0.3)',
    'glow-lg': '0 0 30px rgb(147 51 234 / 0.6)',

    // Glass shadows
    glass: '0 8px 32px rgba(0, 0, 0, 0.1)',
    'glass-lg': '0 12px 40px rgba(0, 0, 0, 0.15)',
  } as const,

  // Z-index scale
  zIndex: {
    auto: 'auto',
    base: '0',
    docked: '10',
    dropdown: '1000',
    sticky: '1020',
    banner: '1030',
    overlay: '1040',
    modal: '1050',
    popover: '1060',
    skipLink: '1070',
    toast: '1080',
    tooltip: '1090',
  } as const,

  // Transition easings
  easings: {
    linear: 'linear',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',

    // Custom game easings
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    smooth: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  } as const,

  // Breakpoints for responsive design
  breakpoints: {
    xs: '475px',
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  } as const,

  // ARIA and accessibility tokens
  aria: {
    roles: {
      button: 'button',
      link: 'link',
      heading: 'heading',
      banner: 'banner',
      navigation: 'navigation',
      main: 'main',
      complementary: 'complementary',
      contentinfo: 'contentinfo',
      search: 'search',
      form: 'form',
      dialog: 'dialog',
      alertdialog: 'alertdialog',
      alert: 'alert',
      status: 'status',
      log: 'log',
      marquee: 'marquee',
      timer: 'timer',
      tablist: 'tablist',
      tab: 'tab',
      tabpanel: 'tabpanel',
      listbox: 'listbox',
      option: 'option',
      menu: 'menu',
      menuitem: 'menuitem',
      menubar: 'menubar',
      tree: 'tree',
      treeitem: 'treeitem',
      grid: 'grid',
      gridcell: 'gridcell',
      row: 'row',
      rowgroup: 'rowgroup',
      columnheader: 'columnheader',
      rowheader: 'rowheader',
      list: 'list',
      listitem: 'listitem',
      group: 'group',
      region: 'region',
      article: 'article',
      section: 'section',
      img: 'img',
      figure: 'figure',
      progressbar: 'progressbar',
      slider: 'slider',
      spinbutton: 'spinbutton',
      checkbox: 'checkbox',
      radio: 'radio',
      combobox: 'combobox',
      textbox: 'textbox',
      searchbox: 'searchbox',
      tooltip: 'tooltip',
    },

    liveRegions: {
      off: 'off',
      polite: 'polite',
      assertive: 'assertive',
    },

    states: {
      expanded: 'aria-expanded',
      selected: 'aria-selected',
      checked: 'aria-checked',
      pressed: 'aria-pressed',
      current: 'aria-current',
      disabled: 'aria-disabled',
      hidden: 'aria-hidden',
      invalid: 'aria-invalid',
      required: 'aria-required',
      readonly: 'aria-readonly',
      busy: 'aria-busy',
    },
  } as const,

  // Game-specific tokens
  game: {
    skillLevels: {
      0: 'novice',
      1: 'trained',
      2: 'trained',
      3: 'expert',
      4: 'expert',
      5: 'master',
    },

    stressLevels: {
      low: 'stress-low',
      medium: 'stress-medium',
      high: 'stress-high',
      critical: 'stress-critical',
    },

    actionTypes: {
      controlled: 'controlled',
      risky: 'risky',
      desperate: 'desperate',
    },

    positions: {
      controlled: 'controlled',
      risky: 'risky',
      desperate: 'desperate',
    },

    effects: {
      limited: 'limited',
      standard: 'standard',
      great: 'great',
    },
  } as const,
} as const;

// Type exports for strict typing
export type Variant = keyof typeof tokens.variants;
export type Size = keyof typeof tokens.sizes;
export type State = keyof typeof tokens.states;
export type BadgeVariant = keyof typeof tokens.badgeVariants;
export type AnimationSpeed = keyof typeof tokens.animations;
export type Spacing = keyof typeof tokens.spacing;
export type Radius = keyof typeof tokens.radius;
export type FontSize = keyof typeof tokens.typography.fontSizes;
export type FontWeight = keyof typeof tokens.typography.fontWeights;
export type Shadow = keyof typeof tokens.shadows;
export type ZIndex = keyof typeof tokens.zIndex;
export type Easing = keyof typeof tokens.easings;
export type Breakpoint = keyof typeof tokens.breakpoints;
export type AriaRole = keyof typeof tokens.aria.roles;
export type AriaLive = keyof typeof tokens.aria.liveRegions;
export type AriaState = keyof typeof tokens.aria.states;

// Utility functions for working with tokens
export function getVariantToken(variant: string): string {
  return tokens.variants[variant as Variant] || tokens.variants.default;
}

export function getSizeToken(size: string): string {
  return tokens.sizes[size as Size] || tokens.sizes.default;
}

export function getStateToken(state: string): string {
  return tokens.states[state as State] || tokens.states.default;
}

export function getAnimationToken(speed: string): string {
  return tokens.animations[speed as AnimationSpeed] || tokens.animations.normal;
}

export function getSpacingToken(spacing: string): string {
  return tokens.spacing[spacing as Spacing] || tokens.spacing.md;
}

export function getRadiusToken(radius: string): string {
  return tokens.radius[radius as Radius] || tokens.radius.md;
}

export function getShadowToken(shadow: string): string {
  return tokens.shadows[shadow as Shadow] || tokens.shadows.md;
}

export function getSkillLevel(value: number): string {
  return tokens.game.skillLevels[value as keyof typeof tokens.game.skillLevels] || 'novice';
}

export function getStressLevel(percentage: number): string {
  if (percentage < 25) return tokens.game.stressLevels.low;
  if (percentage < 50) return tokens.game.stressLevels.medium;
  if (percentage < 75) return tokens.game.stressLevels.high;
  return tokens.game.stressLevels.critical;
}

// CSS custom property helpers
export function createCSSVariable(name: string, value: string): string {
  return `--${name}: ${value};`;
}

export function useCSSVariable(name: string): string {
  return `var(--${name})`;
}

// Token validation helpers
export function isValidVariant(variant: string): variant is Variant {
  return variant in tokens.variants;
}

export function isValidSize(size: string): size is Size {
  return size in tokens.sizes;
}

export function isValidState(state: string): state is State {
  return state in tokens.states;
}

// Default token sets for components
export const componentDefaults = {
  button: {
    variant: tokens.variants.default,
    size: tokens.sizes.default,
    radius: tokens.radius.lg,
  },
  card: {
    variant: tokens.variants.default,
    size: tokens.sizes.default,
    radius: tokens.radius.xl,
  },
  input: {
    variant: tokens.variants.default,
    size: tokens.sizes.default,
    radius: tokens.radius.lg,
  },
  badge: {
    variant: tokens.variants.default,
    size: tokens.sizes.default,
    radius: tokens.radius.full,
  },
  tooltip: {
    variant: tokens.variants.default,
    size: tokens.sizes.default,
    radius: tokens.radius.lg,
  },
} as const;
