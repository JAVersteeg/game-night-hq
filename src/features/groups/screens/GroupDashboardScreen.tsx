import type { RouteProp } from '@react-navigation/native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { useLayoutEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { GearIcon } from '@/components/GearIcon';
import { SegmentedControl } from '@/components/SegmentedControl';
import { useGameTemplates } from '@/features/games/hooks/useGameTemplates';
import {
  useGroupDashboardStats,
  type PopularGame,
} from '@/features/groups/hooks/useGroupDashboardStats';
import { useGroupMembers } from '@/features/groups/hooks/useGroupMembers';
import { useGroup } from '@/features/groups/hooks/useGroups';
import { useSessionHistory } from '@/features/sessions/hooks/useSessionHistory';
import { theme } from '@/lib/theme';
import type { AppStackParamList } from '@/navigation/types';

type Navigation = NativeStackNavigationProp<AppStackParamList>;

const TABS = ['Spellen', 'Geschiedenis', 'Statistieken'] as const;
type Tab = (typeof TABS)[number];

function SettingsButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel="Groepsinstellingen"
      className="active:opacity-70"
      testID="group-settings-button"
    >
      <GearIcon size={22} color={theme.ink} />
    </Pressable>
  );
}

/** Placeholder for the box cover art — nothing uploads one yet. Sized down for the history row so
 *  it reads as a smaller thumbnail next to the bigger one on the games list. */
function CoverPlaceholder({ size }: { size: number }) {
  return (
    <View
      className="rounded-xl border border-line bg-surface-sunken"
      style={{ width: size, height: size }}
    />
  );
}

function GameRow({
  name,
  fieldCount,
  onPress,
}: {
  name: string;
  fieldCount: number;
  onPress: () => void;
}) {
  return (
    <Card onPress={onPress} className="flex-row items-center gap-4">
      <CoverPlaceholder size={56} />
      <View className="min-w-0 flex-1">
        <Text className="text-lg font-semibold text-ink" numberOfLines={1}>
          {name}
        </Text>
      </View>
    </Card>
  );
}

function HistoryRow({
  gameName,
  meta,
  onPress,
}: {
  gameName: string;
  meta: string;
  onPress: () => void;
}) {
  return (
    <Card onPress={onPress} className="flex-row items-center gap-4">
      <CoverPlaceholder size={40} />
      <View className="min-w-0 flex-1">
        <Text className="text-lg font-semibold text-ink" numberOfLines={1}>
          {gameName}
        </Text>
        <Text className="mt-0.5 text-sm font-medium text-ink-muted" numberOfLines={1}>
          {meta}
        </Text>
      </View>
    </Card>
  );
}

/** The group's game templates: tap one to start a session, or add a new one. */
function GamesTab({ groupId }: { groupId: string }) {
  const navigation = useNavigation<Navigation>();
  const { data: templates, isPending, isError } = useGameTemplates(groupId);

  return (
    <View className="flex-1">
      <ScrollView className="flex-1" contentContainerClassName="grow gap-3 px-6 pb-4 pt-4">
        {isPending ? (
          <View className="items-center py-6">
            <ActivityIndicator />
          </View>
        ) : isError ? (
          <Text className="text-center text-base text-ink-muted">
            De spellen konden niet worden geladen.
          </Text>
        ) : templates.length === 0 ? (
          <EmptyState
            title="Nog geen spellen"
            body="Voeg een spel toe met de velden die jullie bijhouden, zoals punten of strafkaarten."
          />
        ) : (
          templates.map((template) => (
            <GameRow
              key={template.id}
              name={template.name}
              fieldCount={template.game_template_fields.length}
              onPress={() =>
                navigation.navigate('StartSession', { groupId, templateId: template.id })
              }
            />
          ))
        )}
      </ScrollView>

      {/* Pinned rather than appended to the scroll content, the way GroupListScreen pins its
          buttons: the one way into defining a game should stay reachable whether the list is
          empty, long, or still loading. */}
      <View className="border-t border-line px-6 pb-4 pt-4">
        <Button
          label="Spel toevoegen"
          variant="ghost"
          onPress={() => navigation.navigate('CreateGameTemplate', { groupId })}
          testID="add-game-button"
        />
      </View>
    </View>
  );
}

