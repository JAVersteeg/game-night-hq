import { useCallback, useRef, useState } from 'react';
import { LayoutChangeEvent, Pressable, View } from 'react-native';
import { Text } from '@/components/Text';

interface SegmentedControlProps<T extends string> {
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
}

const BASE_FONT_SIZE = 16; // text-base
const MIN_FONT_SIZE = 11;
const SLOT_HORIZONTAL_PADDING = 12; // px-2 py-1 pill padding, minus a little slack

/** Tab row for switching between views inside a group. Sits under the screen title. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  const [fontSize, setFontSize] = useState(BASE_FONT_SIZE);
  const slotWidths = useRef<Partial<Record<T, number>>>({});
  const labelWidths = useRef<Partial<Record<T, number>>>({});

  // Every label is measured unconstrained (off-screen, at the base font size) and every
  // slot's real width is measured on-screen. Once both are known for every option, the
  // whole row picks one shared font size — the largest that still lets the tightest
  // label fit its slot on one line — so all tabs render at the same size.
  const recompute = useCallback(() => {
    if (options.some((option) => !slotWidths.current[option] || !labelWidths.current[option])) {
      return;
    }
    const scale = Math.min(
      1,
      ...options.map((option) => {
        const available = slotWidths.current[option]! - SLOT_HORIZONTAL_PADDING;
        return available / labelWidths.current[option]!;
      }),
    );
    const next = Math.max(MIN_FONT_SIZE, Math.min(BASE_FONT_SIZE, BASE_FONT_SIZE * scale));
    setFontSize((prev) => (Math.abs(prev - next) > 0.5 ? next : prev));
  }, [options]);

  return (
    <View className="flex-row gap-1 overflow-hidden rounded-2xl bg-surface-sunken p-0.5">
      {options.map((option) => {
        const selected = option === value;
        return (
          // The pill is an inner View rather than a background on the Pressable itself: the
          // Pressable stays transparent and its padding is what lets the track colour read as an
          // edge all the way around the selected pill, while the whole slot stays tappable.
          <Pressable key={option} onPress={() => onChange(option)} className="min-h-12 flex-1 p-1">
            <View
              className={`flex-1 items-center justify-center overflow-hidden rounded-xl px-2 py-1 ${
                selected ? 'bg-surface' : ''
              }`}
              onLayout={(event: LayoutChangeEvent) => {
                slotWidths.current[option] = event.nativeEvent.layout.width;
                recompute();
              }}
            >
              <Text
                numberOfLines={1}
                style={{ fontSize }}
                className={`font-semibold ${selected ? 'text-ink' : 'text-ink-muted'}`}
              >
                {option}
              </Text>
              {/* Off-screen clone at the base size, purely to measure each label's natural width. */}
              <Text
                numberOfLines={1}
                style={{ fontSize: BASE_FONT_SIZE, position: 'absolute', opacity: 0 }}
                className="font-semibold"
                onLayout={(event: LayoutChangeEvent) => {
                  labelWidths.current[option] = event.nativeEvent.layout.width;
                  recompute();
                }}
              >
                {option}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}
