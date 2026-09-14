import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

type BadgeTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger';

const TONE_CLASS: Record<BadgeTone, { bg: string; text: string }> = {
  neutral: { bg: 'bg-surface-sunken', text: 'text-ink-muted' },
  accent: { bg: 'bg-accent-soft', text: 'text-accent-softFg' },
  success: { bg: 'bg-success-soft', text: 'text-success-softFg' },
  warning: { bg: 'bg-warning-soft', text: 'text-warning-softFg' },
  danger: { bg: 'bg-danger-soft', text: 'text-danger-softFg' },
};

/** Small status pill: live session, finished session, winner, scorekeeper, field sign. */
export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: BadgeTone }) {
  const { bg, text } = TONE_CLASS[tone];
  return (
    <View className={`rounded-full px-2.5 py-1 ${bg}`}>
      <Text className={`text-sm font-semibold ${text}`}>{children}</Text>
    </View>
  );
}
