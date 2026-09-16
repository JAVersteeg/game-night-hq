import type { NavigationAction, RouteProp } from '@react-navigation/native';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ActivityIndicator, Modal, Pressable, View } from 'react-native';
import { Text } from '@/components/Text';
import DraggableFlatList, { type RenderItemParams } from 'react-native-draggable-flatlist';
import { KeyboardAwareScrollView, KeyboardStickyView } from 'react-native-keyboard-controller';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/Avatar';
import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ChoiceRow } from '@/components/ChoiceRow';
import { NumberStepper } from '@/components/NumberStepper';
import { ScoreBars } from '@/components/ScoreBars';
import { SectionLabel } from '@/components/SectionLabel';
import { TextField } from '@/components/TextField';
import { useAuth } from '@/features/auth/context/AuthContext';
import { useGroupMembers, type GroupMember } from '@/features/groups/hooks/useGroupMembers';
import { CoverThumbnail } from '@/components/CoverThumbnail';
import { gameColorForTemplate } from '@/features/games/colors';
import { coverImageForTemplate } from '@/features/games/covers';
import { useGameTemplate } from '@/features/games/hooks/useGameTemplates';
import {
  RANK_FIELD_KEY,
  computeBreakdown,
  computeTotals,
  roundRankPoints,
  higherTotalIsBetter,
} from '@/features/sessions/scoring';
import {
  useAddSessionNote,
  useDeleteSessionNote,
  useSessionNotes,
  type SessionNote,
} from '@/features/sessions/hooks/useSessionNotes';
import { useSessionParticipants } from '@/features/sessions/hooks/useSessionParticipants';
import { useSetScore, useSessionScores } from '@/features/sessions/hooks/useSessionScores';
import type { RoundFieldValues } from '@/features/sessions/hooks/useSessions';
import {
  useCommitRound,
  useDeleteSession,
  useFinalizeSession,
  useSession,
  useUndoRound,
} from '@/features/sessions/hooks/useSessions';
import type { AppStackParamList } from '@/navigation/types';

type Navigation = NativeStackNavigationProp<AppStackParamList>;

interface PlayerCardProps {
  member: GroupMember;
  isScorekeeper: boolean;
  fields: { key: string; label: string; sign: number; defaultValue: number; exclusive: boolean }[];
  values: Record<string, number>;
  total: number;
  /** This round's signed field total, shown as "+X" next to the total — only passed in field-rounds
   *  mode, where a collapsed card otherwise gives no sign that anything's been entered this round
   *  (`values` there is the round's own draft, not what's already in the running total). */
  roundDelta?: number;
  canEdit: boolean;
  isOpen: boolean;
  onToggleOpen: () => void;
  onChangeField: (fieldKey: string, value: number) => void;
}

/** A field at most one participant may hold per session — Catan's longest trade route, largest
 *  army. Rendered as an on/off toggle worth its fixed point value rather than a free-entry
 *  stepper; turning it on for this participant is what triggers clearing every other participant,
 *  handled by the caller's `onChangeField` (see SessionScreen's handleFieldChange). */
function ExclusiveFieldToggle({
  label,
  pointValue,
  isHeld,
  onToggle,
  testID,
}: {
  label: string;
  pointValue: number;
  isHeld: boolean;
  onToggle: (isHeld: boolean) => void;
  testID?: string;
}) {
  return (
    <Pressable
      onPress={() => onToggle(!isHeld)}
      accessibilityRole="switch"
      accessibilityState={{ checked: isHeld }}
      testID={testID}
      className="flex-row items-center gap-3"
    >
      <View className="min-w-0 flex-1">
        <Text className="text-base font-medium text-ink" numberOfLines={1}>
          {label}
        </Text>
      </View>
      <Badge tone={isHeld ? 'success' : 'neutral'}>
        {isHeld ? `Behaald (+${pointValue})` : 'Niet behaald'}
      </Badge>
    </Pressable>
  );
}

