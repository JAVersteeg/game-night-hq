import Svg, { Path } from 'react-native-svg';

interface CloseIconProps {
  size?: number;
  color: string;
}

/** A plain outline cross, stroke-only like `PencilIcon` — closes a full-screen view. */
export function CloseIcon({ size = 24, color }: CloseIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M18 6 6 18M6 6l12 12"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
