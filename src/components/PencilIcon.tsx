import Svg, { Path } from 'react-native-svg';

interface PencilIconProps {
  size?: number;
  color: string;
}

/** A plain outline pencil, stroke-only like `GearIcon`/`TrophyIcon` — the one glyph for "this
 *  finished session can still be corrected", so it isn't worth an icon library either. */
export function PencilIcon({ size = 24, color }: PencilIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
