import { ActivityIndicator, Pressable, Text } from 'react-native';

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
      className={`items-center rounded-2xl px-6 py-3.5 ${CONTAINER_BY_VARIANT[variant]} ${
        isDisabled ? 'opacity-50' : ''
      }`}
      testID={testID}
    >
      {isLoading ? (
        <ActivityIndicator color="#18181b" />
      ) : (
        <Text className={`text-base font-semibold tracking-tight ${TEXT_BY_VARIANT[variant]}`}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}
