import Svg, { Path } from 'react-native-svg';

interface TrophyIconProps {
  size?: number;
  color: string;
}

/** The badges glyph in the group header, stroke-only like `GearIcon` — same reasoning: one icon
 *  isn't worth an icon library. */
export function TrophyIcon({ size = 24, color }: TrophyIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M7 4h10v5a5 5 0 0 1-10 0V4zM7 6H4.5v1.5A3.5 3.5 0 0 0 8 11M17 6h2.5v1.5A3.5 3.5 0 0 1 16 11M12 14v3M8.5 20h7M9.5 20c0-1.7 1.1-3 2.5-3s2.5 1.3 2.5 3"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
