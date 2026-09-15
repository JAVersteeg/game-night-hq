import { seriesColors } from '@/lib/theme';

/** Colour for the nth series. Wraps after six, which only happens on a chart that ignored the
 *  design system's "six lines maximum" rule — every caller here caps below that. */
export function seriesColor(index: number): string {
  return seriesColors[index % seriesColors.length];
}

/**
 * user id → colour, assigned in the order given. Pass the same order everywhere on a screen
 * (group-member order, or the chart's own ranking) and a player keeps one colour across every
 * chart on it, which is the whole point of the fixed series ramp.
 */
export function seriesColorByUser(userIds: string[]): Map<string, string> {
  return new Map(userIds.map((userId, index) => [userId, seriesColor(index)]));
}
