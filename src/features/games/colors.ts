import { gameKeyForTemplate } from '@/features/games/presets';

export interface GamePalette {
  /** The bold, identifying tone — bars, the cover placeholder tint, an unselected chip's label. */
  swatch: string;
  /** Hairline/border step. */
  line: string;
  /** Muted fill behind `softFg`, never the same value as `line` — a filled pill reads as a tinted
   *  surface with a brighter edge, the way `accent-soft` + `accent-line` do. */
  soft: string;
  /** Label colour on top of `soft`. */
  softFg: string;
}

/**
 * Identifying colour per predetermined game, keyed by the same string as `GAME_COVERS` and a
 * template's `cover_key` column — so a game reads as itself wherever it appears without the colour
 * ever being stored per group. Values are raw hex for the same reason as `playerColors.ts`: the
 * colour is picked off a row at runtime, so there is no static className to generate.
 *
 * Each game is a four-step ramp mirroring the accent scale in `tokens/colors.css` (clay-400 /
 * clay-700 / clay-900 / clay-300), so a game's chip is the accent chip in a different hue rather
 * than a differently-shaped control: `soft` lands near the lightness of `--accent-soft`, `line`
 * near `--accent-line`. `swatch` is the game's colour exactly as chosen — it is the step people
 * recognise the game by, so it is never toned down; only the other three steps are derived from
 * it, holding its hue and saturation while moving lightness.
 *
 * A template with no entry here (a group's own game, or a library game that hasn't been given a
 * colour yet) falls back to the caller's neutral default.
 */
export const GAME_PALETTES: Record<string, GamePalette> = {
  // Catan's base is the least saturated of the four, so the shared derivation washed its
  // supporting steps out to a near-neutral brown. Its line/soft/softFg hold more chroma to stay
  // recognisably the same red as the swatch.
  catan: { swatch: '#b74242', line: '#8a2828', soft: '#431919', softFg: '#db9494' },
  heat: { swatch: '#f63d1f', line: '#8e2615', soft: '#361b16', softFg: '#e0a89f' },
  arschmallows: { swatch: '#b8ce3d', line: '#6d792b', soft: '#2d311c', softFg: '#ced4aa' },
  dalmuti: { swatch: '#90489a', line: '#643a69', soft: '#2b202c', softFg: '#c9b3cc' },
};

export function gamePaletteForKey(coverKey: string | null | undefined): GamePalette | undefined {
  return coverKey ? GAME_PALETTES[coverKey] : undefined;
}

/** Prefer this over `gamePaletteForKey` wherever a saved template's name is at hand: it also covers
 *  templates with no `cover_key`. See `gameKeyForTemplate`. */
export function gamePaletteForTemplate(
  coverKey: string | null | undefined,
  name: string | null | undefined,
): GamePalette | undefined {
  return gamePaletteForKey(gameKeyForTemplate(coverKey, name));
}

export function gameColorForKey(coverKey: string | null | undefined): string | undefined {
  return gamePaletteForKey(coverKey)?.swatch;
}

export function gameColorForTemplate(
  coverKey: string | null | undefined,
  name: string | null | undefined,
): string | undefined {
  return gamePaletteForTemplate(coverKey, name)?.swatch;
}
