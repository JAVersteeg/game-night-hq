import { View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { BadgeHex } from '@/components/BadgeHex';
import { useAvatarMark } from '@/features/badges/avatarMarks';
import type { GroupMember } from '@/features/groups/hooks/useGroupMembers';

interface MemberAvatarProps {
  /** Undefined while the member list is still loading, or for someone who has left the group. */
  member: GroupMember | undefined;
  size: number;
  /** Leaves this badge's mark off — for the holder slot of that same badge. */
  hideMarkOf?: string;
}

/**
 * A group member's avatar: their colour, and the badge mark they currently wear. Every avatar that
 * shows a member *of a group* goes through this rather than `Avatar` directly, so a new mark only
 * has to be taught to one component. Needs an `AvatarMarksProvider` above it for the mark; without
 * one it's a plain coloured avatar.
 */
export function MemberAvatar({ member, size, hideMarkOf }: MemberAvatarProps) {
  const mark = useAvatarMark(member?.userId, hideMarkOf);

  return (
    <Avatar
      displayName={member?.displayName ?? '?'}
      avatarUrl={member?.avatarUrl}
      color={member?.color}
      size={size}
      mark={mark?.art}
    />
  );
}

/**
 * The same mark on its own, for places that show a member by name only — the stats rankings. Sized
 * by the caller to sit next to the text it follows.
 */
export function MemberMark({ userId, size }: { userId: string; size: number }) {
  const mark = useAvatarMark(userId);
  if (!mark) return null;

  return (
    <View accessible accessibilityLabel={mark.badgeName}>
      <BadgeHex size={size} art={mark.art} />
    </View>
  );
}
