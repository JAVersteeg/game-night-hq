import Svg, { Path } from 'react-native-svg';

interface TrashIconProps {
  size?: number;
  color: string;
}

/** An outline bin with a lid, stroke-only like `PencilIcon` — deletes the thing it sits next to. */
export function TrashIcon({ size = 24, color }: TrashIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 7h16M10 11v6M14 11v6M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
