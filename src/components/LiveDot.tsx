import { View } from 'react-native';
import { Text } from '@/components/Text';

/** The broadcast convention — a red dot next to the word "Live" — rather than a status pill. It
 *  reads as "happening right now" without anyone having to parse it, which a pill shaped like every
 *  other pill in the app does not. Kept out of Badge on purpose: this is the one signal that isn't
 *  a label for a state, and it shouldn't inherit Badge's tones. */
export function LiveDot() {
  return (
    <View className="flex-row items-center gap-1" accessibilityLabel="Nu bezig">
      <View className="h-2.5 w-2.5 rounded-full bg-live" />
      <Text className="text-sm font-bold uppercase tracking-wide text-ink">Live</Text>
    </View>
  );
}