/** Finished sessions for this group, most recent first. Tapping one reopens it on its locked
 *  results view — the same screen a session lands on right after being finalised. */
function HistoryTab({ groupId }: { groupId: string }) {
  const navigation = useNavigation<Navigation>();
  const { data: sessions, isPending, isError } = useSessionHistory(groupId);
  const { data: members } = useGroupMembers(groupId);

  const displayNameById = new Map((members ?? []).map((member) => [member.userId, member.displayName]));

  return (
    <ScrollView className="flex-1" contentContainerClassName="grow gap-3 px-6 pb-4 pt-4">
      {isPending ? (
        <View className="items-center py-6">
          <ActivityIndicator />
        </View>
      ) : isError ? (
        <Text className="text-center text-base text-ink-muted">
          De geschiedenis kon niet worden geladen.
        </Text>
      ) : sessions.length === 0 ? (
        <EmptyState
          title="Nog geen potjes"
          body="Zodra jullie een avond spelen, verschijnt de geschiedenis hier."
        />
      ) : (
        sessions.map((session) => {
          const date = format(new Date(session.playedAt), 'd MMMM yyyy', { locale: nl });
          const winnerNames = session.winnerIds
            .map((userId) => displayNameById.get(userId))
            .filter((name): name is string => Boolean(name));
          const winnerLabel = winnerNames.length > 1 ? 'Winnaars' : 'Winnaar';
          const meta =
            winnerNames.length > 0 ? `${date} · ${winnerLabel}: ${winnerNames.join(' & ')}` : date;

          return (
            <HistoryRow
              key={session.id}
              gameName={session.gameName}
              meta={meta}
              onPress={() => navigation.navigate('Session', { sessionId: session.id })}
            />
          );
        })
      )}
    </ScrollView>
  );
}

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

/**
 * Every number here comes from a real query against `game_templates` / `sessions` — there is no
 * flow yet to play a session, so today this legitimately renders its empty popular-games state for
 * every group. That's expected, not a bug.
 */
function StatsTab({ groupId }: { groupId: string }) {
  const { data: stats, isPending, isError } = useGroupDashboardStats(groupId);

  return (
    <ScrollView className="flex-1" contentContainerClassName="px-6 pb-8 pt-4">
      <View className="flex-row gap-3">
        <StatTile value={stats?.gamesCount ?? 0} label="Spellen" />
        <StatTile value={stats?.sessionsPlayedCount ?? 0} label="Potjes gespeeld" />
      </View>

      {stats?.lastPlayedAt ? (
        <Text className="mt-3 text-center text-sm text-ink-subtle">
          Voor het laatst gespeeld op {format(new Date(stats.lastPlayedAt), 'd MMMM yyyy', { locale: nl })}
        </Text>
      ) : null}

      <View className="mt-8 overflow-hidden rounded-2xl border border-line bg-surface">
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
              Zodra jullie potjes hebben gespeeld, zie je hier de populairste spellen van de groep.
            </Text>
          </View>
        ) : (
          stats.popularGames.map((game, index) => (
            <PopularGameRow key={game.templateId} game={game} isFirst={index === 0} />
          ))
        )}
      </View>
    </ScrollView>
  );
}

/**
 * A group's home: games, history and stats, in tabs matching the domain model. Every number here
 * comes from a real query — Statistieken still legitimately renders its empty state until a group
 * has played enough to have popular games. That's expected, not a bug.
 */
export function GroupDashboardScreen() {
  const { groupId } = useRoute<RouteProp<AppStackParamList, 'GroupDashboard'>>().params;
  const navigation = useNavigation<Navigation>();
  const { data: group } = useGroup(groupId);
  const [tab, setTab] = useState<Tab>('Spellen');

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
    // Only the bottom edge: the native stack header already accounts for the top inset, but
    // GamesTab's pinned "Spel toevoegen" button would otherwise sit under Android's gesture bar.
    <SafeAreaView className="flex-1 bg-surface" edges={['bottom']}>
      <View className="px-6 pt-4">
        <SegmentedControl options={TABS} value={tab} onChange={setTab} />
      </View>
      {tab === 'Spellen' ? (
        <GamesTab groupId={groupId} />
      ) : tab === 'Geschiedenis' ? (
        <HistoryTab groupId={groupId} />
      ) : (
        <StatsTab groupId={groupId} />
      )}
    </SafeAreaView>
  );
}
