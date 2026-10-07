import { useState, type ComponentType } from 'react';
import { Pressable, View } from 'react-native';
import { Text } from '@/components/Text';
import { TrophyIcon } from '@/components/TrophyIcon';
import type { ScoreBreakdownLine } from '@/features/sessions/scoring';
import { theme } from '@/lib/theme';

export interface ScoreBarRow {
  name: string;
  total: number;
  isWinner: boolean;
  /** Per-field composition of `total`. A row is only tappable open when there's more than one
   *  line here — a single-field template's total already says everything the breakdown would. */
  breakdown?: ScoreBreakdownLine[];
  /** Score per field key, read by `columns`. */
  values?: Record<string, number>;
}

/** A score field shown as its own column, headed by an icon (`label` is for screen readers). */
export interface ScoreColumn {
  key: string;
  label: string;
  Icon: ComponentType<{ size?: number; color: string }>;
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

function Bar({ row, max }: { row: ScoreBarRow; max: number }) {
  return (
    <View className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface-sunken">
      <View
        className={`h-full ${row.isWinner ? 'bg-success' : 'bg-accent-strong'}`}
        style={{ width: `${(Math.abs(row.total) / max) * 100}%` }}
      />
    </View>
  );
}

/**
 * Final totals for one session, as horizontal bars in leaderboard order.
 *
 * With `columns`, every row also shows those fields side by side under an icon header, so how a
 * total is made up is visible at a glance and nothing needs expanding. Without them, tapping a row
 * whose `breakdown` has more than one line expands it field by field.
 */
export function ScoreBars({ rows, columns }: { rows: ScoreBarRow[]; columns?: ScoreColumn[] }) {
  const [openName, setOpenName] = useState<string | null>(null);
  const max = Math.max(1, ...rows.map((row) => Math.abs(row.total)));

  if (columns) {
    return (
      <View className="gap-3">
        <View className="flex-row items-end">
          <View className="flex-1" />
          {columns.map(({ key, label, Icon }) => (
            <View key={key} className="w-8 items-center" accessibilityLabel={label}>
              <Icon size={18} color={theme.inkSubtle} />
            </View>
          ))}
          <View className="w-12 items-center" accessibilityLabel="Totaal">
            <TrophyIcon size={18} color={theme.inkSubtle} />
          </View>
        </View>
        {rows.map((row) => (
          <View key={row.name}>
            <View className="flex-row items-baseline">
              <Text className="min-w-0 flex-1 text-base font-semibold text-ink" numberOfLines={1}>
                {row.name}
              </Text>
              {columns.map(({ key }) => {
                const value = row.values?.[key] ?? 0;
                return (
                  <Text
                    key={key}
                    className="w-8 text-center text-base text-ink-muted"
                    style={{ fontVariant: ['tabular-nums'] }}
                  >
                    {value === 0 ? '' : value}
                  </Text>
                );
              })}
              <Text className="w-12 text-center text-2xl font-bold tracking-tight text-ink">
                {row.total}
              </Text>
            </View>
            <Bar row={row} max={max} />
          </View>
        ))}
      </View>
    );
  }

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
              <Bar row={row} max={max} />
            </Pressable>

            {isOpen ? <Breakdown lines={row.breakdown!} /> : null}
          </View>
        );
      })}
    </View>
  );
}
