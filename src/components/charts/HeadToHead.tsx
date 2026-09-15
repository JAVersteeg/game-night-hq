import { Text, View } from 'react-native';

import { seriesColor } from '@/components/charts/series';
import { theme } from '@/lib/theme';

interface HeadToHeadProps {
  left: string;
  right: string;
  leftWins: number;
  rightWins: number;
  /** Sessions the two tied on — nothing breaks ties, so both count as winners. */
  draws: number;
}

/** Head-to-head record between two players: the raw counts over one bar split by wins. Left is
 *  always the first series colour and right the second — never coloured by who is ahead. */
export function HeadToHead({ left, right, leftWins, rightWins, draws }: HeadToHeadProps) {
  const total = Math.max(1, leftWins + rightWins + draws);
  const percent = (count: number): `${number}%` => `${(count / total) * 100}%`;

  return (
    <View>
      <View className="flex-row items-end justify-between gap-3">
        <View className="min-w-0 flex-1">
          <Text className="text-2xl font-bold tracking-tight text-ink">{leftWins}</Text>
          <Text className="text-sm font-medium text-ink-muted" numberOfLines={1}>
            {left}
          </Text>
        </View>
        <Text className="pb-1 text-sm font-medium text-ink-muted">
          {draws > 0 ? `${draws} gelijk` : 'onderling'}
        </Text>
        <View className="min-w-0 flex-1 items-end">
          <Text className="text-2xl font-bold tracking-tight text-ink">{rightWins}</Text>
          <Text className="text-sm font-medium text-ink-muted" numberOfLines={1}>
            {right}
          </Text>
        </View>
      </View>

      <View className="mt-3 h-2.5 flex-row gap-0.5 overflow-hidden rounded-full bg-surface-sunken">
        <View style={{ width: percent(leftWins), backgroundColor: seriesColor(0) }} />
        {draws > 0 ? (
          <View style={{ width: percent(draws), backgroundColor: theme.inkFaint }} />
        ) : null}
        <View style={{ width: percent(rightWins), backgroundColor: seriesColor(1) }} />
      </View>
    </View>
  );
}
