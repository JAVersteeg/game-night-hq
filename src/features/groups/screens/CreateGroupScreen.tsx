import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useState } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, TextInput } from '@/components/Text';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import { Button } from '@/components/Button';
import { useCreateGroup } from '@/features/groups/hooks/useGroups';
import { theme } from '@/lib/theme';
import type { AppStackParamList } from '@/navigation/types';

// Matches the char_length check on groups.name, so the constraint can never be the thing that
// rejects a submission.
const MAX_GROUP_NAME_LENGTH = 60;

export function CreateGroupScreen() {
  // Edge-to-edge on Android: the last row would otherwise sit behind the navigation bar.
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const [name, setName] = useState('');
  const createGroup = useCreateGroup();

  const trimmed = name.trim();
  const canSubmit = trimmed.length > 0 && !createGroup.isPending;

  function handleSubmit() {
    if (!canSubmit) return;
    // `replace`, not `navigate`: going back from the new group should return to the list, not to a
    // create form that has already done its job.
    createGroup.mutate(trimmed, {
      onSuccess: (group) => navigation.replace('GroupDashboard', { groupId: group.id }),
    });
  }

  return (
    <KeyboardAwareScrollView
      className="flex-1 bg-surface"
      contentContainerClassName="px-6 pt-8"
        contentContainerStyle={{ paddingBottom: 48 + insets.bottom }}
      bottomOffset={24}
      keyboardShouldPersistTaps="handled"
    >
      <Text className="text-2xl font-bold tracking-tight text-ink">Hoe heet jullie groep?</Text>
      <Text className="mt-2 text-base text-ink-muted">
        Je krijgt een uitnodigingscode die je met je vrienden kunt delen.
      </Text>

      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Bijvoorbeeld: Donderdagavond"
        placeholderTextColor={theme.inkSubtle}
        autoCapitalize="sentences"
        autoCorrect={false}
        autoFocus
        maxLength={MAX_GROUP_NAME_LENGTH}
        returnKeyType="done"
        onSubmitEditing={handleSubmit}
        className="mt-8 rounded-2xl border border-line bg-surface px-4 py-3.5 text-lg text-ink"
        testID="group-name-input"
      />

      {createGroup.isError ? (
        <Text className="mt-3 text-danger">
          De groep kon niet worden aangemaakt. Controleer je verbinding en probeer het opnieuw.
        </Text>
      ) : null}

      <View className="mt-6">
        <Button
          label="Groep aanmaken"
          onPress={handleSubmit}
          disabled={!canSubmit}
          isLoading={createGroup.isPending}
          testID="create-group-submit"
        />
      </View>
    </KeyboardAwareScrollView>
  );
}
