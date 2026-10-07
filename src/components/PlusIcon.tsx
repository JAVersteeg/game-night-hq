import Svg, { Path } from 'react-native-svg';

interface PlusIconProps {
  size?: number;
  color: string;
}

/** A plain plus, stroke-only like `PencilIcon` — adds the thing being typed. */
export function PlusIcon({ size = 24, color }: PlusIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 5v14M5 12h14"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
