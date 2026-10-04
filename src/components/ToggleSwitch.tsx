import { useEffect, useState } from 'react';
import { type LayoutChangeEvent, Pressable, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { Text } from '@/components/Text';

interface ToggleSwitchProps<T extends string> {
  /** Exactly two: the left one is the "off" side. */
  options: readonly [T, T];
  value: T;
  onChange: (value: T) => void;
  testID?: string;
}

const TRACK_PADDING = 4;
const SLIDE_MS = 180;

/**
 * A two-way switch between modes of one thing (Individueel / Teams). Same sunken track as
 * SegmentedControl, but pill-shaped with an accent thumb that slides across — so it reads as a
 * setting being flipped rather than as tabs to browse between views.
 */
export function ToggleSwitch<T extends string>({
  options,
  value,
  onChange,
  testID,
}: ToggleSwitchProps<T>) {
  const [trackWidth, setTrackWidth] = useState(0);
  const thumbWidth = Math.max(0, (trackWidth - TRACK_PADDING * 2) / 2);
  const isRight = value === options[1];

  const offset = useSharedValue(isRight ? 1 : 0);
  useEffect(() => {
    offset.value = withTiming(isRight ? 1 : 0, {
      duration: SLIDE_MS,
      easing: Easing.out(Easing.cubic),
    });
  }, [isRight, offset]);

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.value * thumbWidth }],
  }));

  return (
    <View
      className="flex-row rounded-full bg-surface-sunken"
      style={{ padding: TRACK_PADDING }}
      onLayout={(event: LayoutChangeEvent) => setTrackWidth(event.nativeEvent.layout.width)}
      accessibilityRole="radiogroup"
      testID={testID}
    >
      {/* Measured before it can be drawn: a zero-width thumb on the first frame rather than one
          that jumps once the track's width is known. */}
      {thumbWidth > 0 ? (
        <Animated.View
          className="absolute rounded-full bg-accent"
          style={[
            { top: TRACK_PADDING, bottom: TRACK_PADDING, left: TRACK_PADDING, width: thumbWidth },
            thumbStyle,
          ]}
        />
      ) : null}
      {options.map((option) => {
        const selected = option === value;
        return (
          <Pressable
            key={option}
            onPress={() => onChange(option)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            testID={testID ? `${testID}-${option}` : undefined}
            className="min-h-11 flex-1 items-center justify-center rounded-full px-3"
          >
            <Text
              numberOfLines={1}
              className={`text-sm font-semibold ${selected ? 'text-accent-fg' : 'text-ink-muted'}`}
            >
              {option}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
