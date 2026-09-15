/**
 * Raw hex values for the handful of places that can't take a NativeWind className — native
 * `color`/`tintColor` props, the React Navigation theme, `placeholderTextColor`, SVG
 * `fill`/`stroke`. Everything else should use the Tailwind tokens in `tailwind.config.ts`; these
 * two files must stay in sync since they're lifted from the same design-system source
 * (design_system/project/tokens/colors.css).
 */
export const theme = {
  surface: '#1c1813',
  surfaceSunken: '#2a241d',
  surfaceDeep: '#16120e',
  line: '#3a322a',
  ink: '#f2ebe2',
  inkSubtle: '#8a7e71',
  inkFaint: '#5f5549',
  accentFg: '#16120e',
} as const;

/**
 * The fixed per-player chart series, in assignment order — mirrors `colors.series` in
 * `tailwind.config.ts`. Charts are drawn with react-native-svg, which takes colours as props
 * rather than classNames, so they have to exist as hex here too.
 */
export const seriesColors = [
  '#d4753f',
  '#5fa878',
  '#e0a736',
  '#93a7b5',
  '#aabd74',
  '#7fa8b8',
] as const;
