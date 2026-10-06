import type { RouteProp } from '@react-navigation/native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import { Text } from '@/components/Text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { ChoiceRow } from '@/components/ChoiceRow';
import { CoverThumbnail } from '@/components/CoverThumbnail';
import { InfoIcon } from '@/components/InfoIcon';
import { SectionLabel } from '@/components/SectionLabel';
import { TextField } from '@/components/TextField';
import { useAuth } from '@/features/auth/context/AuthContext';
import { AvatarMarksProvider } from '@/features/badges/avatarMarks';
import { MemberAvatar } from '@/features/groups/components/MemberAvatar';
import { ScoringInfoModal } from '@/features/games/components/ScoringInfoModal';
import { gameColorForTemplate } from '@/features/games/colors';
import { coverImageForTemplate } from '@/features/games/covers';
import { useGameTemplates } from '@/features/games/hooks/useGameTemplates';
import { useGroupMembers } from '@/features/groups/hooks/useGroupMembers';
import { useCreateSession } from '@/features/sessions/hooks/useSessions';
import { teamLabel } from '@/features/sessions/scoring';
import { theme } from '@/lib/theme';
import type { AppStackParamList } from '@/navigation/types';

type Navigation = NativeStackNavigationProp<AppStackParamList>;

const MIN_TEAMS = 2;
const MAX_TEAM_NAME_LENGTH = 40;

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
  const [isScoringOpen, setIsScoringOpen] = useState(false);

  // Whoever opened this screen is playing too, by default — the common case is starting a session
  // you're about to join, not setting one up purely for other people.
  const [participantIds, setParticipantIds] = useState<string[]>(
    currentUserId ? [currentUserId] : [],
  );
  const [scorekeeperId, setScorekeeperId] = useState<string | null>(currentUserId ?? null);

  // Team game only. Teams are numbered 1..teamCount; a typed name of '' means "name it after its
  // players", which is also what the field shows as its placeholder.
  const isTeamGame = template?.teams ?? false;
  const [teamCount, setTeamCount] = useState(MIN_TEAMS);
  const [teamByUser, setTeamByUser] = useState<Record<string, number>>(
    currentUserId ? { [currentUserId]: 1 } : {},
  );
  const [teamNames, setTeamNames] = useState<string[]>([]);

  const teamNumbers = Array.from({ length: teamCount }, (_, index) => index + 1);
  const membersOfTeam = (team: number) =>
    (members ?? []).filter(
      (member) => participantIds.includes(member.userId) && teamByUser[member.userId] === team,
    );

  /** The team a newly picked player joins: whichever has the fewest players so far, so picking
   *  everyone in turn already deals them out evenly. */
  function smallestTeam(assignments: Record<string, number>, count: number): number {
    const sizes = Array.from(
      { length: count },
      (_, index) => Object.values(assignments).filter((team) => team === index + 1).length,
    );
    return sizes.indexOf(Math.min(...sizes)) + 1;
  }

  function toggleParticipant(userId: string) {
    const isSelected = participantIds.includes(userId);
    setParticipantIds((current) =>
      isSelected ? current.filter((id) => id !== userId) : [...current, userId],
    );
    setTeamByUser((current) => {
      const { [userId]: _removed, ...rest } = current;
      return isSelected ? rest : { ...rest, [userId]: smallestTeam(rest, teamCount) };
    });

    // The scorekeeper has to keep playing to keep the job: dropping them from the roster clears
    // the pick rather than leaving a stale, no-longer-valid selection in place.
    if (isSelected && scorekeeperId === userId) setScorekeeperId(null);
  }

  function addTeam() {
    setTeamCount((current) => current + 1);
  }

  /** Only the last team can go, so the numbers of the others never shift; its players are dealt
   *  out over the teams that remain. */
  function removeLastTeam() {
    const remaining = teamCount - 1;
    setTeamByUser((current) => {
      const next = Object.fromEntries(
        Object.entries(current).filter(([, team]) => team <= remaining),
      );
      for (const [userId, team] of Object.entries(current)) {
        if (team > remaining) next[userId] = smallestTeam(next, remaining);
      }
      return next;
    });
    setTeamNames((current) => current.slice(0, remaining));
    setTeamCount(remaining);
  }

  function renameTeam(team: number, name: string) {
    setTeamNames((current) => {
      const next = [...current];
      next[team - 1] = name;
      return next;
    });
  }

  const areTeamsComplete = teamNumbers.every((team) =>
    participantIds.some((userId) => teamByUser[userId] === team),
  );

  const canSubmit =
    Boolean(template) &&
    participantIds.length > 0 &&
    scorekeeperId !== null &&
    (!isTeamGame || areTeamsComplete) &&
    !createSession.isPending;

  function handleSubmit() {
    if (!canSubmit || !scorekeeperId) return;
    createSession.mutate(
      {
        templateId,
        scorekeeperId,
        participantIds,
        teams: isTeamGame
          ? {
              numbers: participantIds.map((userId) => teamByUser[userId]),
              names: teamNumbers.map((team) => teamNames[team - 1]?.trim() || null),
            }
          : undefined,
      },
      {
        onSuccess: (newSession) => {
          navigation.replace('Session', { sessionId: newSession.id });
        },
      },
    );
  }

  return (
    <AvatarMarksProvider groupId={groupId}>
      <KeyboardAwareScrollView
        className="flex-1 bg-surface"
        contentContainerClassName="gap-8 px-6 pt-6"
        contentContainerStyle={{ paddingBottom: 48 + insets.bottom }}
        bottomOffset={24}
        keyboardShouldPersistTaps="handled"
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
          <Pressable
            onPress={() => setIsScoringOpen(true)}
            disabled={!template}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Puntentelling bekijken"
            className="active:opacity-60"
            testID="scoring-info-button"
          >
            <InfoIcon size={24} color={theme.inkSubtle} />
          </Pressable>
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

        {isTeamGame && members ? (
          <View>
            <SectionLabel>Teams</SectionLabel>
            <View className="mt-2 gap-3">
              {teamNumbers.map((team) => {
                const teamMembers = membersOfTeam(team);
                return (
                  <View key={team} className="gap-3 rounded-2xl border border-line bg-surface p-4">
                    <TextField
                      label={`Team ${team}`}
                      value={teamNames[team - 1] ?? ''}
                      onChangeText={(name) => renameTeam(team, name)}
                      placeholder={teamLabel(
                        team,
                        null,
                        teamMembers.map((member) => member.displayName),
                      )}
                      maxLength={MAX_TEAM_NAME_LENGTH}
                      testID={`team-name-input-${team}`}
                    />
                    {teamMembers.length === 0 ? (
                      <Text className="text-sm text-ink-muted">Nog geen spelers</Text>
                    ) : (
                      teamMembers.map((member) => (
                        <View key={member.userId} className="flex-row items-center gap-3">
                          <MemberAvatar member={member} size={28} />
                          <Text className="min-w-0 flex-1 text-base text-ink" numberOfLines={1}>
                            {member.displayName}
                          </Text>
                          <View className="flex-row gap-1">
                            {teamNumbers.map((option) => (
                              <Pressable
                                key={option}
                                onPress={() =>
                                  setTeamByUser((current) => ({
                                    ...current,
                                    [member.userId]: option,
                                  }))
                                }
                                accessibilityRole="button"
                                accessibilityLabel={`Naar team ${option}`}
                                accessibilityState={{ selected: option === team }}
                                className={`h-8 w-8 items-center justify-center rounded-full ${
                                  option === team
                                    ? 'bg-accent'
                                    : 'bg-surface-sunken active:opacity-70'
                                }`}
                              >
                                <Text
                                  className={`text-sm font-semibold ${
                                    option === team ? 'text-accent-fg' : 'text-ink-muted'
                                  }`}
                                >
                                  {option}
                                </Text>
                              </Pressable>
                            ))}
                          </View>
                        </View>
                      ))
                    )}
                    {team === teamCount && teamCount > MIN_TEAMS ? (
                      <Button label="Team verwijderen" variant="ghost" onPress={removeLastTeam} />
                    ) : null}
                  </View>
                );
              })}
              <Button
                label="Team toevoegen"
                variant="secondary"
                onPress={addTeam}
                disabled={teamCount >= Math.max(MIN_TEAMS, participantIds.length)}
              />
              {!areTeamsComplete ? (
                <Text className="text-sm text-ink-muted">
                  Elk team heeft minstens één speler nodig.
                </Text>
              ) : null}
            </View>
          </View>
        ) : null}

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
      </KeyboardAwareScrollView>

      {isScoringOpen && template ? (
        <ScoringInfoModal
          templateId={template.id}
          gameName={template.name}
          onClose={() => setIsScoringOpen(false)}
        />
      ) : null}
    </AvatarMarksProvider>
  );
}
