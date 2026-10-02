import { useState } from 'react';
import { View } from 'react-native';
import { Text, TextInput } from '@/components/Text';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { AccountProviderActions } from '@/features/auth/components/AccountProviderActions';
import { MAX_DISPLAY_NAME_LENGTH, useSetDisplayName } from '@/features/auth/hooks/useProfile';
import { ACCOUNT_LINKING_ENABLED } from '@/features/auth/linking/providers';
import { theme } from '@/lib/theme';

/**
 * The one and only onboarding prompt. It asks "who are you", not "create an account" — by the time
 * this renders the user already has a session, so there is nothing to sign up for and nothing to
 * skip to.
 *
 * The restore affordance below is deliberately subordinate: it is not a login screen, it is the way
 * back in for the one person in ten who is reinstalling or has a new phone. Everyone else types a
 * name and never notices it.
 */
export function DisplayNameScreen() {
  const [name, setName] = useState('');
  const [isRestoreOpen, setIsRestoreOpen] = useState(false);
  const [restoreNote, setRestoreNote] = useState<string | null>(null);
  const setDisplayName = useSetDisplayName();

  const trimmed = name.trim();
  const canSubmit = trimmed.length > 0 && !setDisplayName.isPending;

  function handleSubmit() {
    if (!canSubmit) return;
    setDisplayName.mutate(trimmed);
  }

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top', 'bottom']}>
      <KeyboardAwareScrollView
        contentContainerClassName="flex-grow justify-center px-6"
        bottomOffset={24}
        keyboardShouldPersistTaps="handled"
      >
        <Text className="text-3xl font-bold tracking-tight text-ink">Hoe mogen we je noemen?</Text>
        <Text className="mt-2 text-base text-ink-muted">
          Dit is de naam die je vrienden op het scorebord zien.
        </Text>

        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Je naam"
          placeholderTextColor={theme.inkSubtle}
          autoCapitalize="words"
          autoCorrect={false}
          autoFocus
          maxLength={MAX_DISPLAY_NAME_LENGTH}
          returnKeyType="done"
          onSubmitEditing={handleSubmit}
          className="mt-8 rounded-2xl border border-line bg-surface px-4 py-3.5 text-lg text-ink"
          testID="display-name-input"
        />

        {setDisplayName.isError ? (
          <Text className="mt-3 text-danger">
            Je naam kon niet worden opgeslagen. Controleer je verbinding en probeer het opnieuw.
          </Text>
        ) : null}

        <View className="mt-6">
          <Button
            label="Doorgaan"
            onPress={handleSubmit}
            disabled={!canSubmit}
            isLoading={setDisplayName.isPending}
            testID="display-name-submit"
          />
        </View>

        {!ACCOUNT_LINKING_ENABLED ? null : isRestoreOpen ? (
          <View className="mt-8 gap-3 border-t border-line pt-6">
            <Text className="text-base font-semibold text-ink">Account herstellen</Text>
            <Text className="text-sm leading-5 text-ink-muted">
              Koppelde je je account eerder aan Apple of Google? Meld je daarmee aan, dan komen je
              groepen en statistieken terug.
            </Text>

            {/* A restore that lands on an account with a name replaces this screen outright: the
                session swaps, the profile query refetches, and RootNavigator moves on. */}
            <AccountProviderActions
              mode="restore"
              onSuccess={(result) =>
                setRestoreNote(
                  result?.isNewAccount
                    ? 'Bij dit account stond nog geen speelhistorie. Kies hierboven een naam om te beginnen.'
                    : null,
                )
              }
            />

            {restoreNote ? <Text className="text-sm text-ink-muted">{restoreNote}</Text> : null}
          </View>
        ) : (
          <Text
            onPress={() => setIsRestoreOpen(true)}
            accessibilityRole="button"
            className="mt-8 text-center text-sm font-medium text-ink-subtle"
          >
            Al eerder gespeeld op een ander toestel?
          </Text>
        )}
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}
