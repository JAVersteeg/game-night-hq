import type { ImageSourcePropType } from 'react-native';

/**
 * Bundled cover art for predetermined games. Keyed by the same string a template's `cover_key`
 * column stores, so a template created from a preset can look its cover back up after the fact
 * without the image itself ever touching the database.
 */
export const GAME_COVERS: Record<string, ImageSourcePropType> = {
  catan: require('../../../assets/catan_cover.png'),
  heat: require('../../../assets/heat_cover.jpg'),
  arschmallows: require('../../../assets/arschmallows_cover.jpg'),
};

export function coverImageForKey(coverKey: string | null | undefined): ImageSourcePropType | undefined {
  return coverKey ? GAME_COVERS[coverKey] : undefined;
}
