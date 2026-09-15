import { ActivityIndicator, ScrollView, Text, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { Card } from '@/components/Card';
import { BarList } from '@/components/charts/BarList';
import { seriesColor } from '@/components/charts/series';
import { gameColorForTemplate } from '@/features/games/colors';
import { TrendChart } from '@/components/charts/TrendChart';
import { SectionLabel } from '@/components/SectionLabel';
import { StatTile } from '@/components/StatTile';
import { useProfile } from '@/features/auth/hooks/useProfile';
import type { PersonalStats } from '@/features/profile/hooks/usePersonalStats';
import { usePersonalStats } from '@/features/profile/hooks/usePersonalStats';

/** A running win rate only reads as a trend once there are a few sessions behind it; below that
 *  the tiles say the same thing without pretending to a shape. */
const MIN_FORM_POINTS = 3;
/** More than this and the bars say less than the list would. */
const MAX_GAME_BARS = 5;

function PersonalStatsSection({ stats }: { stats: PersonalStats }) {
  if (stats.sessionsPlayed === 0) {
    return (
      <Card tone="muted" className="mt-3">
        <Text className="text-base text-ink-muted">
          Je persoonlijke statistieken verschijnen hier zodra je spellen hebt gespeeld.
        </Text>
      </Card>
    );
  }

  const gameBars = stats.gameRecords.slice(0, MAX_GAME_BARS);

  return (
    <View>
      <View className="mt-3 flex-row gap-3">
        <StatTile value={stats.sessionsPlayed} label="Potjes" />
        <StatTile value={stats.wins} label="Gewonnen" />
        <StatTile value={stats.winPct} unit="%" label="Winst" />
      </View>

      {stats.form.points.length >= MIN_FORM_POINTS ? (
        <View className="mt-8">
          <SectionLabel>Vorm</SectionLabel>
          <Text className="mt-1 text-sm text-ink-muted">
            Je winstpercentage over al je potjes, bijgewerkt na elk potje.
          </Text>
          <Card className="mt-3">
            <TrendChart
              labels={stats.form.labels}
              domain={[0, 100]}
              series={[
                { name: 'Winstpercentage', color: seriesColor(0), points: stats.form.points },
              ]}
            />
          </Card>
        </View>
      ) : null}

      {gameBars.length > 0 ? (
        <View className="mt-8">
          <SectionLabel>Sterkste spellen</SectionLabel>
          <Card className="mt-3 py-4">
            {/* Fixed to 100 rather than the best row, so a bar means the same thing here as on any
                other screen: the share of potjes won, not the share of the leader's rate. */}
            <BarList
              max={100}
              rows={gameBars.map((game, index) => ({
                key: game.templateId,
                label: `${game.name} · ${game.wins}/${game.gamesPlayed}`,
                value: game.winPct,
                valueLabel: `${game.winPct}%`,
                color: gameColorForTemplate(game.coverKey, game.name) ?? seriesColor(index),
              }))}
            />
          </Card>
        </View>
      ) : null}
    </View>
  );
}

/**
 * The user's own profile: display name, avatar, and their record across every group they belong
 * to — as opposed to the per-group stats on a group's own dashboard.
 */
export function ProfileScreen() {
  const { data: profile, isPending, isError } = useProfile();
  const { data: stats, isPending: statsPending, isError: statsError } = usePersonalStats();

  if (isPending) {
    return (
      <View className="flex-1 items-center justify-center bg-surface">
        <ActivityIndicator />
      </View>
    );
  }

  if (isError || !profile) {
    return (
      <View className="flex-1 items-center justify-center bg-surface px-6">
        <Text className="text-center text-base text-ink-muted">
          Je profiel kon niet worden geladen.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-surface" contentContainerClassName="px-6 pb-12 pt-6">
      <View className="items-center">
        <Avatar displayName={profile.display_name} avatarUrl={profile.avatar_url} size={96} />
        {/* The avatar field is a placeholder: `profiles.avatar_url` exists in the schema but
            nothing writes it yet, so this always falls back to initials. */}
        <Text className="mt-3 text-sm text-ink-subtle">Profielfoto volgt later</Text>
      </View>

      <View className="mt-8">
        <SectionLabel>Naam</SectionLabel>
        <View className="mt-2 rounded-2xl border border-line bg-surface px-4 py-4">
          <Text className="text-lg text-ink">{profile.display_name}</Text>
        </View>
      </View>

      <View className="mt-8">
        <SectionLabel>Statistieken</SectionLabel>
        {statsPending ? (
          <View className="items-center py-10">
            <ActivityIndicator />
          </View>
        ) : statsError || !stats ? (
          <Card tone="muted" className="mt-3">
            <Text className="text-base text-ink-muted">
              Je statistieken konden niet worden geladen.
            </Text>
          </Card>
        ) : (
          <PersonalStatsSection stats={stats} />
        )}
      </View>
    </ScrollView>
  );
}
