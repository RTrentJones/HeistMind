// packages/ui/tailwind.config.js
const { colors, typography, spacing, tokens } = require('./src/tokens')

module.exports = {
    content: [
        './src/**/*.{js,ts,jsx,tsx}',
        '../../apps/web/src/**/*.{js,ts,jsx,tsx}',
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors,
            fontFamily: typography.fonts,
            fontSize: typography.sizes,
            fontWeight: typography.weights,
            lineHeight: typography.lineHeights,
            spacing,
            borderRadius: tokens.borderRadius,
            boxShadow: tokens.shadows,
            transitionDuration: {
                fast: '150ms',
                base: '250ms',
                slow: '350ms',
            },
            zIndex: tokens.zIndex,
        },
    },
    plugins: [
        require('@tailwindcss/forms'),
        require('@tailwindcss/typography'),
    ],
}