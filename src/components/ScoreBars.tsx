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

function valueColor(value: number): string {
  if (value > 0) return 'text-success-softFg';
  if (value < 0) return 'text-danger-softFg';
  return 'text-ink-subtle';
}

/** How one player's total is made up: a line per field (and bonus), signed and tinted by whether
 *  it added or cost points. */
function Breakdown({ lines }: { lines: ScoreBreakdownLine[] }) {
  return (
    <View className="mt-2.5 overflow-hidden rounded-xl border border-line bg-surface-muted">
      {lines.map((line, index) => (
        <View
          key={line.label}
          className={`flex-row items-center justify-between gap-3 px-3.5 py-2 ${
            index > 0 ? 'border-t border-line' : ''
          }`}
        >
          <Text className="min-w-0 flex-1 text-sm text-ink-muted" numberOfLines={1}>
            {line.label}
          </Text>
          <Text
            className={`text-sm font-semibold ${valueColor(line.value)}`}
            style={{ fontVariant: ['tabular-nums'] }}
          >
            {line.value === 0 ? '0' : formatSigned(line.value)}
          </Text>
        </View>
      ))}
    </View>
  );
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
              accessibilityState={canExpand ? { expanded: isOpen } : undefined}
              className={canExpand ? 'active:opacity-70' : undefined}
            >
              <View className="flex-row items-baseline justify-between gap-3">
                <Text className="min-w-0 flex-1 text-base font-semibold text-ink" numberOfLines={1}>
                  {row.name}
                </Text>
                <View className="flex-row items-baseline gap-1.5">
                  <Text className="text-2xl font-bold tracking-tight text-ink">{row.total}</Text>
                  {canExpand ? (
                    <Text className={`text-xs ${isOpen ? 'text-ink' : 'text-ink-subtle'}`}>
                      {isOpen ? '▴' : '▾'}
                    </Text>
                  ) : null}
                </View>
              </View>
              <View className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-sunken">
                <View
                  className={`h-full ${row.isWinner ? 'bg-success' : 'bg-accent-strong'}`}
                  style={{ width: `${(Math.abs(row.total) / max) * 100}%` }}
                />
              </View>
            </Pressable>

            {isOpen ? <Breakdown lines={row.breakdown!} /> : null}
          </View>
        );
      })}
    </View>
  );
}
