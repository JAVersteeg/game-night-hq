import { useState } from 'react';
import { View } from 'react-native';
import { Text, TextInput } from '@/components/Text';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { useSetDisplayName } from '@/features/auth/hooks/useProfile';
import { theme } from '@/lib/theme';

const MAX_DISPLAY_NAME_LENGTH = 40;

/**
 * The one and only onboarding prompt. It asks "who are you", not "create an account" — by the time
 * this renders the user already has a session, so there is nothing to sign up for and nothing to
 * skip to.
 */
export function DisplayNameScreen() {
  const [name, setName] = useState('');
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
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}
