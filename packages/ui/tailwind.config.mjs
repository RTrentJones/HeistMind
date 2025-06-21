// HeistMind UI Package - Enhanced Tailwind Configuration

export default {
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
    './.storybook/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Enhanced purple palette from inspiration
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
        // Base system colors with fallbacks for Tailwind v4
        border: '#27272a',
        input: '#27272a', 
        ring: '#8b3eff',
        background: '#09090b',
        foreground: '#fafafa',
        primary: {
          DEFAULT: '#8b3eff',
          foreground: '#fafafa',
        },
        secondary: {
          DEFAULT: '#27272a',
          foreground: '#fafafa',
        },
        destructive: {
          DEFAULT: '#dc2626',
          foreground: '#fafafa',
        },
        muted: {
          DEFAULT: '#27272a',
          foreground: '#a1a1aa',
        },
        accent: {
          DEFAULT: '#27272a',
          foreground: '#fafafa',
        },
        popover: {
          DEFAULT: '#09090b',
          foreground: '#fafafa',
        },
        card: {
          DEFAULT: '#09090b',
          foreground: '#fafafa',
        },
        // Game-specific atmospheric colors
        heist: {
          ember: '#ff8a4c',
          steel: '#64748b',
          shadow: '#0f172a',
          whisper: '#f8fafc',
          gold: '#eab308',
          crimson: '#dc2626',
          midnight: '#1e293b',
          smoke: '#334155',
        },
      },
      borderRadius: {
        lg: '0.5rem',
        md: '0.375rem', 
        sm: '0.25rem',
        xl: '1rem',
        '2xl': '1.25rem',
        '3xl': '1.5rem',
      },
      spacing: {
        '13': '3.25rem',
        '15': '3.75rem',
        '18': '4.5rem',
        '72': '18rem',
        '84': '21rem',
        '96': '24rem',
      },
      fontFamily: {
        display: ['Cinzel', 'Playfair Display', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.75rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
        '5xl': ['3rem', { lineHeight: '1' }],
        '6xl': ['3.75rem', { lineHeight: '1' }],
      },
      boxShadow: {
        // Enhanced shadow system
        'sm': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        'DEFAULT': '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
        'md': '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
        'lg': '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
        'xl': '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
        '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
        'inner': 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
        // Glow effects for game theme
        'glow-purple': '0 0 20px rgb(147 51 234 / 0.4)',
        'glow-purple-sm': '0 0 10px rgb(147 51 234 / 0.3)',
        'glow-purple-lg': '0 0 30px rgb(147 51 234 / 0.5)',
        'glow-ember': '0 0 25px rgb(255 138 76 / 0.4)',
        'glow-crimson': '0 0 20px rgb(220 38 127 / 0.4)',
        'glow-steel': '0 0 20px rgb(100 116 139 / 0.4)',
        // Glass morphism
        'glass': '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
        'glass-sm': '0 4px 16px 0 rgba(31, 38, 135, 0.25)',
        // Neumorphism
        'neu-inset': 'inset 8px 8px 16px #1a1a2e, inset -8px -8px 16px #16213e',
        'neu-raised': '8px 8px 16px #0f0f23, -8px -8px 16px #21213d',
      },
      backdropBlur: {
        xs: '2px',
      },
      keyframes: {
        // Enhanced animation keyframes
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'fade-out': {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        'slide-in-from-top': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        'slide-in-from-bottom': {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        'slide-in-from-left': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        'slide-in-from-right': {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        'pulse-glow': {
          '0%, 100%': {
            opacity: '1',
            transform: 'scale(1)',
            boxShadow: '0 0 20px rgba(147, 51, 234, 0.4)',
          },
          '50%': {
            opacity: '0.8',
            transform: 'scale(1.05)',
            boxShadow: '0 0 30px rgba(147, 51, 234, 0.6)',
          },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'bounce-subtle': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
        'wiggle': {
          '0%, 100%': { transform: 'rotate(0deg)' },
          '25%': { transform: 'rotate(3deg)' },
          '75%': { transform: 'rotate(-3deg)' },
        },
        'stress-pulse': {
          '0%, 100%': { 
            transform: 'scale(1)',
            boxShadow: '0 0 0 0 rgba(220, 38, 127, 0.7)'
          },
          '70%': { 
            transform: 'scale(1.1)',
            boxShadow: '0 0 0 10px rgba(220, 38, 127, 0)'
          },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.5s ease-out',
        'fade-out': 'fade-out 0.5s ease-out',
        'slide-in-from-top': 'slide-in-from-top 0.3s ease-out',
        'slide-in-from-bottom': 'slide-in-from-bottom 0.3s ease-out',
        'slide-in-from-left': 'slide-in-from-left 0.3s ease-out',
        'slide-in-from-right': 'slide-in-from-right 0.3s ease-out',
        'pulse-glow': 'pulse-glow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'bounce-subtle': 'bounce-subtle 1s ease-in-out infinite',
        'wiggle': 'wiggle 1s ease-in-out infinite',
        'stress-pulse': 'stress-pulse 2s infinite',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic': 'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'shimmer': 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
      },
    },
  },
  plugins: [],
};