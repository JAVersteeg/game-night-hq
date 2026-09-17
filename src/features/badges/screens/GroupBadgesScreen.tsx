import type { RouteProp } from '@react-navigation/native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { useLayoutEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';

import { BadgeHex } from '@/components/BadgeHex';
import { SectionLabel } from '@/components/SectionLabel';
import { SegmentedControl } from '@/components/SegmentedControl';
import { Text } from '@/components/Text';
import { useAuth } from '@/features/auth/context/AuthContext';
import { AvatarMarksProvider } from '@/features/badges/avatarMarks';
import type { Milestone } from '@/features/badges/milestones';
import { computeMilestones } from '@/features/badges/milestones';
import type { GroupBadge, GroupBadges } from '@/features/badges/hooks/useGroupBadges';
import { useGroupBadges } from '@/features/badges/hooks/useGroupBadges';
import { MemberAvatar } from '@/features/groups/components/MemberAvatar';
import type { GroupMember } from '@/features/groups/hooks/useGroupMembers';
import { useGroupMembers } from '@/features/groups/hooks/useGroupMembers';
import { useGroup } from '@/features/groups/hooks/useGroups';
import type { AppStackParamList } from '@/navigation/types';

type Navigation = NativeStackNavigationProp<AppStackParamList>;

const TABS = ['Badges', 'Milestones'] as const;
type Tab = (typeof TABS)[number];

/** The first name is what every avatar sits next to — full names don't fit a chip or a card footer. */
function firstNameOf(member: GroupMember | undefined): string {
  return member?.displayName.trim().split(/\s+/)[0] ?? 'Onbekend';
}

function shortDate(iso: string): string {
  return format(new Date(iso), 'd MMM', { locale: nl });
}

/** One of the two headline pass-on badges: the big hexagon card at the top of the tab. */
function FeaturedBadgeCard({
  badge,
  members,
  onPress,
}: {
  badge: GroupBadge;
  members: GroupMember[];
  onPress: () => void;
}) {
  const holder = members.find((member) => member.userId === badge.holder?.userId);

  return (
    <Pressable
      onPress={onPress}
      className="flex-1 items-center gap-3.5 rounded-2xl border border-accent-line bg-surface-muted px-3.5 pb-4 pt-5 active:opacity-80"
      accessibilityRole="button"
      accessibilityLabel={badge.name}
    >
      <BadgeHex size={84} art={badge.art} held={Boolean(badge.holder)} />
      <View className="items-center gap-1">
        <Text className="text-center text-lg font-semibold leading-snug text-ink">
          {badge.name}
        </Text>
      </View>
      <View className="w-full flex-row items-center gap-2 border-t border-line pt-4">
        {badge.holder ? (
          <>
            <MemberAvatar member={holder} size={28} hideMarkOf={badge.id} />
            <View className="min-w-0 flex-1">
              <Text className="text-sm font-semibold text-ink" numberOfLines={1}>
                {firstNameOf(holder)}
              </Text>
              <Text className="text-sm text-ink-subtle" numberOfLines={1}>
                {badge.holder.metric ?? `sinds ${shortDate(badge.holder.since)}`}
              </Text>
            </View>
          </>
        ) : (
          <Text className="text-sm text-ink-subtle">Nog geen houder</Text>
        )}
      </View>
    </Pressable>
  );
}

/** Every other pass-on badge, as a row in one bordered list card. */
function BadgeRow({
  badge,
  members,
  first,
  onPress,
}: {
  badge: GroupBadge;
  members: GroupMember[];
  first: boolean;
  onPress: () => void;
}) {
  const holder = members.find((member) => member.userId === badge.holder?.userId);
  const held = Boolean(badge.holder);

  return (
    <Pressable
      onPress={onPress}
      className={`flex-row items-center gap-3 px-4 py-3 active:opacity-80 ${
        first ? '' : 'border-t border-line'
      }`}
      accessibilityRole="button"
      accessibilityLabel={badge.name}
    >
      <BadgeHex size={36} art={badge.art} held={held} />
      <View className="min-w-0 flex-1 gap-0.5">
        <Text
          className={`text-base font-semibold ${held ? 'text-ink' : 'text-ink-muted'}`}
          numberOfLines={1}
        >
          {badge.name}
        </Text>
        <Text className="text-sm text-ink-subtle" numberOfLines={1}>
          {badge.holder
            ? `${firstNameOf(holder)} · ${badge.holder.metric ?? `sinds ${shortDate(badge.holder.since)}`}`
            : 'Nog geen houder'}
        </Text>
      </View>
      {badge.holder ? <MemberAvatar member={holder} size={28} hideMarkOf={badge.id} /> : null}
    </Pressable>
  );
}

