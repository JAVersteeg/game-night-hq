import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useState } from 'react';
import { View } from 'react-native';
import { Text, TextInput } from '@/components/Text';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import { Button } from '@/components/Button';
import { joinErrorMessage, useJoinGroup } from '@/features/groups/hooks/useGroups';
import { theme } from '@/lib/theme';
import type { AppStackParamList } from '@/navigation/types';

// private.generate_invite_code() always mints exactly six characters.
const INVITE_CODE_LENGTH = 6;

export function JoinGroupScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const [code, setCode] = useState('');
  const joinGroup = useJoinGroup();

  const trimmed = code.trim();
  const canSubmit = trimmed.length === INVITE_CODE_LENGTH && !joinGroup.isPending;

  function handleSubmit() {
    if (!canSubmit) return;
    // Joining is idempotent, so entering the code of a group you are already in simply takes you
    // there rather than failing.
    joinGroup.mutate(trimmed, {
      onSuccess: (group) =>
        navigation.replace('GroupDashboard', { groupId: group.id, justJoined: true }),
    });
  }

  return (
    <KeyboardAwareScrollView
      className="flex-1 bg-surface"
      contentContainerClassName="px-6 pb-12 pt-8"
      bottomOffset={24}
      keyboardShouldPersistTaps="handled"
    >
      <Text className="text-2xl font-bold tracking-tight text-ink">Voer de code in</Text>
      <Text className="mt-2 text-base text-ink-muted">
        Vraag iemand uit de groep om de uitnodigingscode van zes tekens.
      </Text>

      {/* Upper-cased as you type: the codes are minted from an upper-case alphabet, and showing the
          code the way it was shared makes a typo easier to spot. */}
      <TextInput
        value={code}
        onChangeText={(value) => setCode(value.toUpperCase())}
        placeholder="ABC123"
        placeholderTextColor={theme.inkSubtle}
        autoCapitalize="characters"
        autoCorrect={false}
        autoComplete="off"
        autoFocus
        maxLength={INVITE_CODE_LENGTH}
        returnKeyType="done"
        onSubmitEditing={handleSubmit}
        className="mt-8 rounded-2xl border border-line bg-surface px-4 py-4 text-center text-3xl font-bold tracking-[8px] text-ink"
        testID="invite-code-input"
      />

      {joinGroup.isError ? (
        <Text className="mt-3 text-center text-danger">{joinErrorMessage(joinGroup.error)}</Text>
      ) : null}

      <View className="mt-6">
        <Button
          label="Deelnemen"
          onPress={handleSubmit}
          disabled={!canSubmit}
          isLoading={joinGroup.isPending}
          testID="join-group-submit"
        />
      </View>
    </KeyboardAwareScrollView>
  );
}
