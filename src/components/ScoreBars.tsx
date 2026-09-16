import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Text } from '@/components/Text';
import type { ScoreBreakdownLine } from '@/features/sessions/scoring';

export interface ScoreBarRow {
  name: string;
  total: number;
  isWinner: boolean;
  /** Per-field composition of `total`. A row is only tappable open when there's more than one
   *  line here — a single-field template's total already says everything the breakdown would. */
  breakdown?: ScoreBreakdownLine[];
}

function formatSigned(value: number): string {
  return value >= 0 ? `+${value}` : `${value}`;
}

/** Final totals for one session, as horizontal bars in leaderboard order. Tapping a row whose
 *  `breakdown` has more than one line expands it to show how that total is made up field by
 *  field. */
export function ScoreBars({ rows }: { rows: ScoreBarRow[] }) {
  const [openName, setOpenName] = useState<string | null>(null);
  const max = Math.max(1, ...rows.map((row) => Math.abs(row.total)));

  return (
    <View className="gap-3">
      {rows.map((row) => {
        const canExpand = (row.breakdown?.length ?? 0) > 1;
        const isOpen = canExpand && openName === row.name;

        return (
          <View key={row.name}>
            <Pressable
              onPress={
                canExpand
                  ? () => setOpenName((current) => (current === row.name ? null : row.name))
                  : undefined
              }
              accessibilityRole={canExpand ? 'button' : undefined}
              className={canExpand ? 'active:opacity-70' : undefined}
            >
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
            </Pressable>

            {isOpen ? (
              <View className="mt-2 gap-1 rounded-xl bg-surface-sunken px-3 py-2">
                {row.breakdown!.map((line) => (
                  <View key={line.label} className="flex-row items-center justify-between gap-3">
                    <Text className="min-w-0 flex-1 text-sm text-ink-muted" numberOfLines={1}>
                      {line.label}
                    </Text>
                    <Text className="text-sm font-semibold text-ink">{formatSigned(line.value)}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}
