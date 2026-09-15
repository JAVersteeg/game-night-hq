import { seriesColors } from '@/lib/theme';

/** Colour for the nth series. Wraps after six, which only happens on a chart that ignored the
 *  design system's "six lines maximum" rule — every caller here caps below that.
 *
 *  For a per-player chart, prefer each member's own chosen colour (`group_members.color`, via
 *  `getPlayerColor` in `@/lib/playerColors`) so a player is the same colour on every screen. This
 *  index-based ramp is only for series that aren't a player — game bars, or a fallback for a userId
 *  the group's current member list doesn't have. */
export function seriesColor(index: number): string {
  return seriesColors[index % seriesColors.length];
}
