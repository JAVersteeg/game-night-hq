import type { Config } from 'tailwindcss';

// Theme: clay on night. Fired-terracotta accent (Catan hex tile) over a warm brown-black neutral
// ramp — a deliberate departure from the scaffold's white-on-zinc, set by the design system.
// See design_system/project/tokens/colors.css for the full ramp this is lifted from.

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
          DEFAULT: '#d4753f',
          fg: '#16120e', // near-black text on clay — white fails contrast at button size
          soft: '#3b2117',
          softFg: '#e2a07c',
          strong: '#c25a2b',
          line: '#7c4426',
        },
        surface: {
          DEFAULT: '#1c1813',
          muted: '#221d17',
          sunken: '#2a241d',
          deep: '#16120e', // page behind the app, modal scrims
        },
        line: {
          DEFAULT: '#3a322a',
          strong: '#4d433a',
        },
        ink: {
          DEFAULT: '#f2ebe2',
          muted: '#b6aa9c',
          subtle: '#8a7e71',
          faint: '#5f5549',
        },
        success: {
          DEFAULT: '#5fa878',
          soft: '#1d2c22',
          softFg: '#a9d5b8',
          line: '#2e4636',
        },
        warning: {
          DEFAULT: '#e0a736',
          soft: '#322610',
          softFg: '#efd18f',
        },
        danger: {
          DEFAULT: '#e2685a',
          soft: '#351b18',
          softFg: '#f0aaa0',
          line: '#8c3a30',
        },
        // Fixed per-player chart series, in assignment order — a player keeps the same colour
        // across every chart. Not consumed by any screen yet (no stats UI is built), kept here so
        // future chart components inherit it from the same source of truth as everything else.
        series: {
          1: '#d4753f',
          2: '#5fa878',
          3: '#e0a736',
          4: '#93a7b5',
          5: '#aabd74',
          6: '#7fa8b8',
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
