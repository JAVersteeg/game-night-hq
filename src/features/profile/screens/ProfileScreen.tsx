import { useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/Text';

import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { InfoIcon } from '@/components/InfoIcon';
import { seriesColor } from '@/components/charts/series';
import { gameColorForTemplate } from '@/features/games/colors';
import { TrendChart } from '@/components/charts/TrendChart';
import { PencilIcon } from '@/components/PencilIcon';
import { SectionLabel } from '@/components/SectionLabel';
import { StatTile } from '@/components/StatTile';
import { TextField } from '@/components/TextField';
import { theme } from '@/lib/theme';
import type { Profile } from '@/features/auth/hooks/useProfile';
import {
  MAX_DISPLAY_NAME_LENGTH,
  useProfile,
  useSetDisplayName,
} from '@/features/auth/hooks/useProfile';
import type {
  PersonalGameRecord,
  PersonalStats,
} from '@/features/profile/hooks/usePersonalStats';
import {
  MIN_GAMES_FOR_WIN_FACTOR,
  usePersonalStats,
} from '@/features/profile/hooks/usePersonalStats';

/** A running winstfactor only reads as a trend once there are a few sessions behind it; below that
 *  the tiles say the same thing without pretending to a shape. */
const MIN_FORM_POINTS = 3;
/** More than this and the rows say less than the list would. */
const MAX_GAME_BARS = 5;
/** Where pure chance sits on a winstfactor axis — the line the whole metric is read against. */
const CHANCE_WIN_FACTOR = 1;
/** Mid-table on an overwicht track: beating exactly half the people you sit down with. */
const MID_TABLE_BEAT_SHARE = 50;

/** Dutch decimals, since every number in this app gets read out loud at the table. */
function decimal(value: number): string {
  return value.toFixed(1).replace('.', ',');
}

/**
 * One game's record: the winstfactor as the headline number, and overwicht as the track under it.
 *
 * Splitting them that way is deliberate. Overwicht has a fixed, absolute scale — 0 to 100, with 50
 * meaning mid-table — so it can be drawn as a bar that means the same thing on every row and on
 * every screen, with a tick marking the halfway point. Winstfactor has no natural ceiling, so as a
 * bar it could only ever be "relative to your own best game"; as a number it says exactly what it
 * means. Together one row answers both "how often do I win here" and "and when I don't, am I near
 * the top or the bottom".
 */
function GameRecordRow({ game, color }: { game: PersonalGameRecord; color: string }) {
  return (
    <View>
      <View className="flex-row items-baseline justify-between gap-3">
        <Text className="min-w-0 flex-1 text-base font-medium text-ink" numberOfLines={1}>
          {game.name}
        </Text>
        <Text
          className={`text-base font-bold ${game.isWinFactorWeak ? 'text-ink-subtle' : 'text-ink'}`}
        >
          {decimal(game.winFactor)}×
        </Text>
      </View>

      <View className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-sunken">
        <View
          className="h-full rounded-full"
          style={{
            // A rounded cap needs a couple of px to render at all, so a non-zero overwicht never
            // shows up as an empty track.
            width: `${game.beatShare === 0 ? 0 : Math.max(2, game.beatShare)}%`,
            backgroundColor: color,
          }}
        />
        {/* The halfway tick, drawn over the fill: without it a 46% and a 62% track look like the
            same "somewhere in the middle", when one is below the table and the other above. */}
        <View
          className="absolute top-0 h-full w-px bg-surface"
          style={{ left: `${MID_TABLE_BEAT_SHARE}%` }}
        />
      </View>

      <Text className="mt-1.5 text-xs font-medium text-ink-subtle">
        {game.wins} van {game.gamesPlayed} gewonnen · {game.beatShare}% overwicht
      </Text>
    </View>
  );
}

/** The metrics this screen ranks on, explained together — like the group dashboard's ranglijst,
 *  they're only really understood next to each other. */
const METRIC_EXPLANATIONS = [
  {
    label: 'Winstfactor',
    text: `Hoe vaak je wint vergeleken met wat puur toeval zou opleveren bij de tafelgroottes waaraan je speelde; 1,0× is toeval. Zo telt een winst aan een tafel van zes zwaarder dan één tegen één. Let op: onder de ${MIN_GAMES_FOR_WIN_FACTOR} potjes zegt dit getal nog weinig, één avond kan het al bijna verdubbelen.`,
  },
  {
    label: 'Overwicht',
    text: 'Het deel van de tafel dat je gemiddeld verslaat, ongeacht hoe groot die tafel was. 50% is precies middenmoot: je eindigt net zo vaak boven als onder de rest.',
  },
];

/** The "Statistieken" heading with the one info affordance for the whole section — the same
 *  pressable-label-plus-`InfoIcon` pattern as the ranglijst on the group dashboard. */
function StatsHeader({ open, onToggle }: { open: boolean; onToggle: () => void }) {
  return (
    <Pressable
      onPress={onToggle}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel="Uitleg over je statistieken"
      accessibilityState={{ expanded: open }}
      className="flex-row items-center gap-2 self-start active:opacity-60"
    >
      <SectionLabel>Statistieken</SectionLabel>
      <InfoIcon size={16} color={open ? theme.ink : theme.inkSubtle} />
    </Pressable>
  );
}

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
        <StatTile value={decimal(stats.winFactor)} unit="×" label="Winstfactor" />
      </View>

      {stats.isWinFactorWeak ? (
        <Text className="mt-2 text-sm text-ink-subtle">
          Onder de {MIN_GAMES_FOR_WIN_FACTOR} potjes zegt je winstfactor nog weinig — één avond kan
          hem al bijna verdubbelen.
        </Text>
      ) : null}

      {stats.form.points.length >= MIN_FORM_POINTS ? (
        <View className="mt-6">
          <SectionLabel>Vorm</SectionLabel>
          <Card className="mt-3">
            {/* No fixed domain: a winstfactor has no ceiling, so the axis follows the line and the
                dashed reference keeps "toeval" in view wherever it lands. */}
            <TrendChart
              labels={stats.form.labels}
              reference={{ value: CHANCE_WIN_FACTOR, label: 'toeval' }}
              series={[{ name: 'Winstfactor', color: seriesColor(0), points: stats.form.points }]}
            />
          </Card>
        </View>
      ) : null}

      {gameBars.length > 0 ? (
        <View className="mt-6">
          <SectionLabel>Sterkste spellen</SectionLabel>
          <Text className="mt-1 text-sm text-ink-muted">
            Je winstfactor per spel. De balk is je overwicht, met het streepje op middenmoot.
          </Text>
          <Card className="mt-3 py-4">
            <View className="-mt-1 gap-4">
              {gameBars.map((game, index) => (
                <GameRecordRow
                  key={game.templateId}
                  game={game}
                  color={gameColorForTemplate(game.coverKey, game.name) ?? seriesColor(index)}
                />
              ))}
            </View>
          </Card>
        </View>
      ) : null}
    </View>
  );
}

