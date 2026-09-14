import { Text, TextInput, View, type TextInputProps } from 'react-native';

import { SectionLabel } from '@/components/SectionLabel';
import { theme } from '@/lib/theme';

interface TextFieldProps
  extends Pick<
    TextInputProps,
    'onSubmitEditing' | 'returnKeyType' | 'keyboardType' | 'onBlur' | 'onFocus'
  > {
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  maxLength?: number;
  autoFocus?: boolean;
  testID?: string;
}

/** The app's text input: rounded-2xl, hairline border, retints to accent on focus. */
export function TextField({
  value,
  onChangeText,
  placeholder,
  label,
  error,
  maxLength,
  autoFocus,
  testID,
  ...inputProps
}: TextFieldProps) {
  return (
    <View className="gap-2">
      {label ? <SectionLabel>{label}</SectionLabel> : null}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.inkSubtle}
        maxLength={maxLength}
        autoFocus={autoFocus}
        className={`rounded-2xl border bg-surface px-4 py-3.5 text-lg text-ink ${
          error ? 'border-danger-line' : 'border-line'
        }`}
        testID={testID}
        {...inputProps}
      />
      {error ? <Text className="text-sm text-danger">{error}</Text> : null}
    </View>
  );
}
