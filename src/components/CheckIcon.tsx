import Svg, { Path } from 'react-native-svg';

interface CheckIconProps {
  size?: number;
  color: string;
}

/** A checkmark, stroke-only like `PencilIcon` — confirms or finishes something. */
export function CheckIcon({ size = 24, color }: CheckIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5 12.5l4.5 4.5L19 7.5"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
