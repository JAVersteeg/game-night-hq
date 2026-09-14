import { Text } from 'react-native';

/** The small uppercase heading above a card or list section — invite code, members, stats, etc. */
export function SectionLabel({ children }: { children: string }) {
  return (
    <Text className="text-sm font-semibold uppercase tracking-wide text-ink-subtle">
      {children}
    </Text>
  );
}
