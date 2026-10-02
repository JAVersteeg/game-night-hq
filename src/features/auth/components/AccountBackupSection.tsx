import { useState } from 'react';
import { Alert, View } from 'react-native';

import { Card } from '@/components/Card';
import { SectionLabel } from '@/components/SectionLabel';
import { Text } from '@/components/Text';
import { AccountProviderActions } from '@/features/auth/components/AccountProviderActions';
import { providerLabel, useLinkedIdentity } from '@/features/auth/hooks/useAccountLink';
import { useGroups } from '@/features/groups/hooks/useGroups';

/**
 * The profile screen's account section. Unlinked, it explains the one real risk of the
 * anonymous-first design — this account lives on this device only — and offers the fix. Linked, it
 * is a plain statement of fact with nothing to press: unlinking would hand the risk straight back.
 */
export function AccountBackupSection() {
  const identity = useLinkedIdentity();
  const { data: groups } = useGroups();
  const [restoreOpen, setRestoreOpen] = useState(false);

  if (identity) {
    return (
      <View>
        <SectionLabel>Back-up</SectionLabel>
        <Card tone="muted" className="mt-3 gap-1">
          <Text className="text-base text-ink">
            Gekoppeld met {providerLabel(identity.provider)}
          </Text>
          <Text className="text-sm text-ink-muted">
            {identity.email ? `${identity.email} · ` : ''}
            Meld je hiermee aan op een nieuw toestel om je groepen en statistieken terug te halen.
          </Text>
        </Card>
      </View>
    );
  }

  // Restoring replaces this device's identity. If anything has been played here, that history stays
  // with the old account and is unreachable without a link of its own — so it gets a real warning.
  const hasLocalHistory = (groups?.length ?? 0) > 0;

  function confirmRestore(): Promise<boolean> {
    if (!hasLocalHistory) return Promise.resolve(true);

    return new Promise((resolve) => {
      Alert.alert(
        'Weet je het zeker?',
        'Je gaat verder als een ander account. De groepen en potjes die nu op dit toestel staan zijn daarna niet meer bereikbaar, want dit account is nergens aan gekoppeld.',
        [
          { text: 'Annuleren', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Doorgaan', style: 'destructive', onPress: () => resolve(true) },
        ],
      );
    });
  }

  return (
    <View>
      <SectionLabel>Back-up</SectionLabel>
      <Card className="mt-3 gap-3">
        <Text className="text-sm leading-5 text-ink-muted">
          Je account staat nu alleen op dit toestel. Koppel het aan Apple of Google en je kunt het
          op een nieuw toestel terughalen — je hoeft verder niets te veranderen.
        </Text>

        <AccountProviderActions mode="link" />

        {restoreOpen ? (
          <View className="gap-3 border-t border-line pt-3">
            <Text className="text-sm leading-5 text-ink-muted">
              Meld je aan met het account dat je eerder koppelde.
            </Text>
            <AccountProviderActions mode="restore" confirm={confirmRestore} />
          </View>
        ) : (
          <Text
            className="text-sm font-medium text-ink-subtle"
            onPress={() => setRestoreOpen(true)}
            accessibilityRole="button"
          >
            Al eerder gekoppeld op een ander toestel? Herstel je account
          </Text>
        )}
      </Card>
    </View>
  );
}
