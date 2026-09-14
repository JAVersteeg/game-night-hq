import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

interface CardProps {
  children: ReactNode;
  tone?: 'plain' | 'muted';
  onPress?: () => void;
  className?: string;
}

const TONE_CLASS = {
  plain: 'bg-surface',
  muted: 'bg-surface-muted',
} as const;

/** The bordered, unshadowed container behind every row, field and panel. */
export function Card({ children, tone = 'plain', onPress, className = '' }: CardProps) {
  const container = `rounded-2xl border border-line px-4 py-3.5 ${TONE_CLASS[tone]} ${className}`;

  if (onPress) {
    return (
      <Pressable onPress={onPress} className={`${container} active:opacity-70`}>
        {children}
      </Pressable>
    );
  }

  return <View className={container}>{children}</View>;
}

interface ListRowProps {
  title: string;
  meta?: string;
  left?: ReactNode;
  right?: ReactNode;
  onPress?: () => void;
}

/** A single row inside a list: optional left slot, title, optional meta line, optional right slot. */
export function ListRow({ title, meta, left, right, onPress }: ListRowProps) {
  return (
    <Card onPress={onPress} className="flex-row items-center gap-4">
      {left}
      <View className="min-w-0 flex-1">
        <Text className="text-lg font-semibold text-ink" numberOfLines={1}>
          {title}
        </Text>
        {meta ? (
          <Text className="mt-0.5 text-sm font-medium text-ink-muted" numberOfLines={1}>
            {meta}
          </Text>
        ) : null}
      </View>
      {right}
    </Card>
  );
}