function PlayerCard({
  member,
  isScorekeeper,
  fields,
  values,
  total,
  roundDelta,
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
        <Avatar
          displayName={member.displayName}
          avatarUrl={member.avatarUrl}
          color={member.color}
          size={36}
        />
        <View className="min-w-0 flex-1 flex-row items-center gap-2">
          <Text className="min-w-0 flex-1 text-base font-semibold text-ink" numberOfLines={1}>
            {member.displayName}
          </Text>
          {isScorekeeper ? <Badge tone="accent">Scorebijhouder</Badge> : null}
        </View>
        <View className="items-end">
          <Text className="text-2xl font-bold text-ink">{total}</Text>
          {roundDelta !== undefined ? (
            <Text className="text-xs font-semibold text-accent">
              {roundDelta >= 0 ? `+${roundDelta}` : roundDelta}
            </Text>
          ) : null}
        </View>
      </Pressable>

      {canEdit && isOpen ? (
        <View className="gap-3 border-t border-line px-4 py-3">
          {fields.map((field) =>
            field.exclusive ? (
              <ExclusiveFieldToggle
                key={field.key}
                label={field.label}
                pointValue={field.defaultValue}
                isHeld={(values[field.key] ?? 0) !== 0}
                onToggle={(isHeld) => onChangeField(field.key, isHeld ? field.defaultValue : 0)}
                testID={`score-input-${member.userId}-${field.key}`}
              />
            ) : (
              <NumberStepper
                key={field.key}
                label={field.label}
                sign={field.sign === -1 ? -1 : 1}
                value={values[field.key] ?? field.defaultValue}
                onChange={(value) => onChangeField(field.key, value)}
                testID={`score-input-${member.userId}-${field.key}`}
              />
            ),
          )}
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
          <Avatar
            displayName={member.displayName}
            avatarUrl={member.avatarUrl}
            color={member.color}
            size={32}
          />
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
  score,
  drag,
  isActive,
}: {
  position: number;
  member: GroupMember;
  /** Only rounds games have anything to show here: the points banked so far and what this place
   *  would add. A plain ranked game has no running score at all. */
  score?: { total: number; delta: number };
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
      <Avatar
        displayName={member.displayName}
        avatarUrl={member.avatarUrl}
        color={member.color}
        size={32}
      />
      <Text className="min-w-0 flex-1 text-base font-semibold text-ink" numberOfLines={1}>
        {member.displayName}
      </Text>
      {score ? (
        <View className="items-end">
          <Text className="text-base font-bold text-ink">{score.total}</Text>
          <Text className="text-xs font-semibold text-accent">+{score.delta}</Text>
        </View>
      ) : null}
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

/** The scorekeeper's view of the round being played: the same drag-to-reorder list a ranked game
 *  uses, but the order isn't a result on its own — it's the input to "Volgende ronde", which is what
 *  turns it into points. The order therefore lives in the parent (which owns the commit) rather
 *  than here, and nothing is written until a round is banked. */
function RoundsEntryList({
  order,
  totalByUserId,
  onOrderChange,
}: {
  order: GroupMember[];
  totalByUserId: Map<string, number>;
  onOrderChange: (userIds: string[]) => void;
}) {
  return (
    <DraggableFlatList
      data={order}
      keyExtractor={(member) => member.userId}
      scrollEnabled={false}
      ItemSeparatorComponent={() => <View className="h-2" />}
      renderItem={({ item, getIndex, drag, isActive }: RenderItemParams<GroupMember>) => {
        const position = (getIndex() ?? 0) + 1;
        return (
          <RankedEntryRow
            position={position}
            member={item}
            score={{
              total: totalByUserId.get(item.userId) ?? 0,
              delta: roundRankPoints(position, order.length),
            }}
            drag={drag}
            isActive={isActive}
          />
        );
      }}
      onDragEnd={({ data }) => onOrderChange(data.map((member) => member.userId))}
    />
  );
}

/** Standings of a rounds game: what a spectator sees, and what the scorekeeper's undo works back
 *  from. Totals only update when a round is banked, so this is the live view in full — the order
 *  being dragged right now is local to the scorekeeper's device until they commit it. */
function RoundsStandingsList({
  members,
  totalByUserId,
}: {
  members: GroupMember[];
  totalByUserId: Map<string, number>;
}) {
  return (
    <View className="overflow-hidden rounded-2xl border border-line bg-surface">
      {members.map((member, index) => (
        <View
          key={member.userId}
          className={`flex-row items-center gap-3 px-4 py-3 ${index === 0 ? '' : 'border-t border-line'}`}
        >
          <RankBadge position={index + 1} />
          <Avatar
            displayName={member.displayName}
            avatarUrl={member.avatarUrl}
            color={member.color}
            size={32}
          />
          <Text className="min-w-0 flex-1 text-base font-semibold text-ink" numberOfLines={1}>
            {member.displayName}
          </Text>
          <Text className="text-xl font-bold text-ink">
            {totalByUserId.get(member.userId) ?? 0}
          </Text>
        </View>
      ))}
    </View>
  );
}

/** Ending a rounds game has one question a normal session doesn't: the order on screen is a round
 *  in progress that was never banked, so finishing has to say whether it still counts. Counting it
 *  is the default — the usual reason to finish is that the last round just ended. */
function FinishRoundsModal({
  roundNumber,
  countsCurrentRound,
  onToggleCurrentRound,
  onCancel,
  onConfirm,
  isPending,
  hasFailed,
}: {
  roundNumber: number;
  countsCurrentRound: boolean;
  onToggleCurrentRound: () => void;
  onCancel: () => void;
  onConfirm: () => void;
  isPending: boolean;
  /** Finishing is a two-step write (bank the round, then lock the session); without this a failure
   *  anywhere in it would just leave the dialog open with no explanation. */
  hasFailed: boolean;
}) {
  // Without a single banked round there is nothing to keep, so confirming throws the session away
  // rather than filing an all-zero result in the history.
  const willDiscardSession = roundNumber === 1 && !countsCurrentRound;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable
        className="flex-1 items-center justify-center bg-surface-deep/70 px-6"
        onPress={onCancel}
        accessibilityLabel="Sluit"
      >
        <Pressable className="w-full max-w-sm gap-4 rounded-3xl border border-line bg-surface p-6">
          <View>
            <Text className="text-xl font-bold text-ink">Weet je het zeker?</Text>
            <Text className="mt-1 text-sm text-ink-muted">
              {willDiscardSession
                ? 'Er is nog geen ronde gespeeld, dus dit potje wordt verwijderd.'
                : 'Hierna staat de eindstand vast en kun je geen rondes meer spelen.'}
            </Text>
          </View>
          <ChoiceRow
            title={`Ronde ${roundNumber} meetellen`}
            meta="De volgorde zoals die nu op je scherm staat"
            mode="check"
            selected={countsCurrentRound}
            onSelect={onToggleCurrentRound}
            testID="finish-count-current-round"
          />
          {hasFailed ? (
            <Text className="text-sm text-danger">
              Afronden is niet gelukt. Controleer je verbinding en probeer het opnieuw.
            </Text>
          ) : null}
          <Button
            label={willDiscardSession ? 'Potje verwijderen' : 'Afronden'}
            onPress={onConfirm}
            isLoading={isPending}
            testID="finish-rounds-confirm"
          />
          <Button label="Annuleren" variant="secondary" onPress={onCancel} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

interface DeleteNoteConfirmModalProps {
  onCancel: () => void;
  onConfirm: () => void;
  isPending: boolean;
}

/** A note has no undo once it's gone — unlike a score, which can just be re-entered — so deleting
 *  one asks first, the same way leaving a live session does. */
function DeleteNoteConfirmModal({ onCancel, onConfirm, isPending }: DeleteNoteConfirmModalProps) {
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable
        className="flex-1 items-center justify-center bg-surface-deep/70 px-6"
        onPress={onCancel}
        accessibilityLabel="Sluit"
      >
        <Pressable className="w-full max-w-sm gap-4 rounded-3xl border border-line bg-surface p-6">
          <View>
            <Text className="text-xl font-bold text-ink">Notitie verwijderen?</Text>
            <Text className="mt-1 text-sm text-ink-muted">
              Deze notitie is daarna niet meer terug te halen.
            </Text>
          </View>
          <Button
            label="Verwijderen"
            variant="secondary"
            onPress={onConfirm}
            isLoading={isPending}
            testID="delete-note-confirm"
          />
          <Button label="Annuleren" onPress={onCancel} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

interface LeaveConfirmModalProps {
  onCancel: () => void;
  onConfirm: () => void;
}

/** Guards the scorekeeper against abandoning a live session by accident — the back gesture, the
 *  header back button, and Android's hardware back button all funnel through the same
 *  `beforeRemove` event. Confirming deletes the session: there's no "in progress but nobody's
 *  keeping score" state to leave it in, so backing out has to mean throwing it away. */
function LeaveConfirmModal({ onCancel, onConfirm }: LeaveConfirmModalProps) {
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onCancel}>
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

/** An append-only log, oldest first. Any group member can add one while `canWrite` holds (in
 *  progress, or within the 2-hour grace window after completion), but only the author can delete
 *  their own — RLS is the real enforcement, this just hides the affordance. */
function SessionNotesSection({
  notes,
  authorNameById,
  currentUserId,
  canWrite,
  draft,
  onDraftChange,
  onAdd,
  onDelete,
  isAdding,
}: {
  notes: SessionNote[];
  authorNameById: Map<string, string>;
  currentUserId: string | undefined;
  canWrite: boolean;
  draft: string;
  onDraftChange: (value: string) => void;
  onAdd: () => void;
  onDelete: (noteId: string) => void;
  isAdding: boolean;
}) {
  return (
    <View>
      <SectionLabel>Notities</SectionLabel>
      <View className="mt-2 gap-2">
        {notes.length === 0 ? (
          <Text className="text-sm text-ink-muted">Nog geen notities voor dit potje.</Text>
        ) : (
          notes.map((note) => (
            <View key={note.id} className="rounded-2xl border border-line bg-surface px-4 py-3">
              <View className="flex-row items-start gap-3">
                <View className="min-w-0 flex-1">
                  <Text className="text-base text-ink">{note.body}</Text>
                  <Text className="mt-1 text-xs text-ink-subtle">
                    {authorNameById.get(note.author_id) ?? 'Onbekend'} ·{' '}
                    {format(new Date(note.created_at), 'HH:mm', { locale: nl })}
                  </Text>
                </View>
                {canWrite && note.author_id === currentUserId ? (
                  <Pressable
                    onPress={() => onDelete(note.id)}
                    accessibilityRole="button"
                    accessibilityLabel="Notitie verwijderen"
                    className="active:opacity-70"
                  >
                    <Text className="text-sm font-semibold text-danger">Verwijderen</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          ))
        )}
      </View>
      {canWrite ? (
        <View className="mt-3 gap-2">
          <TextField
            value={draft}
            onChangeText={onDraftChange}
            placeholder="Notitie toevoegen…"
            testID="session-note-input"
          />
          <Button
            label="Toevoegen"
            variant="secondary"
            onPress={onAdd}
            isLoading={isAdding}
            disabled={draft.trim().length === 0}
            testID="session-note-submit"
          />
        </View>
      ) : null}
    </View>
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

  const {
    data: sessionData,
    isPending: isSessionPending,
    isError: isSessionError,
  } = useSession(sessionId);
  const { data: members } = useGroupMembers(sessionData?.group_id ?? '');
  const { data: participantIds } = useSessionParticipants(sessionId);
  const { data: template } = useGameTemplate(sessionData?.template_id ?? '');
  const { data: scoresByUser } = useSessionScores(sessionId);
  const setScore = useSetScore(sessionId);
  const finalizeSession = useFinalizeSession(sessionId, sessionData?.group_id ?? '');
  const deleteSession = useDeleteSession(sessionId, sessionData?.group_id ?? '');
  const commitRound = useCommitRound(sessionId);
  const undoRound = useUndoRound(sessionId);
  const { data: notes } = useSessionNotes(sessionId);
  const addNote = useAddSessionNote(sessionId);
  const deleteNote = useDeleteSessionNote(sessionId);

  const [openParticipantId, setOpenParticipantId] = useState<string | null>(currentUserId ?? null);
  const [noteDraft, setNoteDraft] = useState('');
  const [pendingDeleteNoteId, setPendingDeleteNoteId] = useState<string | null>(null);

  const [isLeaveConfirmVisible, setIsLeaveConfirmVisible] = useState(false);
  const pendingLeaveActionRef = useRef<NavigationAction | null>(null);
  // Leaving is normally a destructive accident worth guarding, but the finish flow deletes a
  // roundless session on purpose and then navigates away — this lets that one case through.
  const skipLeaveGuardRef = useRef(false);

  // The finish order of the round being played, as ids. Local until "Volgende ronde" banks it:
  // nothing about an unfinished round is written to the server, which is also why a spectator sees
  // standings rather than a live order. Only relevant for a ranked-and-rounds template.
  const [roundOrder, setRoundOrder] = useState<string[] | null>(null);
  // The field entries for the round being played, keyed by participant then field key — the
  // highest/lowest_total_wins-rounds counterpart of `roundOrder`. Local for the same reason: it's
  // only added onto the running totals once "Volgende ronde" banks it.
  const [fieldRoundDraft, setFieldRoundDraft] = useState<RoundFieldValues>({});
  const [isFinishRoundsVisible, setIsFinishRoundsVisible] = useState(false);
  const [countsCurrentRound, setCountsCurrentRound] = useState(true);
  // Measured so a focused field scrolls clear of the pinned footer, which sits above the keyboard.
  const [footerHeight, setFooterHeight] = useState(0);

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
      if (skipLeaveGuardRef.current) return;

      event.preventDefault();
      pendingLeaveActionRef.current = event.data.action;
      setIsLeaveConfirmVisible(true);
    });
  }, [navigation, sessionData?.status, sessionData?.scorekeeper_id, currentUserId]);

  // A new round starts in the order the previous one finished in — that's how the game actually
  // plays, and it saves re-dragging the whole table when only two players swapped. Round one has no
  // predecessor, so it falls back to the participant order chosen when the session was created.
  // Only a change in who's playing reseeds; `last_round_order` moving (a commit, an undo) must not
  // yank the list out from under an in-progress drag.
  const lastRoundOrder = sessionData?.last_round_order;
  useEffect(() => {
    const ids = participantIds ?? [];
    if (ids.length === 0) return;
    setRoundOrder((current) => {
      const isSameMembership =
        current !== null &&
        current.length === ids.length &&
        current.every((userId) => ids.includes(userId));
      if (isSameMembership) return current;

      const seed = (lastRoundOrder ?? []).filter((userId) => ids.includes(userId));
      return [...seed, ...ids.filter((userId) => !seed.includes(userId))];
    });
  }, [participantIds, lastRoundOrder]);

  // A field-rounds draft has nothing to carry between rounds (unlike the drag order, it starts
  // empty every time), so it only needs clearing out if someone who's in it stops being a
  // participant.
  useEffect(() => {
    const ids = new Set(participantIds ?? []);
    setFieldRoundDraft((current) => {
      const stale = Object.keys(current).some((userId) => !ids.has(userId));
      if (!stale) return current;
      return Object.fromEntries(Object.entries(current).filter(([userId]) => ids.has(userId)));
    });
  }, [participantIds]);

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
    exclusive: field.exclusive,
  }));

  /** Writes one participant's field value and, for an exclusive field, clears it for every other
   *  participant that currently holds it — enforcing the at-most-one-holder rule client-side. */
  function handleFieldChange(userId: string, fieldKey: string, value: number) {
    const field = fields.find((candidate) => candidate.key === fieldKey);
    if (field?.exclusive && value !== 0) {
      for (const member of participants) {
        if (member.userId === userId) continue;
        if (((scoresByUser ?? {})[member.userId]?.[fieldKey] ?? 0) !== 0) {
          setScore.mutate({ userId: member.userId, fieldKey, value: 0 });
        }
      }
    }
    setScore.mutate({ userId, fieldKey, value });
  }

  /** Same exclusivity rule as `handleFieldChange`, but against this round's local draft rather than
   *  the committed running totals — nothing here is written to the server until the round is
   *  banked. */
  function handleFieldRoundChange(userId: string, fieldKey: string, value: number) {
    const field = fields.find((candidate) => candidate.key === fieldKey);
    setFieldRoundDraft((current) => {
      const next: RoundFieldValues = { ...current };
      if (field?.exclusive && value !== 0) {
        for (const member of participants) {
          if (member.userId === userId) continue;
          if ((next[member.userId]?.[fieldKey] ?? 0) !== 0) {
            next[member.userId] = { ...next[member.userId], [fieldKey]: 0 };
          }
        }
      }
      next[userId] = { ...next[userId], [fieldKey]: value };
      return next;
    });
  }

  const isScorekeeper = currentUserId === sessionData.scorekeeper_id;
  const isInProgress = sessionData.status === 'in_progress';
  const canEdit = isScorekeeper && isInProgress;
  // Mirrors `can_write_session_notes`: notes are everyone's, not just the scorekeeper's — any
  // group member can add one while the session is live, plus a 2-hour grace window after
  // finalising so the table can still write up what happened. Same window RLS enforces.
  const canWriteNotes =
    isInProgress ||
    (sessionData.completed_at !== null &&
      Date.now() - new Date(sessionData.completed_at).getTime() < 2 * 60 * 60 * 1000);
  // Keyed off group members, not participants: someone who sat this one out can still comment.
  const authorNameById = new Map(
    (members ?? []).map((member) => [member.userId, member.displayName]),
  );

  function handleAddNote() {
    const body = noteDraft.trim();
    if (!body || !currentUserId) return;
    addNote.mutate({ authorId: currentUserId, body }, { onSuccess: () => setNoteDraft('') });
  }

  function confirmDeleteNote() {
    if (!pendingDeleteNoteId) return;
    deleteNote.mutate(pendingDeleteNoteId, { onSuccess: () => setPendingDeleteNoteId(null) });
  }
  const isRanked = sessionData.game_templates.scoring_direction === 'ranked';
  const isRounds = sessionData.game_templates.rounds;
  // Rounds splits into two mechanics depending on direction: ranked-and-rounds drags a finish
  // order each round (Dalmuti); a rounds template with real fields repeats the field-entry form
  // each round instead. Only one of the two is ever true.
  const isRankedRounds = isRanked && isRounds;
  const isFieldRounds = isRounds && !isRanked;
  const roundCount = sessionData.game_templates.round_count;
  const roundsPlayed = sessionData.rounds_played;
  const roundNumber = roundsPlayed + 1;
  const roundLabel = roundCount ? `Ronde ${roundNumber} van ${roundCount}` : `Ronde ${roundNumber}`;
  // Only the round that `last_round_order`/`last_round_values` describes can be taken back, and
  // undoing clears whichever one was set — so the button disappears until another round is banked.
  const canUndoRound =
    sessionData.last_round_order !== null || sessionData.last_round_values !== null;

  const totals = computeTotals(
    participants.map((member) => member.userId),
    fields,
    template?.bonus_rules ?? [],
    scoresByUser ?? {},
    sessionData.game_templates.scoring_direction,
    isRounds,
  );
  const totalByUserId = new Map(totals.map((entry) => [entry.userId, entry]));
  const pointsByUserId = new Map(totals.map((entry) => [entry.userId, entry.total]));
  const memberById = new Map(participants.map((member) => [member.userId, member]));
  const roundMembers = (roundOrder ?? [])
    .map((userId) => memberById.get(userId))
    .filter((member): member is GroupMember => member !== undefined);
  // Standings, best first — the same order the result screen will end up showing.
  const standingsMembers = [...participants].sort(
    (a, b) => (pointsByUserId.get(b.userId) ?? 0) - (pointsByUserId.get(a.userId) ?? 0),
  );

  /** Once round_count rounds have been banked, the finish dialog opens on its own — but the round
   *  now on screen is a fresh, untouched one, so "count it too" starts unchecked rather than the
   *  usual default. round_count is a nudge, not a wall: cancelling this leaves the session exactly
   *  as playable as before, nothing is forced. */
  function maybeOfferFinish(bankedRoundNumber: number) {
    if (roundCount != null && bankedRoundNumber >= roundCount) {
      commitRound.reset();
      finalizeSession.reset();
      setCountsCurrentRound(false);
      setIsFinishRoundsVisible(true);
    }
  }

  function handleNextRound() {
    const bankedRoundNumber = roundsPlayed + 1;
    if (isRankedRounds) {
      if (!roundOrder || roundOrder.length === 0) return;
      commitRound.mutate(
        { order: roundOrder },
        { onSuccess: () => maybeOfferFinish(bankedRoundNumber) },
      );
      return;
    }
    commitRound.mutate(
      { values: fieldRoundDraft },
      {
        onSuccess: () => {
          setFieldRoundDraft({});
          maybeOfferFinish(bankedRoundNumber);
        },
      },
    );
  }

  /** Reverses the last banked round and drops the scorekeeper back into it to correct, whichever
   *  shape it was. */
  function handleUndoRound() {
    undoRound.mutate(undefined, {
      onSuccess: (result) => {
        if ('order' in result) setRoundOrder(result.order);
        else setFieldRoundDraft(result.values);
      },
    });
  }

  function confirmFinishRounds() {
    // Whether the current round can actually be banked — not just whether the checkbox is on.
    // Without this, a null/empty `roundOrder` would fall through to a bare `finalize()` below while
    // still being counted as a banked round here, completing the session with nothing written.
    const willBankCurrentRound =
      countsCurrentRound &&
      (isRankedRounds ? Boolean(roundOrder && roundOrder.length > 0) : isFieldRounds);
    const bankedRounds = roundsPlayed + (willBankCurrentRound ? 1 : 0);

    // Nothing was ever played, so there's no result worth filing — the session is thrown away
    // instead of landing in the history as a table of zeroes.
    if (bankedRounds === 0) {
      skipLeaveGuardRef.current = true;
      deleteSession.mutate(undefined, { onSuccess: () => navigation.goBack() });
      return;
    }

    const finalize = () =>
      finalizeSession.mutate(undefined, { onSuccess: () => setIsFinishRoundsVisible(false) });

    if (willBankCurrentRound) {
      if (isRankedRounds && roundOrder) {
        commitRound.mutate({ order: roundOrder }, { onSuccess: finalize });
        return;
      }
      commitRound.mutate({ values: fieldRoundDraft }, { onSuccess: finalize });
      return;
    }
    finalize();
  }

  if (sessionData.status === 'completed') {
    const scoringDirection = sessionData.game_templates.scoring_direction;
    const gameName = sessionData.game_templates.name;
    const coverKey = sessionData.game_templates.cover_key;
    const orderedRows = participants
      .map((member) => {
        const entry = totalByUserId.get(member.userId);
        return {
          name: member.displayName,
          total: entry?.total ?? 0,
          isWinner: entry?.isWinner ?? false,
          breakdown: computeBreakdown(
            fields,
            template?.bonus_rules ?? [],
            (scoresByUser ?? {})[member.userId] ?? {},
          ),
        };
      })
      .sort((a, b) =>
        higherTotalIsBetter(scoringDirection, isRounds) ? b.total - a.total : a.total - b.total,
      );

    const winners = participants.filter((member) => totalByUserId.get(member.userId)?.isWinner);
    const orderedMembers = [...participants].sort(
      (a, b) =>
        (totalByUserId.get(a.userId)?.total ?? 0) - (totalByUserId.get(b.userId)?.total ?? 0),
    );

    return (
      <View className="flex-1 bg-surface">
        <KeyboardAwareScrollView
          className="flex-1"
          contentContainerClassName="gap-8 px-6 pt-6"
          contentContainerStyle={{ paddingBottom: 24 + insets.bottom }}
          bottomOffset={24}
          keyboardShouldPersistTaps="handled"
        >
          <Card className="gap-4">
            <View className="flex-row items-center gap-4">
              <CoverThumbnail
                source={coverImageForTemplate(coverKey, gameName)}
                color={gameColorForTemplate(coverKey, gameName)}
                size={80}
              />
              <View className="min-w-0 flex-1">
                <Text className="text-2xl font-bold text-ink" numberOfLines={2}>
                  {gameName}
                </Text>
                <Text className="mt-1 text-sm text-ink-muted">
                  {format(new Date(sessionData.played_at), 'd MMMM yyyy', { locale: nl })}
                  {isRounds
                    ? ` · ${sessionData.rounds_played} ${sessionData.rounds_played === 1 ? 'ronde' : 'rondes'}`
                    : ''}
                </Text>
              </View>
            </View>

            <View className="flex-row items-center gap-3 border-t border-line pt-4">
              <View className="relative flex-row">
                {winners.map((member, index) => (
                  // A tie stacks the winners' avatars, each ringed in the card colour so the
                  // overlap reads as separate faces.
                  <View
                    key={member.userId}
                    className="rounded-full border-2 border-surface"
                    style={{ marginLeft: index === 0 ? 0 : -14 }}
                  >
                    <Avatar
                      displayName={member.displayName}
                      avatarUrl={member.avatarUrl}
                      color={member.color}
                      size={48}
                    />
                  </View>
                ))}
                {/* Trophy badge overlaps the last (topmost) avatar's corner, like a notification
                    dot, instead of spelling "Winnaar" out as a separate pill next to the name. */}
                <View className="absolute -bottom-1 -right-1 h-6 w-6 items-center justify-center rounded-full border-2 border-surface bg-surface-muted">
                  <Text className="text-xs leading-none">🏆</Text>
                </View>
              </View>
              <View className="min-w-0 flex-1 items-start">
                <Text className="text-xl font-bold text-ink" numberOfLines={2}>
                  {winners.map((member) => member.displayName).join(' & ')}
                </Text>
              </View>
            </View>
          </Card>

          <View>
            <SectionLabel>Eindstand</SectionLabel>
            {/* A plain ranked template has only a finish position to show; ranked-and-rounds
                (Dalmuti) banked real points round by round, so it gets the same points bar as a
                field-based template rather than an ordinal list. */}
            {isRanked && !isRounds ? (
              <View className="mt-2">
                <RankedOrderList members={orderedMembers} />
              </View>
            ) : (
              <Card className="mt-2">
                <ScoreBars rows={orderedRows} />
              </Card>
            )}
          </View>

          <SessionNotesSection
            notes={notes ?? []}
            authorNameById={authorNameById}
            currentUserId={currentUserId}
            canWrite={canWriteNotes}
            draft={noteDraft}
            onDraftChange={setNoteDraft}
            onAdd={handleAddNote}
            onDelete={setPendingDeleteNoteId}
            isAdding={addNote.isPending}
          />
        </KeyboardAwareScrollView>

        {pendingDeleteNoteId ? (
          <DeleteNoteConfirmModal
            onCancel={() => setPendingDeleteNoteId(null)}
            onConfirm={confirmDeleteNote}
            isPending={deleteNote.isPending}
          />
        ) : null}
      </View>
    );
  }

  return (
    <View className="flex-1 bg-surface">
      <KeyboardAwareScrollView
        className="flex-1"
        contentContainerClassName="gap-8 px-6 pt-6"
        // Without the pinned footer (a read-only viewer), the scroll content itself is the last
        // thing above the bottom of the screen and needs the inset added directly.
        contentContainerStyle={{ paddingBottom: canEdit ? 24 : 24 + insets.bottom }}
        // The footer rides above the keyboard (KeyboardStickyView below), so a focused field has
        // to clear it. Only part of the footer is visible there: the sticky offset pulls its
        // safe-area padding down behind the keyboard, so that part doesn't count.
        bottomOffset={8 + Math.max(footerHeight - insets.bottom, 0)}
        keyboardShouldPersistTaps="handled"
      >
        {isRankedRounds ? (
          <View>
            <View className="flex-row items-center justify-between">
              <SectionLabel>{roundLabel}</SectionLabel>
              {canEdit && canUndoRound ? (
                <Pressable
                  onPress={handleUndoRound}
                  disabled={undoRound.isPending}
                  accessibilityRole="button"
                  className="active:opacity-70"
                  testID="undo-round-button"
                >
                  <Text className="text-sm font-semibold text-accent">Ronde terugdraaien</Text>
                </Pressable>
              ) : null}
            </View>
            <View className="mt-2">
              {canEdit ? (
                <RoundsEntryList
                  order={roundMembers}
                  totalByUserId={pointsByUserId}
                  onOrderChange={setRoundOrder}
                />
              ) : (
                <RoundsStandingsList members={standingsMembers} totalByUserId={pointsByUserId} />
              )}
            </View>
            {canEdit ? (
              <Text className="mt-3 text-sm text-ink-muted">
                Sleep de spelers in de volgorde waarin ze deze ronde klaar waren. De laatste krijgt
                0 punten, elke plek hoger levert 1 punt extra op.
              </Text>
            ) : null}
          </View>
        ) : isFieldRounds ? (
          <View>
            <View className="flex-row items-center justify-between">
              <SectionLabel>{roundLabel}</SectionLabel>
              {canEdit && canUndoRound ? (
                <Pressable
                  onPress={handleUndoRound}
                  disabled={undoRound.isPending}
                  accessibilityRole="button"
                  className="active:opacity-70"
                  testID="undo-round-button"
                >
                  <Text className="text-sm font-semibold text-accent">Ronde terugdraaien</Text>
                </Pressable>
              ) : null}
            </View>
            <View className="mt-2 gap-2">
              {participants.map((member) => {
                // Every unset field reads as 0 here explicitly (rather than a field's
                // `defaultValue`, which for an exclusive field is its award amount, not a sane
                // per-round fallback) — this round hasn't been banked yet, so nothing about it
                // should start pre-filled.
                const roundValues = Object.fromEntries(
                  fields.map((field) => [
                    field.key,
                    fieldRoundDraft[member.userId]?.[field.key] ?? 0,
                  ]),
                );
                // The signed total of this round's draft — what "Volgende ronde" is about to add
                // onto the running total. Only shown to the scorekeeper: a spectator never sees the
                // in-progress draft (it's local to the scorekeeper's device), so it would always
                // read as a misleading "+0" for them.
                const roundDelta = canEdit
                  ? fields.reduce((sum, field) => sum + field.sign * roundValues[field.key], 0)
                  : undefined;
                return (
                  <PlayerCard
                    key={member.userId}
                    member={member}
                    isScorekeeper={member.userId === sessionData.scorekeeper_id}
                    fields={fields}
                    values={roundValues}
                    total={totalByUserId.get(member.userId)?.total ?? 0}
                    roundDelta={roundDelta}
                    canEdit={canEdit}
                    isOpen={openParticipantId === member.userId}
                    onToggleOpen={() =>
                      setOpenParticipantId((current) =>
                        current === member.userId ? null : member.userId,
                      )
                    }
                    onChangeField={(fieldKey, value) =>
                      handleFieldRoundChange(member.userId, fieldKey, value)
                    }
                  />
                );
              })}
            </View>
            {canEdit ? (
              <Text className="mt-3 text-sm text-ink-muted">
                Vul de scores van deze ronde in. Bij "Volgende ronde" tellen ze op bij het totaal.
              </Text>
            ) : null}
          </View>
        ) : (
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
                      setOpenParticipantId((current) =>
                        current === member.userId ? null : member.userId,
                      )
                    }
                    onChangeField={(fieldKey, value) =>
                      handleFieldChange(member.userId, fieldKey, value)
                    }
                  />
                ))}
              </View>
            )}
          </View>
        )}

        <SessionNotesSection
          notes={notes ?? []}
          authorNameById={authorNameById}
          currentUserId={currentUserId}
          canWrite={canWriteNotes}
          draft={noteDraft}
          onDraftChange={setNoteDraft}
          onAdd={handleAddNote}
          onDelete={setPendingDeleteNoteId}
          isAdding={addNote.isPending}
        />
      </KeyboardAwareScrollView>

      {canEdit ? (
        // Pinned rather than appended to the scroll content, the way GamesTab pins "Spel
        // toevoegen": ending the session should stay reachable and in a fixed spot regardless of
        // participant count or which card is expanded. KeyboardStickyView lifts it on top of the
        // keyboard so the bottom of the screen stays visible while a field is focused; the offset
        // cancels the safe-area padding, which the keyboard covers anyway.
        <KeyboardStickyView offset={{ closed: 0, opened: insets.bottom }}>
          <View
            className="border-t border-line bg-surface px-6 pt-4"
            style={{ paddingBottom: 16 + insets.bottom }}
            onLayout={(event) => setFooterHeight(event.nativeEvent.layout.height)}
          >
            {isRounds ? (
              <View className="gap-2">
                <Button
                  label="Volgende ronde"
                  onPress={handleNextRound}
                  isLoading={commitRound.isPending}
                  testID="next-round-submit"
                />
                <Button
                  label="Potje afronden"
                  variant="secondary"
                  onPress={() => {
                    // Reset first, so a failed earlier attempt doesn't greet them with a stale error.
                    commitRound.reset();
                    finalizeSession.reset();
                    setCountsCurrentRound(true);
                    setIsFinishRoundsVisible(true);
                  }}
                  testID="finalize-session-submit"
                />
              </View>
            ) : (
              <Button
                label="Potje afronden"
                onPress={() => finalizeSession.mutate()}
                isLoading={finalizeSession.isPending}
                testID="finalize-session-submit"
              />
            )}
          </View>
        </KeyboardStickyView>
      ) : null}

      {/* Mounted one at a time rather than both with a `visible` flag: Android only ever shows one
          Modal, and two of them in the same tree left the second one refusing to appear at all. */}
      {isFinishRoundsVisible ? (
        <FinishRoundsModal
          roundNumber={roundNumber}
          countsCurrentRound={countsCurrentRound}
          onToggleCurrentRound={() => setCountsCurrentRound((current) => !current)}
          onCancel={() => setIsFinishRoundsVisible(false)}
          onConfirm={confirmFinishRounds}
          isPending={commitRound.isPending || finalizeSession.isPending || deleteSession.isPending}
          hasFailed={commitRound.isError || finalizeSession.isError || deleteSession.isError}
        />
      ) : null}

      {isLeaveConfirmVisible ? (
        <LeaveConfirmModal onCancel={cancelLeave} onConfirm={confirmLeave} />
      ) : null}

      {pendingDeleteNoteId && !isFinishRoundsVisible && !isLeaveConfirmVisible ? (
        <DeleteNoteConfirmModal
          onCancel={() => setPendingDeleteNoteId(null)}
          onConfirm={confirmDeleteNote}
          isPending={deleteNote.isPending}
        />
      ) : null}
    </View>
  );
}
