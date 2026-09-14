import { Pressable, Text, View } from 'react-native';

interface SegmentedControlProps<T extends string> {
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
}

/** Tab row for switching between views inside a group. Sits under the screen title. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  return (
    <View className="flex-row gap-1 overflow-hidden rounded-2xl bg-surface-sunken p-0.5">
      {options.map((option) => {
        const selected = option === value;
        return (
          // The pill is an inner View rather than a background on the Pressable itself: the
          // Pressable stays transparent and its padding is what lets the track colour read as an
          // edge all the way around the selected pill, while the whole slot stays tappable.
          <Pressable key={option} onPress={() => onChange(option)} className="min-h-14 flex-1 p-1">
            <View
              className={`flex-1 items-center justify-center overflow-hidden rounded-xl px-2 py-1 ${
                selected ? 'bg-surface' : ''
              }`}
            >
              <Text
                className={`text-base font-semibold ${selected ? 'text-ink' : 'text-ink-muted'}`}
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