function BadgesTab({
  data,
  members,
  onOpenBadge,
}: {
  data: GroupBadges;
  members: GroupMember[];
  onOpenBadge: (badgeId: string) => void;
}) {
  const featured = data.badges.filter((badge) => badge.featured);
  const others = data.badges.filter((badge) => !badge.featured);

  if (data.badges.length === 0) {
    return (
      <Text className="text-sm leading-5 text-ink-subtle">
        Zodra jullie spellen hebben toegevoegd en potjes hebben gespeeld, verschijnen hier de
        badges.
      </Text>
    );
  }

  return (
    <View className="gap-6">
      {featured.length > 0 ? (
        <View className="gap-3">
          <SectionLabel>In omloop</SectionLabel>
          <View className="flex-row gap-3">
            {featured.map((badge) => (
              <FeaturedBadgeCard
                key={badge.id}
                badge={badge}
                members={members}
                onPress={() => onOpenBadge(badge.id)}
              />
            ))}
          </View>
        </View>
      ) : null}

      {others.length > 0 ? (
        <View className="gap-3">
          <SectionLabel>Overige badges</SectionLabel>
          <View className="overflow-hidden rounded-2xl border border-line">
            {others.map((badge, index) => (
              <BadgeRow
                key={badge.id}
                badge={badge}
                members={members}
                first={index === 0}
                onPress={() => onOpenBadge(badge.id)}
              />
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

function PlayerChip({
  member,
  selected,
  onPress,
}: {
  member: GroupMember;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    // The 44px tap target lives on the Pressable; the pill itself stays the size the design draws.
    <Pressable
      onPress={onPress}
      className="min-h-11 justify-center active:opacity-80"
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={member.displayName}
    >
      <View
        className={`flex-row items-center gap-2 rounded-full border py-1.5 pl-1.5 pr-3 ${
          selected ? 'border-accent-line bg-accent-soft' : 'border-line'
        }`}
      >
        <MemberAvatar member={member} size={28} />
        <Text
          className={`text-sm ${selected ? 'font-semibold text-accent-softFg' : 'text-ink-muted'}`}
        >
          {firstNameOf(member)}
        </Text>
      </View>
    </Pressable>
  );
}

function MilestoneRow({ milestone }: { milestone: Milestone }) {
  const achieved = Boolean(milestone.achievedLabel);
  const progress = Math.min(1, milestone.current / milestone.target);

  return (
    <View
      className={`flex-row items-center gap-3 rounded-2xl border px-3 py-2.5 ${
        achieved ? 'border-accent-line bg-surface-muted' : 'border-line'
      }`}
    >
      <View
        className={`h-12 w-12 items-center justify-center rounded-[14px] border ${
          achieved ? 'border-accent-line bg-surface-sunken' : 'border-line bg-surface'
        }`}
      >
        <Text
          className={`text-lg font-bold ${achieved ? 'text-accent' : 'text-ink-subtle'}`}
          style={{ letterSpacing: -0.36, fontVariant: ['tabular-nums'] }}
        >
          {milestone.target}
        </Text>
      </View>

      {achieved ? (
        <View className="min-w-0 flex-1 gap-0.5">
          <Text className="text-base font-semibold text-ink">{milestone.name}</Text>
          <Text className="text-sm text-ink-muted" style={{ fontVariant: ['tabular-nums'] }}>
            {milestone.achievedLabel}
          </Text>
        </View>
      ) : (
        <View className="min-w-0 flex-1 gap-1.5">
          <View className="flex-row items-baseline gap-2">
            <Text className="flex-1 text-base font-semibold text-ink-muted">{milestone.name}</Text>
            <Text className="text-sm text-ink-subtle" style={{ fontVariant: ['tabular-nums'] }}>
              {milestone.current} / {milestone.target}
            </Text>
          </View>
          <View className="h-1 overflow-hidden rounded-full bg-surface-sunken">
            <View
              className="h-full rounded-full bg-accent-line"
              style={{ width: `${progress * 100}%` }}
            />
          </View>
        </View>
      )}
    </View>
  );
}

function MilestonesTab({
  data,
  members,
  selectedPlayerId,
  onSelectPlayer,
}: {
  data: GroupBadges;
  members: GroupMember[];
  selectedPlayerId: string | null;
  onSelectPlayer: (userId: string) => void;
}) {
  const selected = members.find((member) => member.userId === selectedPlayerId) ?? members[0];
  const milestones = useMemo(
    () => (selected ? computeMilestones(selected.userId, data.sessions) : []),
    [selected, data.sessions],
  );

  if (!selected) {
    return (
      <Text className="text-sm leading-5 text-ink-subtle">
        Zodra er leden in de groep zitten, verschijnen hier hun milestones.
      </Text>
    );
  }

  const reached = milestones.filter((milestone) => milestone.achievedLabel).length;

  return (
    <View className="gap-6">
      <View className="gap-2.5">
        <SectionLabel>Speler</SectionLabel>
        <View className="flex-row flex-wrap gap-2">
          {members.map((member) => (
            <PlayerChip
              key={member.userId}
              member={member}
              selected={member.userId === selected.userId}
              onPress={() => onSelectPlayer(member.userId)}
            />
          ))}
        </View>
      </View>

      <View className="gap-2.5">
        <View className="flex-row items-baseline gap-2">
          <View className="flex-1">
            <SectionLabel>{firstNameOf(selected)}</SectionLabel>
          </View>
          <Text className="text-sm text-ink-subtle" style={{ fontVariant: ['tabular-nums'] }}>
            {reached} van {milestones.length} gehaald
          </Text>
        </View>

        {milestones.map((milestone) => (
          <MilestoneRow key={milestone.id} milestone={milestone} />
        ))}

        <Text className="text-sm leading-5 text-ink-subtle">
          Milestones worden berekend uit de gespeelde potjes, er is geen moment waarop je ze
          verdient.
        </Text>
      </View>
    </View>
  );
}

/**
 * A group's badges and milestones. Two deliberately different things in one place: pass-on
 * badges, which have exactly one holder at a time, and milestones, which are per player and
 * never lost. Both are derived from the group's session history on every read — nothing here is
 * stored, so there is no unlock moment to celebrate.
 */
export function GroupBadgesScreen() {
  const { groupId } = useRoute<RouteProp<AppStackParamList, 'GroupBadges'>>().params;
  const navigation = useNavigation<Navigation>();
  const { session } = useAuth();
  const { data: group } = useGroup(groupId);
  const { data: members } = useGroupMembers(groupId);
  const { data, isPending, isError } = useGroupBadges(groupId);

  const [tab, setTab] = useState<Tab>('Badges');
  // The tab opens on whoever is looking at it; the chips are what changes that.
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(session?.user.id ?? null);

  useLayoutEffect(() => {
    navigation.setOptions({ title: group?.name ?? '' });
  }, [navigation, group?.name]);

  if (isPending) {
    return (
      <View className="flex-1 items-center justify-center bg-surface">
        <ActivityIndicator />
      </View>
    );
  }

  if (isError || !data) {
    return (
      <View className="flex-1 items-center justify-center bg-surface px-6">
        <Text className="text-center text-base text-ink-muted">
          De badges konden niet worden geladen.
        </Text>
      </View>
    );
  }

  return (
    <AvatarMarksProvider groupId={groupId}>
      <ScrollView className="flex-1 bg-surface" contentContainerClassName="gap-6 px-6 pb-12 pt-2">
        <SegmentedControl options={TABS} value={tab} onChange={setTab} />

        {tab === 'Badges' ? (
          <BadgesTab
            data={data}
            members={members ?? []}
            onOpenBadge={(badgeId) => navigation.navigate('BadgeDetail', { groupId, badgeId })}
          />
        ) : (
          <MilestonesTab
            data={data}
            members={members ?? []}
            selectedPlayerId={selectedPlayerId}
            onSelectPlayer={setSelectedPlayerId}
          />
        )}
      </ScrollView>
    </AvatarMarksProvider>
  );
}
