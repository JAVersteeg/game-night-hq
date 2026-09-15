import Svg, { Circle, Path } from 'react-native-svg';

interface InfoIconProps {
  size?: number;
  color: string;
}

/** A plain outline "i" in a circle — the one affordance for "what does this number mean", next to
 *  a metric label. Stroke-only, like `GearIcon`, so it isn't worth an icon library. */
export function InfoIcon({ size = 16, color }: InfoIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={9} stroke={color} strokeWidth={2} />
      <Path d="M12 11v5" stroke={color} strokeWidth={2} strokeLinecap="round" />
      <Path d="M12 7.6v.4" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}
