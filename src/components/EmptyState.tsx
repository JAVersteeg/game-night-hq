import type { ReactNode } from 'react';
import { View } from 'react-native';
import { Text } from '@/components/Text';

interface EmptyStateProps {
  title: string;
  body?: string;
  action?: ReactNode;
}

/** Centred title + explanation for a list with nothing in it yet. */
export function EmptyState({ title, body, action }: EmptyStateProps) {
  return (
    <View className="flex-1 items-center justify-center px-6 py-16">
      <Text className="text-center text-xl font-semibold text-ink">{title}</Text>
      {body ? (
        <Text className="mt-2 max-w-xs text-center text-base text-ink-muted">{body}</Text>
      ) : null}
      {action ? <View className="mt-6 w-full max-w-xs">{action}</View> : null}
    </View>
  );
}
