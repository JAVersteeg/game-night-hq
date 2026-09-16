import type { RouteProp } from '@react-navigation/native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { useLayoutEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';
import { Text } from '@/components/Text';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { BarList } from '@/components/charts/BarList';
import { DivergingBar, TICK_HEIGHT, TRACK_HEIGHT } from '@/components/charts/DivergingBar';
import { seriesColor } from '@/components/charts/series';
import { TrendChart } from '@/components/charts/TrendChart';
import { ColorPickerModal } from '@/components/ColorPickerModal';
import { CoverThumbnail } from '@/components/CoverThumbnail';
import { EmptyState } from '@/components/EmptyState';
import { GearIcon } from '@/components/GearIcon';
import { InfoIcon } from '@/components/InfoIcon';
import { SectionLabel } from '@/components/SectionLabel';
import { SegmentedControl } from '@/components/SegmentedControl';
import { StatTile } from '@/components/StatTile';
import { useAuth } from '@/features/auth/context/AuthContext';
import {
  gameColorForTemplate,
  gamePaletteForTemplate,
  type GamePalette,
} from '@/features/games/colors';
import { coverImageForTemplate } from '@/features/games/covers';

import type { GameStats, LeaderboardEntry } from '@/features/games/hooks/useGameStats';
import { useGameStats } from '@/features/games/hooks/useGameStats';
import type { ScoringDirection } from '@/features/games/hooks/useGameTemplates';
import { useGameTemplate, useGameTemplates } from '@/features/games/hooks/useGameTemplates';
import {
  useGroupDashboardStats,
  type PopularGame,
} from '@/features/groups/hooks/useGroupDashboardStats';
import {
  colorErrorMessage,
  useGroupMembers,
  useSetMemberColor,
  type PlayerColor,
} from '@/features/groups/hooks/useGroupMembers';
import { useGroup } from '@/features/groups/hooks/useGroups';
import { useSessionHistory } from '@/features/sessions/hooks/useSessionHistory';
import { getPlayerColor } from '@/lib/playerColors';
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
      <CoverThumbnail
        source={coverImageForTemplate(coverKey, name)}
        color={gameColorForTemplate(coverKey, name)}
        size={56}
      />
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
      <CoverThumbnail
        source={coverImageForTemplate(coverKey, gameName)}
        color={gameColorForTemplate(coverKey, gameName)}
        size={40}
      />
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

/** `palette` is the game's own colour ramp (`gamePaletteForTemplate`) — left off for the metric
 *  chips, which aren't games and keep the generic accent tint. Selected fills with the muted
 *  `soft` step and edges in the brighter `line`, so fill and border never collapse into one flat
 *  block; unselected keeps the line and labels in `swatch` so a game stays identifiable in the row
 *  before you tap it. A game with no assigned colour falls back to the same generic accent look as
 *  the metric chips. */
