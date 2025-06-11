// HeistMind Design System - Atmospheric TTRPG Theme
export const designTokens = {
    colors: {
        // Doskvol-inspired dark palette
        background: {
            primary: 'hsl(220 15% 8%)',        // Deep shadow
            secondary: 'hsl(217 20% 12%)',     // Subtle layers
            accent: 'hsl(215 25% 16%)',        // Card backgrounds
            elevated: 'hsl(218 22% 20%)',      // Modal/elevated surfaces
        },
        foreground: {
            primary: 'hsl(210 40% 92%)',       // High contrast text
            secondary: 'hsl(215 25% 70%)',     // Secondary text
            muted: 'hsl(215 20% 50%)',         // Subtle text
            inverse: 'hsl(220 15% 8%)',        // Dark text on light backgrounds
        },
        // TTRPG atmospheric colors
        atmosphere: {
            ember: 'hsl(25 85% 60%)',          // Warm accent glow
            steel: 'hsl(210 20% 45%)',         // Industrial cool
            shadow: 'hsl(240 15% 25%)',        // Deep accent
            whisper: 'hsl(280 30% 40%)',       // Mystic purple
            gold: 'hsl(47 95% 53%)',           // Precious metal
        },
        // Role-specific theming
        roles: {
            mastermind: 'hsl(0 70% 55%)',      // Crimson leadership
            scoundrel: 'hsl(210 75% 55%)',     // Steel blue action
            success: 'hsl(142 70% 45%)',       // Emerald success
            warning: 'hsl(47 95% 53%)',        // Gold warning
            danger: 'hsl(0 85% 60%)',          // Stress red
        },
        // Interactive states
        interactive: {
            hover: 'hsl(25 85% 60%)',          // Ember glow on hover
            active: 'hsl(25 95% 65%)',         // Brighter ember
            focus: 'hsl(210 75% 55%)',         // Steel blue focus
            disabled: 'hsl(215 20% 30%)',      // Muted disabled
        },
        // Border and divider colors
        border: {
            default: 'hsl(215 25% 20%)',       // Subtle borders
            accent: 'hsl(25 85% 60%)',         // Highlighted borders
            muted: 'hsl(215 20% 15%)',         // Very subtle dividers
        }
    },

    // Typography system
    typography: {
        fonts: {
            display: '"Cinzel", serif',        // Dramatic headlines
            body: '"Inter", sans-serif',       // Clean body text
            mono: '"JetBrains Mono", monospace' // Code and data
        },
        sizes: {
            xs: '0.75rem',     // 12px
            sm: '0.875rem',    // 14px
            base: '1rem',      // 16px
            lg: '1.125rem',    // 18px
            xl: '1.25rem',     // 20px
            '2xl': '1.5rem',   // 24px
            '3xl': '1.875rem', // 30px
            '4xl': '2.25rem',  // 36px
            '5xl': '3rem',     // 48px
            '6xl': '3.75rem',  // 60px
        },
        weights: {
            normal: '400',
            medium: '500',
            semibold: '600',
            bold: '700',
        },
        lineHeights: {
            tight: '1.25',
            snug: '1.375',
            normal: '1.5',
            relaxed: '1.625',
            loose: '2',
        }
    },

    // Spacing scale
    spacing: {
        px: '1px',
        0: '0',
        1: '0.25rem',   // 4px
        2: '0.5rem',    // 8px
        3: '0.75rem',   // 12px
        4: '1rem',      // 16px
        5: '1.25rem',   // 20px
        6: '1.5rem',    // 24px
        8: '2rem',      // 32px
        10: '2.5rem',   // 40px
        12: '3rem',     // 48px
        16: '4rem',     // 64px
        20: '5rem',     // 80px
        24: '6rem',     // 96px
        32: '8rem',     // 128px
        40: '10rem',    // 160px
        48: '12rem',    // 192px
        56: '14rem',    // 224px
        64: '16rem',    // 256px
    },

    // Border radius scale
    borderRadius: {
        none: '0',
        sm: '0.125rem',    // 2px
        default: '0.25rem', // 4px
        md: '0.375rem',    // 6px
        lg: '0.5rem',      // 8px
        xl: '0.75rem',     // 12px
        '2xl': '1rem',     // 16px
        '3xl': '1.5rem',   // 24px
        full: '9999px',
    },

    // Shadow system for atmospheric depth
    shadows: {
        sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        default: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        inner: 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)',
        // Atmospheric glows
        glow: '0 0 20px hsla(25, 85%, 60%, 0.3)',
        emberGlow: '0 0 30px hsla(25, 85%, 60%, 0.2)',
        shadowDepth: '0 10px 40px hsla(220, 15%, 5%, 0.6)',
        roleGlow: {
            mastermind: '0 0 25px hsla(0, 70%, 55%, 0.3)',
            scoundrel: '0 0 25px hsla(210, 75%, 55%, 0.3)',
        }
    },

    // Animation timings
    animation: {
        durations: {
            fastest: '100ms',
            fast: '200ms',
            normal: '300ms',
            slow: '500ms',
            slowest: '800ms',
        },
        easings: {
            easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
            easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
            easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
            atmospheric: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        }
    },

    // Breakpoints for responsive design
    breakpoints: {
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
        '2xl': '1536px',
    }
} as const

// Type helpers for TypeScript
export type DesignTokens = typeof designTokens
export type ColorToken = keyof typeof designTokens.colors
export type SpacingToken = keyof typeof designTokens.spacing
