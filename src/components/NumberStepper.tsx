import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Text, TextInput } from '@/components/Text';

import { theme } from '@/lib/theme';

interface NumberStepperProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  /** -1 renders the "telt af" hint so a penalty field still reads as one at a glance. */
  sign?: 1 | -1;
  step?: number;
  testID?: string;
}

/** Numeric score field: tappable +/- for one-thumb entry during play, typing for bigger jumps. */
export function NumberStepper({ label, value, onChange, sign = 1, step = 1, testID }: NumberStepperProps) {
  const [text, setText] = useState(String(value));

  function commit(nextText: string) {
    const parsed = Number(nextText.replace(/[^\d-]/g, ''));
    if (nextText.trim().length === 0 || Number.isNaN(parsed)) {
      setText(String(value));
      return;
    }
    setText(String(parsed));
    onChange(parsed);
  }

  function step_(delta: number) {
    const next = value + delta;
    setText(String(next));
    onChange(next);
  }

  return (
    <View className="flex-row items-center gap-3">
      <View className="min-w-0 flex-1">
        <Text className="text-base font-medium text-ink" numberOfLines={1}>
          {label}
        </Text>
        {sign === -1 ? <Text className="text-sm font-medium text-danger">telt af</Text> : null}
      </View>
      <View className="flex-row items-center gap-2">
        <Pressable
          onPress={() => step_(-step)}
          accessibilityLabel="minder"
          className="h-10 w-10 items-center justify-center rounded-lg border border-line-strong bg-surface active:opacity-70"
        >
          <Text className="text-xl font-semibold text-ink">−</Text>
        </Pressable>
        <TextInput
          value={text}
          onChangeText={setText}
          onEndEditing={(event) => commit(event.nativeEvent.text)}
          keyboardType="numeric"
          selectTextOnFocus
          placeholderTextColor={theme.inkSubtle}
          className="w-14 rounded-lg border border-line bg-surface py-2 text-center text-lg font-semibold text-ink"
          testID={testID}
        />
        <Pressable
          onPress={() => step_(step)}
          accessibilityLabel="meer"
          className="h-10 w-10 items-center justify-center rounded-lg border border-line-strong bg-surface active:opacity-70"
        >
          <Text className="text-xl font-semibold text-ink">+</Text>
        </Pressable>
      </View>
    </View>
  );
}
