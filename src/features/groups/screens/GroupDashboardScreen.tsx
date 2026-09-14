import type { RouteProp } from '@react-navigation/native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { useLayoutEffect } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';

import { SectionLabel } from '@/components/SectionLabel';
import {
  useGroupDashboardStats,
  type PopularGame,
} from '@/features/groups/hooks/useGroupDashboardStats';
import { useGroupMembers } from '@/features/groups/hooks/useGroupMembers';
import { useGroup } from '@/features/groups/hooks/useGroups';
import type { AppStackParamList } from '@/navigation/types';

type Navigation = NativeStackNavigationProp<AppStackParamList>;

function StatTile({ value, label }: { value: number; label: string }) {
  return (
    <View className="flex-1 items-center gap-1 rounded-2xl border border-line bg-surface py-4">
      <Text className="text-2xl font-bold text-ink">{value}</Text>
      <Text className="text-center text-xs font-medium text-ink-subtle">{label}</Text>
    </View>
  );
}

function PopularGameRow({ game, isFirst }: { game: PopularGame; isFirst: boolean }) {
  return (
    <View
      className={`flex-row items-center justify-between px-4 py-3 ${isFirst ? '' : 'border-t border-line'}`}
    >
      <Text className="shrink text-base text-ink" numberOfLines={1}>
        {game.name}
      </Text>
      <Text className="text-sm text-ink-subtle">{game.playCount}x gespeeld</Text>
    </View>
  );
}

function SettingsButton({ onPress }: { onPress: () => void }) {
  // A gear glyph, not an icon library: GroupListScreen already draws its row chevron the same way,
  // as a plain character, rather than pulling in an icon set for a single glyph.
  return (
    <Pressable
      onPress={onPress}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel="Groepsinstellingen"
      className="active:opacity-70"
      testID="group-settings-button"
    >
      <Text className="text-2xl">⚙️</Text>
    </Pressable>
  );
}

/**
 * A group's home. Key stats and the most-played games list; the invite code and member list live
 * one level down, in Instellingen, reached via the gear button.
 *
 * Every number here comes from a real query against `game_templates` / `sessions` — there is no
 * flow yet to define a game or play a session (that's a later stage), so today this legitimately
 * renders its empty states for every group. That's expected, not a bug.
 */
export function GroupDashboardScreen() {
  const { groupId } = useRoute<RouteProp<AppStackParamList, 'GroupDashboard'>>().params;
  const navigation = useNavigation<Navigation>();
  const { data: group } = useGroup(groupId);
  const { data: members } = useGroupMembers(groupId);
  const { data: stats, isPending, isError } = useGroupDashboardStats(groupId);

  // useLayoutEffect so the title and gear button are in place on the first paint.
  useLayoutEffect(() => {
    navigation.setOptions({
      title: group?.name ?? '',
      headerRight: () => (
        <SettingsButton onPress={() => navigation.navigate('GroupSettings', { groupId })} />
      ),
    });
  }, [navigation, group?.name, groupId]);

  // The group is read from the list cache, which is populated before anything can navigate here —
  // but a cache eviction or a group you were removed from would leave nothing to render.
  if (!group) {
    return (
      <View className="flex-1 items-center justify-center bg-surface px-6">
        <Text className="text-center text-base text-ink-muted">
          Deze groep kon niet worden geladen.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-surface" contentContainerClassName="px-6 pb-12 pt-6">
      <View className="flex-row gap-3">
        <StatTile value={stats?.gamesCount ?? 0} label="Spellen" />
        <StatTile value={stats?.sessionsPlayedCount ?? 0} label="Potjes gespeeld" />
        <StatTile value={members?.length ?? 0} label="Leden" />
      </View>

      {stats?.lastPlayedAt ? (
        <Text className="mt-3 text-center text-sm text-ink-subtle">
          Laatst gespeeld op {format(new Date(stats.lastPlayedAt), 'd MMMM yyyy', { locale: nl })}
        </Text>
      ) : null}

      <View className="mt-8">
        <SectionLabel>Populairste spellen</SectionLabel>
        <View className="mt-2 overflow-hidden rounded-2xl border border-line bg-surface">
          {isPending ? (
            <View className="items-center py-6">
              <ActivityIndicator />
            </View>
          ) : isError || !stats ? (
            <Text className="px-4 py-6 text-base text-ink-muted">
              De statistieken konden niet worden geladen.
            </Text>
          ) : stats.popularGames.length === 0 ? (
            <View className="bg-surface-muted px-4 py-6">
              <Text className="text-base text-ink-muted">
                Zodra jullie potjes hebben gespeeld, zie je hier de populairste spellen van de
                groep.
              </Text>
            </View>
          ) : (
            stats.popularGames.map((game, index) => (
              <PopularGameRow key={game.templateId} game={game} isFirst={index === 0} />
            ))
          )}
        </View>
      </View>
    </ScrollView>
  );
}
