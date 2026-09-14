import { Image, Text, View } from 'react-native';

interface AvatarProps {
  displayName: string;
  /** Diameter in px. Also drives the font size, so one number controls the whole thing. */
  size?: number;
  /** From `profiles.avatar_url`. Nothing writes this yet; initials are the fallback until then. */
  avatarUrl?: string | null;
}

/**
 * Derives up to two initials from a display name. Falls back to '?' rather than rendering an empty
 * circle — a name is required at onboarding, but a blank badge would look broken if one ever slips
 * through.
 */
function initialsFrom(displayName: string): string {
  const words = displayName.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 1).toUpperCase();
  return (words[0].slice(0, 1) + words[words.length - 1].slice(0, 1)).toUpperCase();
}

export function Avatar({ displayName, size = 40, avatarUrl }: AvatarProps) {
  const dimensions = { width: size, height: size, borderRadius: size / 2 };

  if (avatarUrl) {
    return (
      <Image source={{ uri: avatarUrl }} style={dimensions} accessibilityIgnoresInvertColors />
    );
  }

  return (
    <View className="items-center justify-center bg-accent-soft" style={dimensions}>
      <Text className="font-semibold text-accent-softFg" style={{ fontSize: size * 0.4 }}>
        {initialsFrom(displayName)}
      </Text>
    </View>
  );
}
