import type { Enums } from '@/types/database';

export type PlayerColor = Enums<'player_color'>;

/**
 * The 12 colours a group member can be. Values are raw hex, not Tailwind tokens: every place this
 * is used picks a colour dynamically off a database row, so there is no static className to
 * generate — the same reasoning as the hex map in `theme.ts`.
 *
 * `swatch` is the bold, identifying tone — used for the Avatar background, the picker grid, and
 * (per-player) the leaderboard bars and trend chart lines on the group dashboard, so a colour reads
 * as itself rather than as a uniformly dark badge. `fg` is the initials/check colour on top of it.
 * Lightness is matched to the app's existing accent/success/warning tokens (all sit around the same
 * mid-high luminance), which is why dark ink wins contrast on all of them except black — mirroring
 * the accent button's own "dark ink on bright clay, white would fail contrast" choice in colors.css.
 *
 * No literal white: a near-white swatch reads as a bright line/bar cutting across the app's warm
 * dark surfaces rather than as one player's colour among twelve, so 'white' was renamed to 'lime'
 * (`ALTER TYPE ... RENAME VALUE`) rather than replaced — no separate migration to drop the old
 * value.
 */
export const PLAYER_COLORS: { key: PlayerColor; label: string; swatch: string; fg: string }[] = [
  { key: 'red', label: 'Rood', swatch: '#d9564b', fg: '#16120e' },
  { key: 'orange', label: 'Oranje', swatch: '#d4753f', fg: '#16120e' },
  { key: 'yellow', label: 'Geel', swatch: '#e0a736', fg: '#16120e' },
  { key: 'green', label: 'Groen', swatch: '#5fa878', fg: '#16120e' },
  { key: 'teal', label: 'Turquoise', swatch: '#4fa39a', fg: '#16120e' },
  { key: 'blue', label: 'Blauw', swatch: '#6a8fc7', fg: '#16120e' },
  { key: 'purple', label: 'Paars', swatch: '#9478b8', fg: '#16120e' },
  { key: 'pink', label: 'Roze', swatch: '#cf8aa8', fg: '#16120e' },
  { key: 'brown', label: 'Bruin', swatch: '#a3724f', fg: '#16120e' },
  { key: 'grey', label: 'Grijs', swatch: '#9a9284', fg: '#16120e' },
  { key: 'black', label: 'Zwart', swatch: '#3a322a', fg: '#f2ebe2' },
  { key: 'lime', label: 'Limoen', swatch: '#9ab23e', fg: '#16120e' },
];

const BY_KEY = new Map(PLAYER_COLORS.map((color) => [color.key, color]));

export function getPlayerColor(key: PlayerColor) {
  const color = BY_KEY.get(key);
  if (!color) throw new Error(`Unknown player color: ${key}`);
  return color;
}
