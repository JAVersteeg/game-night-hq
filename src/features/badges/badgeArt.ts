import type { ImageSourcePropType } from 'react-native';

/**
 * Bundled artwork for the pass-on badges that have a drawing of their own. Keyed by the badge's
 * art key rather than by badge id, the same way `GAME_COVERS` is keyed independently of a
 * template's id — a badge only has art if someone drew one for it, and most don't.
 */
export const BADGE_ART: Record<string, ImageSourcePropType> = {
  grote_daggoe: require('../../../assets/badges/badge_col_grote_daggoe.png'),
  koning_van_catan: require('../../../assets/badges/badge_col_koning_van_catan.png'),
};

export function badgeArtFor(artKey: string | null): ImageSourcePropType | null {
  return artKey ? (BADGE_ART[artKey] ?? null) : null;
}
