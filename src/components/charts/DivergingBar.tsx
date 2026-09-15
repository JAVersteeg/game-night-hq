import { View } from 'react-native';

import { theme } from '@/lib/theme';

interface DivergingBarProps {
  /**
   * -100..100: how far the fill reaches from the centre, as a share of half the track. Negative
   * fills to the left of zero, positive to the right.
   */
  offset: number;
  color: string;
}

/** Exported so consumers stacking this next to a plain fill bar (of height TRACK_HEIGHT) can offset
 *  the difference — this component's own layout footprint is TICK_HEIGHT, taller than its visible
 *  track, to leave the centre tick room to stand proud on both ends. */
export const TRACK_HEIGHT = 6;
export const TICK_HEIGHT = 12;

/**
 * A bar for values that run either side of zero, like a points saldo: zero is the middle of the
 * track, marked by a tick that stands slightly proud of it top and bottom, and the fill grows left
 * or right from there.
 *
 * The tick is `ink-faint` rather than literally black — the card behind it is near-black already,
 * so a black tick would be invisible exactly where it sticks out past the track.
 */
export function DivergingBar({ offset, color }: DivergingBarProps) {
  const clamped = Math.max(-100, Math.min(100, offset));
  // Half the track per side, and a hairline of fill for a small-but-real value so it never reads
  // as an exact zero.
  const width = clamped === 0 ? 0 : Math.max(1, Math.abs(clamped) / 2);

  return (
    <View className="justify-center" style={{ height: TICK_HEIGHT }}>
      <View
        className="overflow-hidden rounded-full bg-surface-sunken"
        style={{ height: TRACK_HEIGHT }}
      >
        <View
          className="absolute h-full"
          style={{
            [clamped < 0 ? 'right' : 'left']: '50%',
            width: `${width}%`,
            backgroundColor: color,
          }}
        />
      </View>
      <View
        className="absolute left-1/2 w-0.5 -translate-x-px rounded-full"
        style={{ height: TICK_HEIGHT, backgroundColor: theme.inkFaint }}
      />
    </View>
  );
}
