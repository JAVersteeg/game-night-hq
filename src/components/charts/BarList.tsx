import { Text, View } from 'react-native';

export interface BarListRow {
  key: string;
  label: string;
  /** Drives the bar width, relative to the largest row (or `max`). */
  value: number;
  /** What's printed on the right — the value with its unit, e.g. "8x" or "62%". */
  valueLabel: string;
  /** From the series ramp when the rows are players; left off, every bar is the accent colour. */
  color?: string;
}

interface BarListProps {
  rows: BarListRow[];
  /** Fixes the scale, e.g. 100 for percentages, so bars stay comparable between games. */
  max?: number;
}

/** Ranked horizontal bars with a label and a value — the "how do these few things compare" chart,
 *  used for most-played games and per-game win rates. Sibling of `ScoreBars`, which does the same
 *  for the totals of one session. */
export function BarList({ rows, max }: BarListProps) {
  const scale = Math.max(1, max ?? Math.max(...rows.map((row) => Math.abs(row.value)), 1));

  return (
    // -mt-1 cancels the leading text-base's line-height adds above its glyphs, so the visible gap
    // to the card's top padding matches the gap the last bar's flat bottom edge leaves below.
    <View className="-mt-1 gap-3">
      {rows.map((row) => (
        <View key={row.key}>
          <View className="flex-row items-baseline justify-between gap-3">
            <Text className="min-w-0 flex-1 text-base font-medium text-ink" numberOfLines={1}>
              {row.label}
            </Text>
            <Text className="text-base font-bold text-ink">{row.valueLabel}</Text>
          </View>
          <View className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-sunken">
            <View
              className={`h-full rounded-full ${row.color ? '' : 'bg-accent-strong'}`}
              style={{
                // A rounded cap needs a couple of px to render at all, so a non-zero value never
                // shows up as an empty track.
                width: `${row.value === 0 ? 0 : Math.max(2, (Math.abs(row.value) / scale) * 100)}%`,
                // Omit the key entirely when unset — an explicit `undefined` here overrides the
                // bg-accent-strong class color during style merging, leaving the bar unfilled.
                ...(row.color ? { backgroundColor: row.color } : null),
              }}
            />
          </View>
        </View>
      ))}
    </View>
  );
}
