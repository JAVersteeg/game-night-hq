import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { ImageSourcePropType } from 'react-native';

import { useGroupBadges } from '@/features/badges/hooks/useGroupBadges';

/** A pass-on badge worn on its holder's avatar (Grote Daggoe). */
export interface AvatarMark {
  badgeId: string;
  badgeName: string;
  art: ImageSourcePropType;
}

const NO_MARKS: ReadonlyMap<string, AvatarMark> = new Map();

const AvatarMarksContext = createContext<ReadonlyMap<string, AvatarMark>>(NO_MARKS);

/**
 * Makes one group's avatar marks available to every `MemberAvatar` and `HolderMark` underneath.
 * Marks are group-scoped — the Grote Daggoe of one group is nobody in the next — so each screen that
 * shows a group's members wraps its content in this once, rather than every avatar taking a group
 * id and running its own lookup.
 *
 * Outside a provider (the profile, the group list) there are no marks, which is also the right
 * answer there: those avatars aren't about any one group.
 */
export function AvatarMarksProvider({
  groupId,
  children,
}: {
  groupId: string | null | undefined;
  children: ReactNode;
}) {
  const { data } = useGroupBadges(groupId ?? '');

  const marks = useMemo(() => {
    const byUserId = new Map<string, AvatarMark>();
    for (const badge of data?.badges ?? []) {
      if (!badge.avatarMark || !badge.holder || !badge.art) continue;
      // First one wins if a player ever holds two marked badges: one corner, one mark.
      if (byUserId.has(badge.holder.userId)) continue;
      byUserId.set(badge.holder.userId, {
        badgeId: badge.id,
        badgeName: badge.name,
        art: badge.art,
      });
    }
    return byUserId;
  }, [data]);

  return <AvatarMarksContext.Provider value={marks}>{children}</AvatarMarksContext.Provider>;
}

/**
 * The mark this player wears, if any. `exceptBadgeId` is for the one place a mark would only repeat
 * itself: the holder slot of that same badge, where the badge is already the whole point.
 */
export function useAvatarMark(
  userId: string | null | undefined,
  exceptBadgeId?: string,
): AvatarMark | null {
  const marks = useContext(AvatarMarksContext);
  if (!userId) return null;
  const mark = marks.get(userId);
  return mark && mark.badgeId !== exceptBadgeId ? mark : null;
}
