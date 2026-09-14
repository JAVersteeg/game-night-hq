import { ActivityIndicator, Pressable, Text } from 'react-native';

import { theme } from '@/lib/theme';

interface ButtonProps {
  label: string;
  onPress: () => void;
  isLoading?: boolean;
  variant?: 'primary' | 'secondary' | 'ghost';
  disabled?: boolean;
  testID?: string;
}

const CONTAINER_BY_VARIANT = {
  primary: 'bg-accent active:opacity-80',
  secondary: 'bg-surface-sunken active:opacity-80',
  ghost: 'border border-line-strong bg-transparent active:bg-surface-muted',
} as const;

const TEXT_BY_VARIANT = {
  primary: 'text-accent-fg',
  secondary: 'text-ink',
  ghost: 'text-ink',
} as const;

const SPINNER_COLOR_BY_VARIANT = {
  primary: theme.accentFg,
  secondary: theme.ink,
  ghost: theme.ink,
} as const;

export function Button({
  label,
  onPress,
  isLoading,
  variant = 'primary',
  disabled,
  testID,
}: ButtonProps) {
  const isDisabled = disabled || isLoading;

  return (
    <Pressable
      onPress={isDisabled ? undefined : onPress}
      className={`min-h-11 items-center justify-center rounded-2xl px-6 py-3.5 ${CONTAINER_BY_VARIANT[variant]} ${
        isDisabled ? 'opacity-50' : ''
      }`}
      testID={testID}
    >
      {isLoading ? (
        <ActivityIndicator color={SPINNER_COLOR_BY_VARIANT[variant]} />
      ) : (
        <Text className={`text-base font-semibold tracking-tight ${TEXT_BY_VARIANT[variant]}`}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}
