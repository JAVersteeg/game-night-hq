import type { ImageSourcePropType } from 'react-native';

import { gameKeyForTemplate } from '@/features/games/presets';

/**
 * Bundled cover art for predetermined games. Keyed by the same string a template's `cover_key`
 * column stores, so a template created from a preset can look its cover back up after the fact
 * without the image itself ever touching the database.
 */
export const GAME_COVERS: Record<string, ImageSourcePropType> = {
  catan: require('../../../assets/game_covers/catan_cover.png'),
  heat: require('../../../assets/game_covers/heat_cover.jpg'),
  arschmallows: require('../../../assets/game_covers/arschmallows_cover.png'),
  dalmuti: require('../../../assets/game_covers/dalmuti_cover.jpg'),
  terraforming_mars: require('../../../assets/game_covers/terraformingmars_cover.jpg'),
};

export function coverImageForKey(coverKey: string | null | undefined): ImageSourcePropType | undefined {
  return coverKey ? GAME_COVERS[coverKey] : undefined;
}

/** Prefer this over `coverImageForKey` wherever a saved template's name is at hand: it also covers
 *  templates with no `cover_key`. See `gameKeyForTemplate`. */
export function coverImageForTemplate(
  coverKey: string | null | undefined,
  name: string | null | undefined,
): ImageSourcePropType | undefined {
  return coverImageForKey(gameKeyForTemplate(coverKey, name));
}
