import { Image, View, type ImageSourcePropType } from 'react-native';

interface CoverThumbnailProps {
  /** Already resolved (e.g. via `coverImageForKey`) — this component stays feature-agnostic and
   *  just renders whatever it's given, or a placeholder box when there's nothing to show yet. */
  source?: ImageSourcePropType;
  size: number;
}

export function CoverThumbnail({ source, size }: CoverThumbnailProps) {
  if (!source) {
    return (
      <View
        className="rounded-xl border border-line bg-surface-sunken"
        style={{ width: size, height: size }}
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
