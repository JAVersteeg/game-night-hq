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
import { BarList } from '@/components/charts/BarList';
import { HeadToHead } from '@/components/charts/HeadToHead';
import { seriesColor, seriesColorByUser } from '@/components/charts/series';
import { TrendChart } from '@/components/charts/TrendChart';
import { CoverThumbnail } from '@/components/CoverThumbnail';
import { EmptyState } from '@/components/EmptyState';
import { GearIcon } from '@/components/GearIcon';
import { SectionLabel } from '@/components/SectionLabel';
import { SegmentedControl } from '@/components/SegmentedControl';
import { StatTile } from '@/components/StatTile';
import { coverImageForKey } from '@/features/games/covers';
import type { GameStats, LeaderboardEntry } from '@/features/games/hooks/useGameStats';
import { useGameStats } from '@/features/games/hooks/useGameStats';
import { useGameTemplate, useGameTemplates } from '@/features/games/hooks/useGameTemplates';
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

function GameRow({
  name,
  coverKey,
  onPress,
}: {
  name: string;
  coverKey: string | null;
  onPress: () => void;
}) {
  return (
    <Card onPress={onPress} className="flex-row items-center gap-4">
      <CoverThumbnail source={coverImageForKey(coverKey)} size={56} />
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
  coverKey,
  meta,
  onPress,
}: {
  gameName: string;
  coverKey: string | null;
  meta: string;
  onPress: () => void;
}) {
  return (
    <Card onPress={onPress} className="flex-row items-center gap-4">
      <CoverThumbnail source={coverImageForKey(coverKey)} size={40} />
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
              coverKey={template.cover_key}
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

  const displayNameById = new Map(
    (members ?? []).map((member) => [member.userId, member.displayName]),
  );

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
              coverKey={session.coverKey}
              meta={meta}
              onPress={() => navigation.navigate('Session', { sessionId: session.id })}
            />
          );
        })
      )}
    </ScrollView>
  );
}

function Chip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      className={`rounded-full border px-3.5 py-2 ${
        selected ? 'border-accent-line bg-accent-soft' : 'border-line bg-surface'
      }`}
    >
      <Text
        className={`text-sm font-semibold ${selected ? 'text-accent-softFg' : 'text-ink-muted'}`}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function LeaderboardRow({
  rank,
  name,
  entry,
  meta,
  color,
  isFirst,
}: {
  rank: number;
  name: string;
  entry: LeaderboardEntry;
  meta: string;
  color: string;
  isFirst: boolean;
}) {
  return (
    <View className={`gap-2 px-4 py-3 ${isFirst ? '' : 'border-t border-line'}`}>
      <View className="flex-row items-center gap-3">
        <Text className="w-5 text-sm font-semibold text-ink-subtle">{rank}</Text>
        <View className="min-w-0 flex-1">
          <Text className="text-base font-semibold text-ink" numberOfLines={1}>
            {name}
          </Text>
          <Text className="mt-0.5 text-sm text-ink-muted" numberOfLines={1}>
            {meta}
          </Text>
        </View>
        <Text className="text-lg font-bold text-ink">{entry.winPct}%</Text>
      </View>
      {/* The bar repeats the percentage rather than adding a number: it's there so the gap between
          first and fifth is visible without reading five figures. */}
      <View className="h-1.5 overflow-hidden rounded-full bg-surface-sunken">
        <View
          className="h-full rounded-full"
          style={{ width: `${entry.winPct}%`, backgroundColor: color }}
        />
      </View>
    </View>
  );
}

/** Two players' record against each other, over the sessions of this game they both played. The
 *  chips append rather than toggle — tapping a third player pushes out the one picked longest ago,
 *  so there are always exactly two and no way to end up with an empty comparison. */
function HeadToHeadSection({
  stats,
  displayNameById,
}: {
  stats: GameStats;
  displayNameById: Map<string, string>;
}) {
  const [picked, setPicked] = useState<string[]>([]);

  const candidates = stats.leaderboard.map((entry) => entry.userId);
  const selection =
    picked.length === 2 && picked.every((userId) => candidates.includes(userId))
      ? picked
      : candidates.slice(0, 2);

  if (candidates.length < 2) return null;

  const [left, right] = selection;
  const record = stats.headToHead[left]?.[right] ?? { wins: 0, losses: 0, draws: 0 };

  return (
    <View className="mt-8">
      <SectionLabel>Onderling</SectionLabel>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="mt-3"
        contentContainerClassName="gap-2"
      >
        {candidates.map((userId) => (
          <Chip
            key={userId}
            label={displayNameById.get(userId) ?? '?'}
            selected={selection.includes(userId)}
            onPress={() =>
              setPicked((current) => [...current.filter((id) => id !== userId), userId].slice(-2))
            }
          />
        ))}
      </ScrollView>

      <Card className="mt-3">
        <HeadToHead
          left={displayNameById.get(left) ?? '?'}
          right={displayNameById.get(right) ?? '?'}
          leftWins={record.wins}
          rightWins={record.losses}
          draws={record.draws}
        />
      </Card>
    </View>
  );
}

