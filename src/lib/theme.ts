/**
 * Raw hex values for the handful of places that can't take a NativeWind className — native
 * `color`/`tintColor` props, the React Navigation theme, `placeholderTextColor`. Everything else
 * should use the Tailwind tokens in `tailwind.config.ts`; these two files must stay in sync since
 * they're lifted from the same design-system source (design_system/project/tokens/colors.css).
 */
export const theme = {
  surface: '#1c1813',
  surfaceDeep: '#16120e',
  line: '#3a322a',
  ink: '#f2ebe2',
  inkSubtle: '#8a7e71',
  accentFg: '#16120e',
} as const;
