import { View } from 'react-native';
import { Text } from '@/components/Text';

interface StatTileProps {
  value: string | number;
  /** Rendered smaller, right after the number — '%' and the like. */
  unit?: string;
  label: string;
}

/** A headline number for the top of a stats screen. Three across at phone width, per the design
 *  system: no trend arrows, no colour on the number, no sparkline inside. */
export function StatTile({ value, unit, label }: StatTileProps) {
  return (
    <View className="flex-1 items-center gap-1 rounded-2xl border border-line bg-surface px-2 py-4">
      <Text className="text-2xl font-bold tracking-tight text-ink">
        {value}
        {unit ? <Text className="text-lg font-semibold text-ink-muted">{unit}</Text> : null}
      </Text>
      <Text className="text-center text-xs font-medium text-ink-subtle" numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}