/** Score trend, leaderboard and head-to-head for one game template, with chips to pick which of
 *  the group's played games they all describe. Only offers templates that have actually been
 *  played — `popularGames` is already filtered and capped that way. */
function GameStatsSection({
  groupId,
  popularGames,
}: {
  groupId: string;
  popularGames: PopularGame[];
}) {
  const [selectedTemplateId, setSelectedTemplateId] = useState(popularGames[0]?.templateId ?? '');
  const templateId = popularGames.some((game) => game.templateId === selectedTemplateId)
    ? selectedTemplateId
    : (popularGames[0]?.templateId ?? '');

  const { data: template } = useGameTemplate(templateId);
  const { data: members } = useGroupMembers(groupId);
  const { data: stats, isPending, isError } = useGameStats(template);

  const displayNameById = new Map(
    (members ?? []).map((member) => [member.userId, member.displayName]),
  );

  if (popularGames.length === 0) return null;

  // Ranked games plot finish position, not points: 1 is the best score there, so the axis is
  // flipped and pinned to the real range of places instead of a padded one.
  const isRanked = template?.scoring_direction === 'ranked';
  const colorByUser = stats
    ? seriesColorByUser(stats.trend.series.map((entry) => entry.userId))
    : new Map<string, string>();

  return (
    <View className="mt-8">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-2"
      >
        {popularGames.map((game) => (
          <Chip
            key={game.templateId}
            label={game.name}
            selected={game.templateId === templateId}
            onPress={() => setSelectedTemplateId(game.templateId)}
          />
        ))}
      </ScrollView>

      {isPending || !template ? (
        <View className="items-center py-10">
          <ActivityIndicator />
        </View>
      ) : isError || !stats ? (
        <Card tone="muted" className="mt-4">
          <Text className="text-base text-ink-muted">
            De statistieken van dit spel konden niet worden geladen.
          </Text>
        </Card>
      ) : stats.leaderboard.length === 0 ? (
        <Card tone="muted" className="mt-4">
          <Text className="text-base text-ink-muted">
            Nog geen potjes van dit spel om statistieken van te maken.
          </Text>
        </Card>
      ) : (
        <>
          <View className="mt-6">
            <SectionLabel>{isRanked ? 'Plek per potje' : 'Scoreverloop'}</SectionLabel>
            <Card className="mt-3">
              <TrendChart
                labels={stats.trend.labels}
                inverted={isRanked}
                domain={isRanked ? [1, Math.max(2, stats.maxParticipants)] : undefined}
                series={stats.trend.series.map((entry) => ({
                  name: displayNameById.get(entry.userId) ?? '?',
                  color: colorByUser.get(entry.userId) ?? seriesColor(0),
                  points: entry.points,
                }))}
              />
            </Card>
          </View>

          <View className="mt-8">
            <SectionLabel>Ranglijst</SectionLabel>
            <View className="mt-3 overflow-hidden rounded-2xl border border-line bg-surface">
              {stats.leaderboard.map((entry, index) => (
                <LeaderboardRow
                  key={entry.userId}
                  rank={index + 1}
                  name={displayNameById.get(entry.userId) ?? '?'}
                  entry={entry}
                  meta={`${entry.wins}/${entry.gamesPlayed} gewonnen · ${
                    isRanked ? `gem. plek ${entry.avgTotal}` : `gem. ${entry.avgTotal}`
                  }`}
                  color={colorByUser.get(entry.userId) ?? seriesColor(index)}
                  isFirst={index === 0}
                />
              ))}
            </View>
          </View>

          <HeadToHeadSection stats={stats} displayNameById={displayNameById} />
        </>
      )}
    </View>
  );
}

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
          Voor het laatst gespeeld op{' '}
          {format(new Date(stats.lastPlayedAt), 'd MMMM yyyy', { locale: nl })}
        </Text>
      ) : null}

      <View className="mt-8">
        <SectionLabel>Meest gespeeld</SectionLabel>
        {isPending ? (
          <View className="items-center py-6">
            <ActivityIndicator />
          </View>
        ) : isError || !stats ? (
          <Card tone="muted" className="mt-3">
            <Text className="text-base text-ink-muted">
              De statistieken konden niet worden geladen.
            </Text>
          </Card>
        ) : stats.popularGames.length === 0 ? (
          <Card tone="muted" className="mt-3">
            <Text className="text-base text-ink-muted">
              Zodra jullie potjes hebben gespeeld, zie je hier de populairste spellen van de groep.
            </Text>
          </Card>
        ) : (
          <Card className="mt-3 py-4">
            <BarList
              rows={stats.popularGames.map((game) => ({
                key: game.templateId,
                label: game.name,
                value: game.playCount,
                valueLabel: `${game.playCount}x`,
              }))}
            />
          </Card>
        )}
      </View>

      {stats ? <GameStatsSection groupId={groupId} popularGames={stats.popularGames} /> : null}
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
