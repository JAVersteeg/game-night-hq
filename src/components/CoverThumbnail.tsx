import { Image, View, type ImageSourcePropType } from 'react-native';

interface CoverThumbnailProps {
  /** Already resolved (e.g. via `coverImageForKey`) — this component stays feature-agnostic and
   *  just renders whatever it's given, or a placeholder box when there's nothing to show yet. */
  source?: ImageSourcePropType;
  /** Tint for the placeholder box when there's no cover art — e.g. the game's own colour, so a
   *  game without art still reads as itself. Ignored once `source` is present. */
  color?: string;
  size: number;
}

export function CoverThumbnail({ source, color, size }: CoverThumbnailProps) {
  if (!source) {
    return (
      <View
        className="rounded-xl border border-line bg-surface-sunken"
        style={{ width: size, height: size, backgroundColor: color, borderColor: color }}
      />
    );
  }

  return (
    <Image
      source={source}
      style={{ width: size, height: size, borderRadius: 12 }}
      resizeMode="cover"
    />
  );
}
