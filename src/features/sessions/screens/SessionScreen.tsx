import type { NavigationAction, RouteProp } from '@react-navigation/native';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import DraggableFlatList, { type RenderItemParams } from 'react-native-draggable-flatlist';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/Avatar';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { NumberStepper } from '@/components/NumberStepper';
import { ScoreBars } from '@/components/ScoreBars';
import { SectionLabel } from '@/components/SectionLabel';
import { useAuth } from '@/features/auth/context/AuthContext';
import { useGroupMembers, type GroupMember } from '@/features/groups/hooks/useGroupMembers';
import { scoringDirectionLabel, useGameTemplate } from '@/features/games/hooks/useGameTemplates';
import { RANK_FIELD_KEY, computeTotals } from '@/features/sessions/scoring';
import { useSessionParticipants } from '@/features/sessions/hooks/useSessionParticipants';
import { useSetScore, useSessionScores } from '@/features/sessions/hooks/useSessionScores';
import {
  useDeleteSession,
  useFinalizeSession,
  useSession,
} from '@/features/sessions/hooks/useSessions';
import type { AppStackParamList } from '@/navigation/types';

type Navigation = NativeStackNavigationProp<AppStackParamList>;

interface PlayerCardProps {
  member: GroupMember;
  isScorekeeper: boolean;
  fields: { key: string; label: string; sign: number; defaultValue: number }[];
  values: Record<string, number>;
  total: number;
  canEdit: boolean;
  isOpen: boolean;
  onToggleOpen: () => void;
  onChangeField: (fieldKey: string, value: number) => void;
}

