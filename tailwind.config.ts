import type { Config } from 'tailwindcss';
import colors from 'tailwindcss/colors';

// Theme switch: change `accent.DEFAULT` (and `accent.fg` when needed) to retint the app.
//   violet  → accent.DEFAULT = colors.violet[500],  accent.fg = colors.white
//   orange  → accent.DEFAULT = colors.orange[500],  accent.fg = colors.white
//   lime    → accent.DEFAULT = colors.lime[500],    accent.fg = colors.zinc[950]
//   emerald → accent.DEFAULT = colors.emerald[500], accent.fg = colors.white

const config: Config = {
  content: ['./App.{js,ts,jsx,tsx}', './src/**/*.{js,ts,jsx,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter'],
      },
      colors: {
        accent: {
          DEFAULT: colors.violet[500],
          fg: colors.white,
          soft: colors.violet[100],
          softFg: colors.violet[800],
          strong: colors.violet[600],
        },
        surface: {
          DEFAULT: colors.white,
          muted: colors.zinc[50],
          sunken: colors.zinc[100],
        },
        line: {
          DEFAULT: colors.zinc[200],
          strong: colors.zinc[300],
        },
        ink: {
          DEFAULT: colors.zinc[950],
          muted: colors.zinc[600],
          subtle: colors.zinc[400],
          faint: colors.zinc[300],
        },
        success: {
          DEFAULT: colors.emerald[500],
          soft: colors.emerald[100],
          softFg: colors.emerald[800],
          line: colors.emerald[200],
        },
        warning: {
          DEFAULT: colors.amber[500],
          soft: colors.amber[100],
          softFg: colors.amber[800],
        },
        danger: {
          DEFAULT: colors.rose[500],
          soft: colors.rose[50],
          softFg: colors.rose[700],
          line: colors.rose[400],
        },
      },
      borderRadius: {
        '4xl': '2rem',
      },
    },
  },
  plugins: [],
};

export default config;
