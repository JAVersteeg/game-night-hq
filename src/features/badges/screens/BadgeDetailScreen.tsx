import type { RouteProp } from '@react-navigation/native';
import { useRoute } from '@react-navigation/native';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Badge } from '@/components/Badge';
import { BadgeHex } from '@/components/BadgeHex';
import { SectionLabel } from '@/components/SectionLabel';
import { Text } from '@/components/Text';
import { AvatarMarksProvider } from '@/features/badges/avatarMarks';
import { useGroupBadges } from '@/features/badges/hooks/useGroupBadges';
import { MemberAvatar } from '@/features/groups/components/MemberAvatar';
import type { GroupMember } from '@/features/groups/hooks/useGroupMembers';
import { useGroupMembers } from '@/features/groups/hooks/useGroupMembers';
import type { AppStackParamList } from '@/navigation/types';

/** The tail under the last section, matching the `pb-12` every other screen ends on. */
const BOTTOM_PADDING = 48;

function firstNameOf(member: GroupMember | undefined): string {
  return member?.displayName.trim().split(/\s+/)[0] ?? 'Onbekend';
}

function shortDate(iso: string): string {
  return format(new Date(iso), 'd MMM', { locale: nl });
}

/**
 * One pass-on badge in full: what it takes to hold it, who has it now, and everyone who had it
 * before. The history is replayed from the group's sessions like the rest of this feature, so only
 * potjes that were actually recorded in the app show up in it.
 */
export function BadgeDetailScreen() {
  const { groupId, badgeId } = useRoute<RouteProp<AppStackParamList, 'BadgeDetail'>>().params;
  const insets = useSafeAreaInsets();
  const { data: members } = useGroupMembers(groupId);
  const { data, isPending, isError } = useGroupBadges(groupId);

  if (isPending) {
    return (
      <View className="flex-1 items-center justify-center bg-surface">
        <ActivityIndicator />
      </View>
    );
  }

  const badge = data?.badges.find((entry) => entry.id === badgeId);

  if (isError || !badge) {
    return (
      <View className="flex-1 items-center justify-center bg-surface px-6">
        <Text className="text-center text-base text-ink-muted">
          Deze badge kon niet worden geladen.
        </Text>
      </View>
    );
  }

  const memberById = (userId: string) => members?.find((member) => member.userId === userId);
  const holder = badge.holder ? memberById(badge.holder.userId) : undefined;

  return (
    // The bottom inset rides on top of the 48px tail, so a badge with a long ranglijst still ends
    // clear of Android's gesture bar instead of under it. Only the scrolled content is padded, so
    // a short badge keeps its normal spacing.
    <AvatarMarksProvider groupId={groupId}>
      <ScrollView
        className="flex-1 bg-surface"
        contentContainerClassName="gap-8 px-6 pt-6"
        contentContainerStyle={{ paddingBottom: BOTTOM_PADDING + insets.bottom }}
      >
        <View className="flex-row items-center gap-4">
          <BadgeHex size={88} art={badge.art} held={Boolean(badge.holder)} />
          <View className="min-w-0 flex-1 gap-1.5">
            <Text className="text-3xl font-bold text-ink" style={{ letterSpacing: -0.75 }}>
              {badge.name}
            </Text>
            <View className="flex-row">
              <Badge tone={badge.holder ? 'accent' : 'neutral'}>
                {badge.holder ? 'In omloop' : 'Nog geen houder'}
              </Badge>
            </View>
          </View>
        </View>

        <Text className="text-base leading-6 text-ink-muted">{badge.description}</Text>

        <View className="gap-2">
          <SectionLabel>Houder</SectionLabel>
          {badge.holder ? (
            <View className="flex-row items-center gap-3 rounded-2xl border border-accent-line bg-surface-muted px-4 py-3.5">
              <MemberAvatar member={holder} size={44} hideMarkOf={badge.id} />
              <View className="min-w-0 flex-1 gap-0.5">
                <Text className="text-lg font-semibold text-ink">{firstNameOf(holder)}</Text>
                <Text className="text-sm text-ink-muted" style={{ fontVariant: ['tabular-nums'] }}>
                  {badge.holder.metric
                    ? `${badge.holder.metric}, sinds ${shortDate(badge.holder.since)}`
                    : `sinds ${shortDate(badge.holder.since)}`}
                  {badge.holder.sessionsAgo > 0
                    ? `, ${badge.holder.sessionsAgo} ${
                        badge.holder.sessionsAgo === 1 ? 'potje' : 'potjes'
                      } geleden`
                    : ''}
                </Text>
              </View>
            </View>
          ) : (
            <View className="rounded-2xl border border-line px-4 py-3.5">
              <Text className="text-base text-ink-muted">
                Nog niemand heeft aan de voorwaarde voldaan. {badge.condition}.
              </Text>
            </View>
          )}
        </View>

        {badge.standings && badge.standings.rows.length > 0 ? (
          <View className="gap-2">
            <SectionLabel>{badge.standings.label}</SectionLabel>
            <Text className="text-sm leading-5 text-ink-subtle">{badge.standings.explanation}</Text>
            <View className="mt-1 overflow-hidden rounded-2xl border border-line">
              {badge.standings.rows.map((row, index) => {
                const member = memberById(row.userId);
                return (
                  <View
                    key={row.userId}
                    className={`flex-row items-center gap-3 px-4 py-3 ${
                      index === 0 ? '' : 'border-t border-line'
                    } ${row.eligible ? '' : 'opacity-50'}`}
                  >
                    <Text
                      className="w-4 text-sm text-ink-subtle"
                      style={{ fontVariant: ['tabular-nums'] }}
                    >
                      {index + 1}
                    </Text>
                    <MemberAvatar member={member} size={32} />
                    <View className="min-w-0 flex-1 gap-0.5">
                      <Text className="text-base text-ink" numberOfLines={1}>
                        {firstNameOf(member)}
                      </Text>
                      <Text
                        className="text-sm text-ink-subtle"
                        style={{ fontVariant: ['tabular-nums'] }}
                      >
                        {row.meta}
                      </Text>
                    </View>
                    <Text
                      className="text-base font-semibold text-ink"
                      style={{ fontVariant: ['tabular-nums'] }}
                    >
                      {row.valueLabel}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        ) : null}

        {badge.previousHolders.length > 0 ? (
          <View className="gap-2">
            <SectionLabel>Eerdere houders</SectionLabel>
            <View className="overflow-hidden rounded-2xl border border-line">
              {badge.previousHolders.map((period, index) => {
                const member = memberById(period.userId);
                return (
                  <View
                    key={`${period.userId}-${period.from}`}
                    className={`flex-row items-center gap-3 px-4 py-3 ${
                      index === 0 ? '' : 'border-t border-line'
                    }`}
                  >
                    <MemberAvatar member={member} size={32} />
                    <Text className="flex-1 text-base text-ink" numberOfLines={1}>
                      {firstNameOf(member)}
                    </Text>
                    <Text
                      className="text-sm text-ink-subtle"
                      style={{ fontVariant: ['tabular-nums'] }}
                    >
                      {shortDate(period.from)} tot {period.to ? shortDate(period.to) : 'nu'}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        ) : null}
      </ScrollView>
    </AvatarMarksProvider>
  );
}
