import Svg, { Path, Rect } from 'react-native-svg';

import type { ScoreColumn } from '@/components/ScoreBars';
import {
  BUILDING_POINTS_FIELD,
  DEV_CARDS_FIELD,
  LARGEST_ARMY_FIELD,
  LONGEST_ROAD_FIELD,
} from '@/features/boardScan/catan';

/**
 * Column headers of the board's players table, stroke-only like `TrophyIcon` and `GearIcon` — a
 * handful of glyphs isn't worth an icon library.
 */
interface IconProps {
  size?: number;
  color: string;
}

/** Building points: a settlement. */
export function SettlementIcon({ size = 20, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5 11.5 12 5l7 6.5V20H5v-8.5zM10 20v-5h4v5"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** The longest trade route: a road piece, lying at an angle as on the board. */
export function RoadIcon({ size = 20, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect
        x={3}
        y={9.5}
        width={18}
        height={5}
        rx={1.5}
        stroke={color}
        strokeWidth={2}
        transform="rotate(-30 12 12)"
      />
    </Svg>
  );
}

/** One pawn (head, body, base), its base centred at (x, y) and `s` times the full size. */
function pawn(x: number, y: number, s: number): string {
  const r = 2.2 * s; // head
  const w = 2.6 * s; // half the body's width at the base
  const h = 6.5 * s; // body height
  const top = y - h;
  return [
    `M${x - r} ${top - r}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`,
    `M${x - w * 0.55} ${top + 0.6 * s}L${x - w} ${y}h${2 * w}L${x + w * 0.55} ${top + 0.6 * s}`,
  ].join('');
}

/** The largest army: three robber-like pawns in a V, the front one leading. */
export function ArmyIcon({ size = 20, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d={pawn(5, 16, 0.75) + pawn(19, 16, 0.75) + pawn(12, 22, 0.9)}
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Points from development cards: an upright card with a cup — a victory-point card. */
export function DevCardIcon({ size = 20, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x={5.5} y={3} width={13} height={18} rx={2} stroke={color} strokeWidth={2} />
      <Path
        d="M9 7.5h6v2.5a3 3 0 0 1-6 0V7.5zM12 13v2.5M9.75 16.5h4.5"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

/** Catan's point sources as columns, keyed by the template's score fields — shared by the
 *  session's final standings and the board screen's players table so the two read alike. */
export const CATAN_POINT_COLUMNS: ScoreColumn[] = [
  { key: BUILDING_POINTS_FIELD, label: 'Gebouwen', Icon: SettlementIcon },
  { key: LONGEST_ROAD_FIELD, label: 'Langste handelsroute', Icon: RoadIcon },
  { key: LARGEST_ARMY_FIELD, label: 'Grootste riddermacht', Icon: ArmyIcon },
  { key: DEV_CARDS_FIELD, label: 'Punten uit ontwikkelingskaarten', Icon: DevCardIcon },
];
