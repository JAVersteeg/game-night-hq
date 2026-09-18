import type { ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { Text } from '@/components/Text';

interface CardProps {
  children: ReactNode;
  tone?: 'plain' | 'muted' | 'accent';
  onPress?: () => void;
  className?: string;
  accessibilityLabel?: string;
}

/** Three levels, so a surface says what kind of thing it holds:
 *  - `plain`: a standalone container (a row, a field, a result) — hairline border on the page.
 *  - `muted`: an aside (explanations, empty states, notes) — a tinted fill, same hairline.
 *  - `accent`: what is happening right now (a live potje) — the one clay-edged surface, with the
 *    larger 24px radius. At most one kind of thing per screen gets it. */
const TONE_CLASS = {
  plain: 'rounded-2xl border border-line bg-surface',
  muted: 'rounded-2xl border border-line bg-surface-muted',
  accent: 'rounded-3xl border border-accent-line bg-accent-soft',
} as const;

/** The bordered, unshadowed container behind every row, field and panel. */
export function Card({
  children,
  tone = 'plain',
  onPress,
  className = '',
  accessibilityLabel,
}: CardProps) {
  const container = `px-4 py-3.5 ${TONE_CLASS[tone]} ${className}`;

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        className={`${container} active:opacity-70`}
      >
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