/**
 * The name row, which doubles as its own editor: reading it is the common case, so the field only
 * appears once the pencil is tapped. Cancelling restores whatever the profile currently says, so a
 * half-typed name never sticks around.
 */
function DisplayNameSection({ profile }: { profile: Profile }) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(profile.display_name);
  const setDisplayName = useSetDisplayName();

  const trimmed = draft.trim();
  const canSave = trimmed.length > 0 && !setDisplayName.isPending;

  function startEditing() {
    setDraft(profile.display_name);
    setDisplayName.reset();
    setIsEditing(true);
  }

  function cancelEditing() {
    setDisplayName.reset();
    setIsEditing(false);
  }

  function handleSave() {
    if (!canSave) return;
    if (trimmed === profile.display_name) {
      setIsEditing(false);
      return;
    }
    setDisplayName.mutate(trimmed, { onSuccess: () => setIsEditing(false) });
  }

  if (!isEditing) {
    return (
      <View>
        <SectionLabel>Naam</SectionLabel>
        <View className="mt-2 flex-row items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-4">
          <Text className="flex-1 text-lg text-ink">{profile.display_name}</Text>
          <Pressable
            onPress={startEditing}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Naam wijzigen"
            className="active:opacity-70"
            testID="edit-display-name-button"
          >
            <PencilIcon size={20} color={theme.ink} />
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View>
      <TextField
        label="Naam"
        value={draft}
        onChangeText={setDraft}
        placeholder="Je naam"
        maxLength={MAX_DISPLAY_NAME_LENGTH}
        autoFocus
        returnKeyType="done"
        onSubmitEditing={handleSave}
        error={
          setDisplayName.isError
            ? 'Je naam kon niet worden opgeslagen. Controleer je verbinding en probeer het opnieuw.'
            : undefined
        }
        testID="display-name-input"
      />

      <View className="mt-4 flex-row gap-3">
        <View className="flex-1">
          <Button label="Annuleren" variant="ghost" onPress={cancelEditing} />
        </View>
        <View className="flex-1">
          <Button
            label="Opslaan"
            onPress={handleSave}
            disabled={!canSave}
            isLoading={setDisplayName.isPending}
            testID="save-display-name-button"
          />
        </View>
      </View>
    </View>
  );
}

/**
 * The user's own profile: display name, avatar, and their record across every group they belong
 * to — as opposed to the per-group stats on a group's own dashboard.
 */
export function ProfileScreen() {
  // Edge-to-edge on Android: the last row would otherwise sit behind the navigation bar.
  const insets = useSafeAreaInsets();
  const { data: profile, isPending, isError } = useProfile();
  const { data: stats, isPending: statsPending, isError: statsError } = usePersonalStats();
  const [infoOpen, setInfoOpen] = useState(false);

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
    <KeyboardAwareScrollView
      className="flex-1 bg-surface"
      contentContainerClassName="px-6 pt-6"
      contentContainerStyle={{ paddingBottom: 48 + insets.bottom }}
      bottomOffset={24}
      keyboardShouldPersistTaps="handled"
    >
      <View className="items-center">
        {/* `profiles.avatar_url` exists in the schema but nothing writes it yet, so this always
            falls back to initials. */}
        <Avatar displayName={profile.display_name} avatarUrl={profile.avatar_url} size={96} />
      </View>

      <View className="mt-6">
        <DisplayNameSection profile={profile} />
      </View>

      <View className="mt-6">
        <StatsHeader open={infoOpen} onToggle={() => setInfoOpen((current) => !current)} />

        {infoOpen ? (
          <Card tone="muted" className="mt-3 gap-3">
            {METRIC_EXPLANATIONS.map((metric) => (
              <Text key={metric.label} className="text-sm leading-5 text-ink-muted">
                <Text className="font-semibold text-ink">{metric.label}. </Text>
                {metric.text}
              </Text>
            ))}
          </Card>
        ) : null}

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
    </KeyboardAwareScrollView>
  );
}
