import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { Text } from '@/components/Text';

interface ChoiceRowProps {
  title: string;
  meta?: string;
  left?: ReactNode;
  mode?: 'radio' | 'check';
  selected?: boolean;
  onSelect: () => void;
  testID?: string;
}

function Mark({ mode, selected }: { mode: 'radio' | 'check'; selected: boolean }) {
  const shapeClass = mode === 'radio' ? 'rounded-full' : 'rounded-md';

  if (selected) {
    return (
      <View
        className={`h-[22px] w-[22px] items-center justify-center border-[6px] border-accent ${
          mode === 'check' ? 'bg-accent' : 'bg-surface'
        } ${shapeClass}`}
      >
        {mode === 'check' ? (
          <Text
            className="text-xs font-bold leading-none text-accent-fg"
            style={{ includeFontPadding: false, textAlignVertical: 'center' }}
          >
            ✓
          </Text>
        ) : null}
      </View>
    );
  }

  return (
    <View className={`h-[22px] w-[22px] border border-line-strong bg-surface ${shapeClass}`} />
  );
}

/** A selectable row inside a group of options: scoring direction (radio), or players (check). */
export function ChoiceRow({
  title,
  meta,
  left,
  mode = 'radio',
  selected = false,
  onSelect,
  testID,
}: ChoiceRowProps) {
  return (
    <Pressable
      onPress={onSelect}
      accessibilityRole="button"
      testID={testID}
      className={`min-h-11 flex-row items-center gap-3 rounded-2xl border px-4 py-3 ${
        selected ? 'border-accent-line bg-accent-soft' : 'border-line bg-surface'
      }`}
    >
      {left}
      <View className="min-w-0 flex-1">
        <Text className="text-base font-semibold text-ink" numberOfLines={1}>
          {title}
        </Text>
        {meta ? (
          <Text className="mt-0.5 text-sm font-medium text-ink-muted" numberOfLines={1}>
            {meta}
          </Text>
        ) : null}
      </View>
      <Mark mode={mode} selected={selected} />
    </Pressable>
  );
}
