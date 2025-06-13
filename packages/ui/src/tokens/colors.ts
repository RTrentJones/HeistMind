// packages/ui/src/tokens/colors.ts
export const colors = {
    // Primary - Muted purple with better contrast
    primary: {
        50: '#faf5ff',
        100: '#f3e8ff',
        200: '#e9d5ff',
        300: '#d8b4fe',
        400: '#c084fc',
        500: '#a855f7', // Main brand color
        600: '#9333ea',
        700: '#7c3aed',
        800: '#6b21a8',
        900: '#581c87',
        950: '#3b0764',
    },

    // Neutral - True grays for better accessibility
    neutral: {
        50: '#fafafa',
        100: '#f5f5f5',
        200: '#e5e5e5',
        300: '#d4d4d4',
        400: '#a3a3a3',
        500: '#737373',
        600: '#525252',
        700: '#404040',
        800: '#262626',
        900: '#171717',
        950: '#0a0a0a',
    },

    // Semantic colors
    success: {
        light: '#86efac',
        DEFAULT: '#22c55e',
        dark: '#16a34a',
    },

    warning: {
        light: '#fde047',
        DEFAULT: '#eab308',
        dark: '#ca8a04',
    },

    error: {
        light: '#fca5a5',
        DEFAULT: '#ef4444',
        dark: '#dc2626',
    },

    info: {
        light: '#93c5fd',
        DEFAULT: '#3b82f6',
        dark: '#2563eb',
    },

    // UI specific
    background: {
        primary: '#0a0a0a',
        secondary: '#171717',
        tertiary: '#262626',
        elevated: '#1a1a1a',
    },

    border: {
        DEFAULT: '#404040',
        light: '#525252',
        dark: '#262626',
    },

    text: {
        primary: '#fafafa',
        secondary: '#a3a3a3',
        tertiary: '#737373',
        inverse: '#0a0a0a',
    },
}