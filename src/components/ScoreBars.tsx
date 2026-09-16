import { View } from 'react-native';
import { Text } from '@/components/Text';

export interface ScoreBarRow {
  name: string;
  total: number;
  isWinner: boolean;
}

/** Final totals for one session, as horizontal bars in leaderboard order. */
export function ScoreBars({ rows }: { rows: ScoreBarRow[] }) {
  const max = Math.max(1, ...rows.map((row) => Math.abs(row.total)));

  return (
    <View className="gap-3">
      {rows.map((row) => (
        <View key={row.name}>
          <View className="flex-row items-baseline justify-between gap-3">
            <Text className="min-w-0 flex-1 text-base font-semibold text-ink" numberOfLines={1}>
              {row.name}
            </Text>
            <Text className="text-lg font-bold text-ink">{row.total}</Text>
          </View>
          <View className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-sunken">
            <View
              className={`h-full ${row.isWinner ? 'bg-success' : 'bg-accent-strong'}`}
              style={{ width: `${(Math.abs(row.total) / max) * 100}%` }}
            />
          </View>
        </View>
      ))}
    </View>
  );
}
