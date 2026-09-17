import { Image, View, type ImageSourcePropType } from 'react-native';
import { BadgeHex } from '@/components/BadgeHex';
import { Text } from '@/components/Text';

import { getPlayerColor, type PlayerColor } from '@/lib/playerColors';

interface AvatarProps {
  displayName: string;
  /** Diameter in px. Also drives the font size and the mark, so one number controls the whole thing. */
  size?: number;
  /** From `profiles.avatar_url`. Nothing writes this yet; initials are the fallback until then. */
  avatarUrl?: string | null;
  /** A group member's chosen colour. Omitted where identity isn't group-scoped (the profile
   *  screen's own avatar, which has no single colour across groups) — falls back to the generic
   *  accent look. */
  color?: PlayerColor;
  /** Badge artwork worn in the bottom-left corner, inside the same hexagon the badge wears on the
   *  badges tab. Pass it through `MemberAvatar` rather than directly, so which badge that is stays
   *  decided in one place. */
  mark?: ImageSourcePropType | null;
}

/**
 * The mark's width as a share of the avatar's, so it reads the same at 28px and at 96px. Wider than
 * the bare artwork used to be: the hexagon only fills itself to `ART_SCALE`, so the drawing inside
 * lands at roughly its old size rather than shrinking to make room for the ring.
 */
export const AVATAR_MARK_SCALE = 0.56;
/** How far the mark hangs past the avatar's edge, as a share of the avatar's diameter. */
const MARK_OVERHANG = 0.08;

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

function AvatarFace({
  displayName,
  size,
  avatarUrl,
  color,
}: Required<Pick<AvatarProps, 'displayName' | 'size'>> & Pick<AvatarProps, 'avatarUrl' | 'color'>) {
  const dimensions = { width: size, height: size, borderRadius: size / 2 };

  if (avatarUrl) {
    return (
      <Image source={{ uri: avatarUrl }} style={dimensions} accessibilityIgnoresInvertColors />
    );
  }

  const palette = color ? getPlayerColor(color) : null;

  return (
    <View
      className={
        palette ? 'items-center justify-center' : 'items-center justify-center bg-accent-soft'
      }
      style={palette ? { ...dimensions, backgroundColor: palette.swatch } : dimensions}
    >
      <Text
        className={palette ? 'font-semibold' : 'font-semibold text-accent-softFg'}
        style={palette ? { fontSize: size * 0.4, color: palette.fg } : { fontSize: size * 0.4 }}
      >
        {initialsFrom(displayName)}
      </Text>
    </View>
  );
}

export function Avatar({ displayName, size = 40, avatarUrl, color, mark }: AvatarProps) {
  if (!mark) {
    return <AvatarFace displayName={displayName} size={size} avatarUrl={avatarUrl} color={color} />;
  }

  const markSize = Math.round(size * AVATAR_MARK_SCALE);
  const overhang = Math.round(size * MARK_OVERHANG);

  // The wrapper keeps the avatar's own footprint, so a marked avatar lines up with an unmarked one
  // in the same list; the mark hangs over the corner instead of pushing anything aside.
  return (
    <View style={{ width: size, height: size }}>
      <AvatarFace displayName={displayName} size={size} avatarUrl={avatarUrl} color={color} />
      <View style={{ position: 'absolute', left: -overhang, bottom: -overhang }}>
        <BadgeHex size={markSize} art={mark} />
      </View>
    </View>
  );
}
