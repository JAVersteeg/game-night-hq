import type { RouteProp } from '@react-navigation/native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { Text } from '@/components/Text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { ChoiceRow } from '@/components/ChoiceRow';
import { CoverThumbnail } from '@/components/CoverThumbnail';
import { SectionLabel } from '@/components/SectionLabel';
import { useAuth } from '@/features/auth/context/AuthContext';
import { AvatarMarksProvider } from '@/features/badges/avatarMarks';
import { MemberAvatar } from '@/features/groups/components/MemberAvatar';
import { gameColorForTemplate } from '@/features/games/colors';
import { coverImageForTemplate } from '@/features/games/covers';
import { useGameTemplates } from '@/features/games/hooks/useGameTemplates';
import { useGroupMembers } from '@/features/groups/hooks/useGroupMembers';
import { useCreateSession } from '@/features/sessions/hooks/useSessions';
import type { AppStackParamList } from '@/navigation/types';

type Navigation = NativeStackNavigationProp<AppStackParamList>;

/**
 * Pick who's playing and who's keeping score for a game already chosen from the dashboard. The
 * template itself is fixed — swapping it would mean starting over from GamesTab — so this screen
 * only ever narrows the group's member list down to participants, then a scorekeeper among them.
 */
export function StartSessionScreen() {
  const { groupId, templateId } = useRoute<RouteProp<AppStackParamList, 'StartSession'>>().params;
  const navigation = useNavigation<Navigation>();
  const { session } = useAuth();
  const currentUserId = session?.user.id;

  // "Potje starten" is the last thing in the scroll content rather than a pinned footer, so with
  // enough members to make the list scroll it ends up under Android's navigation bar unless the
  // bottom inset is added to the content padding.
  const insets = useSafeAreaInsets();

  const { data: templates } = useGameTemplates(groupId);
  const template = templates?.find((candidate) => candidate.id === templateId);

  const { data: members, isPending, isError } = useGroupMembers(groupId);
  const createSession = useCreateSession(groupId);

  // Whoever opened this screen is playing too, by default — the common case is starting a session
  // you're about to join, not setting one up purely for other people.
  const [participantIds, setParticipantIds] = useState<string[]>(
    currentUserId ? [currentUserId] : [],
  );
  const [scorekeeperId, setScorekeeperId] = useState<string | null>(currentUserId ?? null);

  function toggleParticipant(userId: string) {
    setParticipantIds((current) => {
      const isSelected = current.includes(userId);
      const next = isSelected ? current.filter((id) => id !== userId) : [...current, userId];

      // The scorekeeper has to keep playing to keep the job: dropping them from the roster clears
      // the pick rather than leaving a stale, no-longer-valid selection in place.
      if (isSelected && scorekeeperId === userId) setScorekeeperId(null);
      return next;
    });
  }

  const canSubmit =
    Boolean(template) &&
    participantIds.length > 0 &&
    scorekeeperId !== null &&
    !createSession.isPending;

  function handleSubmit() {
    if (!canSubmit || !scorekeeperId) return;
    createSession.mutate(
      { templateId, scorekeeperId, participantIds },
      {
        onSuccess: (newSession) => {
          navigation.replace('Session', { sessionId: newSession.id });
        },
      },
    );
  }

  return (
    <AvatarMarksProvider groupId={groupId}>
      <ScrollView
        className="flex-1 bg-surface"
        contentContainerClassName="gap-8 px-6 pt-6"
        contentContainerStyle={{ paddingBottom: 48 + insets.bottom }}
      >
        <View className="flex-row items-center gap-4">
          <CoverThumbnail
            source={coverImageForTemplate(template?.cover_key, template?.name)}
            color={gameColorForTemplate(template?.cover_key, template?.name)}
            size={56}
          />
          <View className="min-w-0 flex-1">
            <Text className="text-xl font-bold text-ink" numberOfLines={2}>
              {template?.name ?? '…'}
            </Text>
          </View>
        </View>

        <View>
          <SectionLabel>Deelnemers</SectionLabel>
          <View className="mt-2 gap-2">
            {isPending ? (
              <View className="items-center py-6">
                <ActivityIndicator />
              </View>
            ) : isError || !members ? (
              <Text className="text-base text-ink-muted">De leden konden niet worden geladen.</Text>
            ) : (
              members.map((member) => (
                <ChoiceRow
                  key={member.userId}
                  mode="check"
                  title={member.displayName}
                  left={<MemberAvatar member={member} size={32} />}
                  selected={participantIds.includes(member.userId)}
                  onSelect={() => toggleParticipant(member.userId)}
                />
              ))
            )}
          </View>
        </View>

        {participantIds.length > 0 && members ? (
          <View>
            <SectionLabel>Scorebijhouder</SectionLabel>
            <View className="mt-2 gap-2">
              {members
                .filter((member) => participantIds.includes(member.userId))
                .map((member) => (
                  <ChoiceRow
                    key={member.userId}
                    title={member.displayName}
                    left={<MemberAvatar member={member} size={32} />}
                    selected={scorekeeperId === member.userId}
                    onSelect={() => setScorekeeperId(member.userId)}
                  />
                ))}
            </View>
          </View>
        ) : null}

        {createSession.isError ? (
          <Text className="text-danger">
            Het potje kon niet worden gestart. Controleer je verbinding en probeer het opnieuw.
          </Text>
        ) : null}

        <Button
          label="Potje starten"
          onPress={handleSubmit}
          disabled={!canSubmit}
          isLoading={createSession.isPending}
          testID="start-session-submit"
        />
      </ScrollView>
    </AvatarMarksProvider>
  );
}