function PlayerCard({
  member,
  isScorekeeper,
  fields,
  values,
  total,
  canEdit,
  isOpen,
  onToggleOpen,
  onChangeField,
}: PlayerCardProps) {
  return (
    <View className="overflow-hidden rounded-2xl border border-line bg-surface">
      <Pressable
        onPress={canEdit ? onToggleOpen : undefined}
        accessibilityRole={canEdit ? 'button' : undefined}
        className={`flex-row items-center gap-3 px-4 py-3 ${canEdit ? 'active:opacity-70' : ''}`}
      >
        <Avatar displayName={member.displayName} avatarUrl={member.avatarUrl} size={36} />
        <View className="min-w-0 flex-1 flex-row items-center gap-2">
          <Text className="min-w-0 flex-1 text-base font-semibold text-ink" numberOfLines={1}>
            {member.displayName}
          </Text>
          {isScorekeeper ? <Badge tone="accent">Scorebijhouder</Badge> : null}
        </View>
        <Text className="text-2xl font-bold text-ink">{total}</Text>
      </Pressable>

      {canEdit && isOpen ? (
        <View className="gap-3 border-t border-line px-4 py-3">
          {fields.map((field) => (
            <NumberStepper
              key={field.key}
              label={field.label}
              sign={field.sign === -1 ? -1 : 1}
              value={values[field.key] ?? field.defaultValue}
              onChange={(value) => onChangeField(field.key, value)}
              testID={`score-input-${member.userId}-${field.key}`}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function RankBadge({ position }: { position: number }) {
  return (
    <View className="h-7 w-7 items-center justify-center rounded-full bg-surface-sunken">
      <Text className="text-sm font-bold text-ink">{position}</Text>
    </View>
  );
}

/** Read-only finish order: the completed-session results, or the live view spectators see while
 *  the scorekeeper is still dragging. */
function RankedOrderList({ members }: { members: GroupMember[] }) {
  return (
    <View className="overflow-hidden rounded-2xl border border-line bg-surface">
      {members.map((member, index) => (
        <View
          key={member.userId}
          className={`flex-row items-center gap-3 px-4 py-3 ${index === 0 ? '' : 'border-t border-line'}`}
        >
          <RankBadge position={index + 1} />
          <Avatar displayName={member.displayName} avatarUrl={member.avatarUrl} size={32} />
          <Text className="min-w-0 flex-1 text-base font-semibold text-ink" numberOfLines={1}>
            {member.displayName}
          </Text>
        </View>
      ))}
    </View>
  );
}

function RankedEntryRow({
  position,
  member,
  drag,
  isActive,
}: {
  position: number;
  member: GroupMember;
  drag: () => void;
  isActive: boolean;
}) {
  return (
    <Pressable
      onLongPress={drag}
      disabled={isActive}
      accessibilityRole="button"
      accessibilityLabel={`Sleep ${member.displayName} naar een andere plek`}
      className={`flex-row items-center gap-3 rounded-2xl border px-4 py-3 ${
        isActive ? 'border-accent-line bg-accent-soft' : 'border-line bg-surface'
      }`}
    >
      <RankBadge position={position} />
      <Avatar displayName={member.displayName} avatarUrl={member.avatarUrl} size={32} />
      <Text className="min-w-0 flex-1 text-base font-semibold text-ink" numberOfLines={1}>
        {member.displayName}
      </Text>
      <Text className="text-lg text-ink-subtle">≡</Text>
    </Pressable>
  );
}

/** Drag-to-reorder finish order for a ranked template — there are no fields to enter, only who
 *  finished where. Local `order` is the source of truth while dragging: it starts from whatever
 *  rank values already exist (or participant order, for a session nobody has ordered yet) and only
 *  resyncs from props if the participant set itself changes, so the scorekeeper's own writes
 *  echoing back through realtime don't yank the list out from under an in-progress drag. */
function RankedEntryList({
  participants,
  scoresByUser,
  onReorder,
}: {
  participants: GroupMember[];
  scoresByUser: Record<string, Record<string, number>>;
  onReorder: (userIds: string[]) => void;
}) {
  const [order, setOrder] = useState<GroupMember[]>([]);

  useEffect(() => {
    if (participants.length === 0) return;
    setOrder((current) => {
      const currentIds = new Set(current.map((member) => member.userId));
      const sameMembership =
        current.length === participants.length &&
        participants.every((member) => currentIds.has(member.userId));
      if (sameMembership) return current;

      const next = [...participants].sort(
        (a, b) =>
          (scoresByUser[a.userId]?.[RANK_FIELD_KEY] ?? participants.length) -
          (scoresByUser[b.userId]?.[RANK_FIELD_KEY] ?? participants.length),
      );
      // Persists the order shown on first render too, not just after a drag — otherwise
      // finalising a session nobody ever dragged would leave every participant tied for last
      // (no rank rows written at all) instead of matching what's on screen.
      onReorder(next.map((member) => member.userId));
      return next;
    });
    // Only participant membership should trigger a resync — see the comment above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [participants]);

  return (
    <DraggableFlatList
      data={order}
      keyExtractor={(member) => member.userId}
      scrollEnabled={false}
      ItemSeparatorComponent={() => <View className="h-2" />}
      renderItem={({ item, getIndex, drag, isActive }: RenderItemParams<GroupMember>) => (
        <RankedEntryRow
          position={(getIndex() ?? 0) + 1}
          member={item}
          drag={drag}
          isActive={isActive}
        />
      )}
      onDragEnd={({ data }) => {
        setOrder(data);
        onReorder(data.map((member) => member.userId));
      }}
    />
  );
}

interface LeaveConfirmModalProps {
  visible: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

/** Guards the scorekeeper against abandoning a live session by accident — the back gesture, the
 *  header back button, and Android's hardware back button all funnel through the same
 *  `beforeRemove` event. Confirming deletes the session: there's no "in progress but nobody's
 *  keeping score" state to leave it in, so backing out has to mean throwing it away. */
function LeaveConfirmModal({ visible, onCancel, onConfirm }: LeaveConfirmModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable
        className="flex-1 items-center justify-center bg-surface-deep/70 px-6"
        onPress={onCancel}
        accessibilityLabel="Sluit"
      >
        <Pressable className="w-full max-w-sm gap-4 rounded-3xl border border-line bg-surface p-6">
          <View>
            <Text className="text-xl font-bold text-ink">Potje verwijderen?</Text>
            <Text className="mt-1 text-sm text-ink-muted">
              Als je nu teruggaat, wordt dit lopende potje verwijderd. Alle scores gaan verloren.
            </Text>
          </View>
          <Button label="Verwijderen" variant="secondary" onPress={onConfirm} />
          <Button label="Terug naar potje" onPress={onCancel} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/** A session in progress: live score entry for the scorekeeper, a read-only live view for
 *  everyone else, and a locked results view once it's finalised. */
export function SessionScreen() {
  const { sessionId } = useRoute<RouteProp<AppStackParamList, 'Session'>>().params;
  const navigation = useNavigation<Navigation>();
  const { session: authSession } = useAuth();
  const currentUserId = authSession?.user.id;
  // The header already covers the top inset; only the bottom matters here, and it's added
  // explicitly (rather than via <SafeAreaView>) so it stacks on top of a fixed padding class
  // instead of replacing it.
  const insets = useSafeAreaInsets();

  const { data: sessionData, isPending: isSessionPending, isError: isSessionError } =
    useSession(sessionId);
  const { data: members } = useGroupMembers(sessionData?.group_id ?? '');
  const { data: participantIds } = useSessionParticipants(sessionId);
  const { data: template } = useGameTemplate(sessionData?.template_id ?? '');
  const { data: scoresByUser } = useSessionScores(sessionId);
  const setScore = useSetScore(sessionId);
  const finalizeSession = useFinalizeSession(sessionId, sessionData?.group_id ?? '');
  const deleteSession = useDeleteSession(sessionId, sessionData?.group_id ?? '');

  const [openParticipantId, setOpenParticipantId] = useState<string | null>(currentUserId ?? null);

  const [isLeaveConfirmVisible, setIsLeaveConfirmVisible] = useState(false);
  const pendingLeaveActionRef = useRef<NavigationAction | null>(null);

  useLayoutEffect(() => {
    navigation.setOptions({ title: sessionData?.game_templates.name ?? 'Potje' });
  }, [navigation, sessionData?.game_templates.name]);

  // Covers the header back button, the swipe gesture, and Android's hardware back button alike —
  // all of them dispatch a GO_BACK action that fires this event before the screen is removed.
  // Only the scorekeeper backing out is destructive (it deletes the session), so that's the only
  // case this intercepts — a spectator leaving the live view has nothing to lose.
  useEffect(() => {
    return navigation.addListener('beforeRemove', (event) => {
      const isScorekeeper = currentUserId === sessionData?.scorekeeper_id;
      if (sessionData?.status !== 'in_progress' || !isScorekeeper) return;

      event.preventDefault();
      pendingLeaveActionRef.current = event.data.action;
      setIsLeaveConfirmVisible(true);
    });
  }, [navigation, sessionData?.status, sessionData?.scorekeeper_id, currentUserId]);

  function confirmLeave() {
    setIsLeaveConfirmVisible(false);
    const action = pendingLeaveActionRef.current;
    pendingLeaveActionRef.current = null;
    deleteSession.mutate();
    if (action) navigation.dispatch(action);
  }

  function cancelLeave() {
    setIsLeaveConfirmVisible(false);
    pendingLeaveActionRef.current = null;
  }

  if (isSessionPending) {
    return (
      <View className="flex-1 items-center justify-center bg-surface">
        <ActivityIndicator />
      </View>
    );
  }

  if (isSessionError || !sessionData) {
    return (
      <View className="flex-1 items-center justify-center bg-surface px-6">
        <Text className="text-center text-base text-ink-muted">
          Dit potje kon niet worden geladen.
        </Text>
      </View>
    );
  }

  const participants = (members ?? []).filter((member) =>
    (participantIds ?? []).includes(member.userId),
  );

  const fields = (template?.game_template_fields ?? []).map((field) => ({
    key: field.key,
    label: field.label,
    sign: field.sign,
    defaultValue: field.default_value,
  }));

  const isScorekeeper = currentUserId === sessionData.scorekeeper_id;
  const isInProgress = sessionData.status === 'in_progress';
  const canEdit = isScorekeeper && isInProgress;
  const isRanked = sessionData.game_templates.scoring_direction === 'ranked';

  const totals = computeTotals(
    participants.map((member) => member.userId),
    fields,
    template?.bonus_rules ?? [],
    scoresByUser ?? {},
    sessionData.game_templates.scoring_direction,
  );
  const totalByUserId = new Map(totals.map((entry) => [entry.userId, entry]));

  if (sessionData.status === 'completed') {
    const scoringDirection = sessionData.game_templates.scoring_direction;
    const orderedRows = participants
      .map((member) => {
        const entry = totalByUserId.get(member.userId);
        return { name: member.displayName, total: entry?.total ?? 0, isWinner: entry?.isWinner ?? false };
      })
      .sort((a, b) => (scoringDirection === 'highest_total_wins' ? b.total - a.total : a.total - b.total));

    const winners = participants.filter((member) => totalByUserId.get(member.userId)?.isWinner);
    const orderedMembers = [...participants].sort(
      (a, b) => (totalByUserId.get(a.userId)?.total ?? 0) - (totalByUserId.get(b.userId)?.total ?? 0),
    );

    return (
      <View className="flex-1 bg-surface">
        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-8 px-6 pt-6"
          contentContainerStyle={{ paddingBottom: 24 + insets.bottom }}
        >
          <View className="items-center">
            {winners.length === 1 ? (
              <>
                <Avatar
                  displayName={winners[0].displayName}
                  avatarUrl={winners[0].avatarUrl}
                  size={72}
                />
                <View className="mt-3">
                  <Badge tone="success">Winnaar</Badge>
                </View>
                <Text className="mt-2 text-2xl font-bold text-ink">{winners[0].displayName}</Text>
              </>
            ) : (
              <>
                <View className="mt-3">
                  <Badge tone="success">Gelijkspel</Badge>
                </View>
                <Text className="mt-2 text-2xl font-bold text-ink">
                  {winners.map((member) => member.displayName).join(' & ')}
                </Text>
              </>
            )}
            <Text className="mt-1 text-base text-ink-muted">
              {sessionData.game_templates.name} · {scoringDirectionLabel(scoringDirection)}
            </Text>
          </View>

          <View>
            <SectionLabel>Eindstand</SectionLabel>
            {isRanked ? (
              <View className="mt-2">
                <RankedOrderList members={orderedMembers} />
              </View>
            ) : (
              <Card className="mt-2">
                <ScoreBars rows={orderedRows} />
              </Card>
            )}
          </View>

          <Button label="Terug naar groep" onPress={() => navigation.goBack()} />
        </ScrollView>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-surface">
      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-8 px-6 pt-6"
        // Without the pinned footer (a read-only viewer), the scroll content itself is the last
        // thing above the bottom of the screen and needs the inset added directly.
        contentContainerStyle={{ paddingBottom: canEdit ? 24 : 24 + insets.bottom }}
      >
        <View>
          <SectionLabel>Deelnemers</SectionLabel>
          {isRanked ? (
            canEdit ? (
              <View className="mt-2">
                <RankedEntryList
                  participants={participants}
                  scoresByUser={scoresByUser ?? {}}
                  onReorder={(userIds) =>
                    userIds.forEach((userId, index) =>
                      setScore.mutate({ userId, fieldKey: RANK_FIELD_KEY, value: index + 1 }),
                    )
                  }
                />
              </View>
            ) : (
              <View className="mt-2">
                <RankedOrderList
                  members={[...participants].sort(
                    (a, b) =>
                      (totalByUserId.get(a.userId)?.total ?? 0) -
                      (totalByUserId.get(b.userId)?.total ?? 0),
                  )}
                />
              </View>
            )
          ) : (
            <View className="mt-2 gap-2">
              {participants.map((member) => (
                <PlayerCard
                  key={member.userId}
                  member={member}
                  isScorekeeper={member.userId === sessionData.scorekeeper_id}
                  fields={fields}
                  values={(scoresByUser ?? {})[member.userId] ?? {}}
                  total={totalByUserId.get(member.userId)?.total ?? 0}
                  canEdit={canEdit}
                  isOpen={openParticipantId === member.userId}
                  onToggleOpen={() =>
                    setOpenParticipantId((current) => (current === member.userId ? null : member.userId))
                  }
                  onChangeField={(fieldKey, value) =>
                    setScore.mutate({ userId: member.userId, fieldKey, value })
                  }
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {canEdit ? (
        // Pinned rather than appended to the scroll content, the way GamesTab pins "Spel
        // toevoegen": ending the session should stay reachable and in a fixed spot regardless of
        // participant count or which card is expanded.
        <View
          className="border-t border-line px-6 pt-4"
          style={{ paddingBottom: 16 + insets.bottom }}
        >
          <Button
            label="Potje afronden"
            onPress={() => finalizeSession.mutate()}
            isLoading={finalizeSession.isPending}
            testID="finalize-session-submit"
          />
        </View>
      ) : null}

      <LeaveConfirmModal
        visible={isLeaveConfirmVisible}
        onCancel={cancelLeave}
        onConfirm={confirmLeave}
      />
    </View>
  );
}
