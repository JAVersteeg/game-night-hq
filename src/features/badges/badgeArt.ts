import type { ImageSourcePropType } from 'react-native';

/**
 * Bundled artwork for the pass-on badges that have a drawing of their own. Keyed by the badge's
 * art key rather than by badge id, the same way `GAME_COVERS` is keyed independently of a
 * template's id — a badge only has art if someone drew one for it, and most don't.
 */
export const BADGE_ART: Record<string, ImageSourcePropType> = {
  grote_daggoe: require('../../../assets/badges/badge_sty_grote_daggoe.png'),
  koning_van_catan: require('../../../assets/badges/badge_sty_koning_van_catan.png'),
  domination_heat: require('../../../assets/badges/badge_col_domination_heat.png'),
  domination_arschmallows: require('../../../assets/badges/badge_col_domination_arschmallows.png'),
  domination_dalmuti: require('../../../assets/badges/badge_col_domination_dalmuti.png'),
};

export function badgeArtFor(artKey: string | null): ImageSourcePropType | null {
  return artKey ? (BADGE_ART[artKey] ?? null) : null;
}

/** Art key into `BADGE_ART`, keyed by game library key — same pattern as `DOMINATION_BADGE_NAMES`.
 *  Most domination badges have no drawing, so this only lists the ones that do. */
export const DOMINATION_BADGE_ART: Record<string, string> = {
  catan: 'koning_van_catan',
  heat: 'domination_heat',
  arschmallows: 'domination_arschmallows',
  dalmuti: 'domination_dalmuti',
};