function Chip({
  label,
  selected,
  onPress,
  palette,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  palette?: GamePalette;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      className={`rounded-full border px-3.5 py-2 ${palette ? '' : selected ? 'border-accent-line bg-accent-soft' : 'border-line bg-surface'}`}
      style={
        palette
          ? {
              borderColor: palette.line,
              backgroundColor: selected ? palette.soft : 'transparent',
            }
          : undefined
      }
    >
      <Text
        className={`text-sm font-semibold ${palette ? '' : selected ? 'text-accent-softFg' : 'text-ink-muted'}`}
        style={palette ? { color: selected ? palette.softFg : palette.swatch } : undefined}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

/** Dutch decimals, since every number on this screen is read out loud at the table. */
function decimal(value: number): string {
  return value.toFixed(1).replace('.', ',');
}

/** Below this, Winstfactor swings so hard on a single evening that it says more about the sample
 *  than the player — the rows are dimmed and the explanation says why. */
const MIN_GAMES_FOR_WIN_FACTOR = 10;

type MetricKey = 'overwicht' | 'winstfactor' | 'puntensaldo';

/** How far a saldo of the largest size in the list reaches from the centre: 1.5× the biggest
 *  absolute saldo is the full half-track, so the leader fills two thirds of their side and there's
 *  headroom left for a bigger night later. */
const SALDO_HEADROOM = 1.5;

type BarSpec =
  /** 0-100, growing from the left edge. */
  | { kind: 'fill'; width: number }
  /** -100..100, growing left or right from a zero in the middle. */
  | { kind: 'diverging'; offset: number };

/** The scale a bar is drawn against, derived from the whole list rather than one row. */
interface BarScale {
  /** Largest value in the list. */
  best: number;
  /** Largest absolute value in the list — what a diverging bar is normalised against. */
  maxAbs: number;
}

/** What the game's scoring direction means for a metric — only Puntensaldo cares, since it's the
 *  one metric whose raw number doesn't already have "better" baked into it. */
interface MetricContext {
  /** Lowest total wins, so a saldo below the table average is the good end of the scale. */
  lowerIsBetter: boolean;
}

interface MetricDefinition {
  key: MetricKey;
  label: string;
  /** One or two lines, shown when the section's info icon is tapped. */
  explanation: (context: MetricContext) => string;
  format: (entry: LeaderboardEntry) => string;
  bar: (entry: LeaderboardEntry, scale: BarScale) => BarSpec;
  /** Higher sorts first, so a metric where lower is better negates here rather than making every
   *  caller special-case the comparator. */
  sortValue: (entry: LeaderboardEntry, context: MetricContext) => number;
  /** Greys the number out where the metric can't be trusted yet. */
  isWeak?: (entry: LeaderboardEntry) => boolean;
}

const METRICS: MetricDefinition[] = [
  {
    key: 'overwicht',
    label: 'Overwicht',
    explanation: () =>
      'Het deel van de tafel dat je gemiddeld verslaat, ongeacht hoe groot die tafel was. 50% is precies middenmoot.',
    format: (entry) => `${entry.beatShare}%`,
    bar: (entry) => ({ kind: 'fill', width: entry.beatShare }),
    sortValue: (entry) => entry.beatShare,
  },
  {
    key: 'winstfactor',
    label: 'Winstfactor',
    explanation: () =>
      'Hoe vaak je wint vergeleken met wat puur toeval zou opleveren bij deze tafelgroottes; 1,0× is toeval. Let op: onder de 10 potjes zegt dit getal nog weinig, één avond kan het al bijna verdubbelen.',
    format: (entry) => `${decimal(entry.winFactor)}×`,
    bar: (entry, scale) => ({
      kind: 'fill',
      width: scale.best === 0 ? 0 : (entry.winFactor / scale.best) * 100,
    }),
    sortValue: (entry) => entry.winFactor,
    isWeak: (entry) => entry.gamesPlayed < MIN_GAMES_FOR_WIN_FACTOR,
  },
  {
    key: 'puntensaldo',
    label: 'Puntensaldo',
    explanation: (context) =>
      `Je punten ten opzichte van het tafelgemiddelde, gemiddeld over al je potjes. ${
        context.lowerIsBetter
          ? 'Bij dit spel wint de laagste score, dus hoe lager je saldo, hoe beter.'
          : 'Hoe hoger je saldo, hoe beter.'
      }`,
    format: (entry) => `${entry.pointDiff > 0 ? '+' : ''}${decimal(entry.pointDiff)}`,
    // A saldo runs either side of zero, so it gets the diverging bar: zero in the middle, and the
    // fill reading as "above" or "below the table" without having to parse the sign first.
    bar: (entry, scale) => ({
      kind: 'diverging',
      offset: scale.maxAbs === 0 ? 0 : (entry.pointDiff / (scale.maxAbs * SALDO_HEADROOM)) * 100,
    }),
    // Ranked highest-first like every other metric, so in a lowest-wins game the sign flips and
    // -2,1 lands above +0,4 — the order the table itself would put them in.
    sortValue: (entry, context) => (context.lowerIsBetter ? -entry.pointDiff : entry.pointDiff),
  },
];

function LeaderboardRow({
  rank,
  name,
  meta,
  value,
  isWeak,
  bar,
  color,
  isFirst,
}: {
  rank: number;
  name: string;
  meta: string;
  value: string;
  isWeak: boolean;
  bar: BarSpec;
  color: string;
  isFirst: boolean;
}) {
  // DivergingBar's own layout footprint (TICK_HEIGHT) is taller than its visible track
  // (TRACK_HEIGHT), to leave its centre tick room to stand proud on both ends. Pulled in on top and
  // bottom here so the track lines up with where the plain fill bar's track would sit. A couple
  // extra pixels come off the bottom specifically — the faint tick still reads as part of the bar,
  // so an even top/bottom split left the padding underneath it looking a touch taller than the
  // padding under the other two metrics' bars.
  const divergingBarHalfOffset = (TICK_HEIGHT - TRACK_HEIGHT) / 2;
  const divergingBarTopOffset = -divergingBarHalfOffset;
  const divergingBarBottomOffset = -(divergingBarHalfOffset + 1);

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
        <Text className={`text-lg font-bold ${isWeak ? 'text-ink-faint' : 'text-ink'}`}>
          {value}
        </Text>
      </View>
      {/* The bar repeats the number rather than adding one: it's there so the gap between first
          and fifth is visible without reading five figures. */}
      {bar.kind === 'diverging' ? (
        <View style={{ marginTop: divergingBarTopOffset, marginBottom: divergingBarBottomOffset }}>
          <DivergingBar offset={bar.offset} color={color} />
        </View>
      ) : (
        <View className="h-1.5 overflow-hidden rounded-full bg-surface-sunken">
          <View
            className="h-full rounded-full"
            style={{ width: `${Math.max(0, Math.min(100, bar.width))}%`, backgroundColor: color }}
          />
        </View>
      )}
    </View>
  );
}

/** The "Ranglijst" heading with the one info affordance for the whole section: tapping it explains
 *  all three metrics at once, since they're only really understood next to each other. */
function LeaderboardHeader({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <Pressable
      onPress={onToggle}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel="Uitleg over de ranglijstcijfers"
      accessibilityState={{ expanded: open }}
      className="flex-row items-center gap-2 self-start active:opacity-60"
    >
      <SectionLabel>Ranglijst</SectionLabel>
      <InfoIcon size={16} color={open ? theme.ink : theme.inkSubtle} />
    </Pressable>
  );
}

/** Per-player ranking for one game, by whichever of the three metrics is selected. One metric at a
 *  time rather than a column per metric: three numbers plus a name don't fit at phone width
 *  without shrinking all of them past reading size. */
function LeaderboardSection({
  stats,
  scoringDirection,
  rounds,
  displayNameById,
  colorByUser,
}: {
  stats: GameStats;
  scoringDirection: ScoringDirection;
  rounds: boolean;
  displayNameById: Map<string, string>;
  colorByUser: Map<string, string>;
}) {
  const [metricKey, setMetricKey] = useState<MetricKey>('overwicht');
  const [infoOpen, setInfoOpen] = useState(false);

  // A rounds game's totals are normalised to points per round by `useGameStats`, so a saldo against
  // the table average still means something — but an average of those per-round points next to the
  // win count would read as a score, which it isn't, so the meta line leaves it out.
  const isRounds = rounds;
  // A plain ranked template records a finish position, not points, so there's no table average to
  // have a saldo against. A ranked-and-rounds template (Dalmuti) accumulates real points instead —
  // same as a field-based rounds game — so it keeps puntensaldo.
  const isRanked = scoringDirection === 'ranked' && !isRounds;
  const context: MetricContext = { lowerIsBetter: scoringDirection === 'lowest_total_wins' };

  // Ranked games record a finish position, not points, so there is no table average to have a
  // saldo against — it drops out of the chips and out of the explanation with it.
  const metrics = METRICS.filter((metric) => !(isRanked && metric.key === 'puntensaldo'));
  const metric = metrics.find((entry) => entry.key === metricKey) ?? metrics[0];

  const rows = [...stats.leaderboard].sort(
    (a, b) =>
      metric.sortValue(b, context) - metric.sortValue(a, context) || b.gamesPlayed - a.gamesPlayed,
  );
  const values = rows.map((entry) => metric.sortValue(entry, context));
  const scale: BarScale = {
    best: Math.max(...values, 0),
    maxAbs: Math.max(...values.map(Math.abs), 0),
  };

  return (
    <View className="mt-8">
      <LeaderboardHeader open={infoOpen} onToggle={() => setInfoOpen((current) => !current)} />

      {infoOpen ? (
        <Card tone="muted" className="mt-3 gap-3">
          {metrics.map((entry) => (
            <Text key={entry.key} className="text-sm leading-5 text-ink-muted">
              <Text className="font-semibold text-ink">{entry.label}. </Text>
              {entry.explanation(context)}
            </Text>
          ))}
        </Card>
      ) : null}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="mt-3"
        contentContainerClassName="gap-2"
      >
        {metrics.map((entry) => (
          <Chip
            key={entry.key}
            label={entry.label}
            selected={entry.key === metric.key}
            onPress={() => setMetricKey(entry.key)}
          />
        ))}
      </ScrollView>

      <View className="mt-3 overflow-hidden rounded-2xl border border-line bg-surface">
        {rows.map((entry, index) => (
          <LeaderboardRow
            key={entry.userId}
            rank={index + 1}
            name={displayNameById.get(entry.userId) ?? '?'}
            meta={
              isRounds
                ? `${entry.wins}/${entry.gamesPlayed} gewonnen`
                : `${entry.wins}/${entry.gamesPlayed} gewonnen · ${
                    isRanked
                      ? `gem. plek ${decimal(entry.avgTotal)}`
                      : `gem. ${decimal(entry.avgTotal)}`
                  }`
            }
            value={metric.format(entry)}
            isWeak={metric.isWeak?.(entry) ?? false}
            bar={metric.bar(entry, scale)}
            color={colorByUser.get(entry.userId) ?? seriesColor(index)}
            isFirst={index === 0}
          />
        ))}
      </View>
    </View>
  );
}

/** Score trend and ranglijst for one game template, with chips to pick which of the group's played
 *  games they describe. Only offers templates that have actually been played — `popularGames` is
 *  already filtered and capped that way. */
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
  // flipped and pinned to the real range of places instead of a padded one. `useGameStats` already
  // converts a ranked-and-rounds template's (Dalmuti) points into a finish rank for the trend, so
  // this applies the same way regardless of rounds.
  const isRanked = template?.scoring_direction === 'ranked';
  const isRounds = template?.rounds ?? false;
  // Each player's own chosen colour (group settings → Leden), not an arbitrary per-chart ramp —
  // so a player is the same colour here as their avatar everywhere else, and a colour change shows
  // up the moment `members` refetches. Falls back to the old index-based ramp for a userId this
  // group's current member list doesn't have (a departed member still present in past sessions).
  const colorByUser = new Map(
    (members ?? []).map((member) => [member.userId, getPlayerColor(member.color).swatch]),
  );

  return (
    <View className="mt-8 border-t border-line pt-6">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="gap-2"
      >
        {popularGames.map((game) => (
          <Chip
            key={game.templateId}
            label={game.name === 'De Grote Dalmuti' ? 'Dalmuti' : game.name}
            selected={game.templateId === templateId}
            onPress={() => setSelectedTemplateId(game.templateId)}
            palette={gamePaletteForTemplate(game.coverKey, game.name)}
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
            <SectionLabel>
              {isRanked ? 'Plek per potje' : isRounds ? 'Punten per ronde' : 'Scoreverloop'}
            </SectionLabel>
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

          <LeaderboardSection
            stats={stats}
            scoringDirection={template.scoring_direction}
            rounds={template.rounds}
            displayNameById={displayNameById}
            colorByUser={colorByUser}
          />
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

      <View className="mt-4">
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
                color: gameColorForTemplate(game.coverKey, game.name),
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
  const { groupId, justJoined } = useRoute<RouteProp<AppStackParamList, 'GroupDashboard'>>().params;
  const navigation = useNavigation<Navigation>();
  const { session } = useAuth();
  const { data: group } = useGroup(groupId);
  const [tab, setTab] = useState<Tab>('Spellen');

  // Only relevant right after JoinGroupScreen sets `justJoined` — `join_group_by_code` already
  // auto-assigned a colour so joining itself never blocked on a picker, but a new member should get
  // an immediate, obvious chance to swap it for one they'd rather have.
  const [colorModalOpen, setColorModalOpen] = useState(justJoined === true);
  const { data: members } = useGroupMembers(groupId);
  const setColor = useSetMemberColor(groupId);
  const me = members?.find((member) => member.userId === session?.user.id);

  function closeColorModal() {
    setColorModalOpen(false);
    setColor.reset();
  }

  function handleSelectColor(color: PlayerColor) {
    setColor.mutate(color, { onSuccess: closeColorModal });
  }

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
      <View className="px-6 pt-2">
        <SegmentedControl options={TABS} value={tab} onChange={setTab} />
      </View>
      {tab === 'Spellen' ? (
        <GamesTab groupId={groupId} />
      ) : tab === 'Geschiedenis' ? (
        <HistoryTab groupId={groupId} />
      ) : (
        <StatsTab groupId={groupId} />
      )}

      {me ? (
        <ColorPickerModal
          visible={colorModalOpen}
          title="Welkom! Kies je kleur"
          description="Je hebt automatisch een kleur gekregen — kies hieronder een andere als je liever een andere hebt."
          currentColor={me.color}
          takenColors={
            new Set(
              (members ?? [])
                .filter((member) => member.userId !== me.userId)
                .map((member) => member.color),
            )
          }
          isPending={setColor.isPending}
          errorMessage={setColor.isError ? colorErrorMessage(setColor.error) : null}
          onSelect={handleSelectColor}
          onClose={closeColorModal}
        />
      ) : null}
    </SafeAreaView>
  );
}
