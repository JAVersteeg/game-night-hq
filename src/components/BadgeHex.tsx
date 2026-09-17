import { Image, View, type ImageSourcePropType } from 'react-native';
import Svg, { Polygon } from 'react-native-svg';

import { theme } from '@/lib/theme';

interface BadgeHexProps {
  /** Width in px; the height follows from the hexagon's own proportion. */
  size: number;
  /** The badge's artwork, drawn inside the ring. Absent for badges nobody has drawn yet. */
  art?: ImageSourcePropType | null;
  /** An unheld badge drops back to the plain line colours — same shape, no accent. */
  held?: boolean;
}

/** 94/84 in the design: a hexagon a touch shorter than a regular one. */
const HEIGHT_RATIO = 94 / 84;
/** 78/84: the inner fill, which is what leaves a ring of `accent-line` showing around it. */
const INNER_SCALE = 78 / 84;
/** How much of the hexagon's width the artwork takes up — enough for the ring to stay visible. */
const ART_SCALE = 0.72;

const POINTS = '50,0 100,25 100,75 50,100 0,75 0,25';

/**
 * The hexagon every pass-on badge sits in: two stacked polygons, the outer one showing as a 3px
 * ring around the inner fill. Drawn as SVG rather than clipped views — React Native has no
 * `clip-path`, and a border on a clipped element would be clipped away anyway (which is why the
 * design uses two fills on the web too).
 */
export function BadgeHex({ size, art, held = true }: BadgeHexProps) {
  const height = size * HEIGHT_RATIO;
  const artSize = size * ART_SCALE;

  return (
    <View style={{ width: size, height }} className="items-center justify-center">
      <Svg width={size} height={height} viewBox="0 0 100 100" preserveAspectRatio="none">
        <Polygon points={POINTS} fill={held ? theme.accentLine : theme.line} />
        <Polygon
          points={POINTS}
          fill={held ? theme.surfaceSunken : theme.surface}
          // Scaled about the centre, so the ring it leaves is even on every edge.
          transform={`translate(${(100 * (1 - INNER_SCALE)) / 2}, ${
            (100 * (1 - INNER_SCALE)) / 2
          }) scale(${INNER_SCALE})`}
        />
      </Svg>
      {art ? (
        <Image
          source={art}
          style={{ position: 'absolute', width: artSize, height: artSize }}
          resizeMode="contain"
          accessibilityIgnoresInvertColors
        />
      ) : null}
    </View>
  );
}
