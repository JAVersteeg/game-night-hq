import type { NavigationAction, RouteProp } from '@react-navigation/native';
import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ActivityIndicator, Modal, Pressable, View } from 'react-native';
import { Text } from '@/components/Text';
import { KeyboardAwareScrollView, KeyboardStickyView } from 'react-native-keyboard-controller';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { Badge } from '@/components/Badge';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { ChoiceRow } from '@/components/ChoiceRow';
import { NumberStepper } from '@/components/NumberStepper';
import { ScoreBars } from '@/components/ScoreBars';
import { SectionLabel } from '@/components/SectionLabel';
import { TextField } from '@/components/TextField';
import { useAuth } from '@/features/auth/context/AuthContext';
import { AvatarMarksProvider } from '@/features/badges/avatarMarks';
import { MemberAvatar } from '@/features/groups/components/MemberAvatar';
import { useGroupMembers, type GroupMember } from '@/features/groups/hooks/useGroupMembers';
import { CoverThumbnail } from '@/components/CoverThumbnail';
import { PencilIcon } from '@/components/PencilIcon';
import { PlusIcon } from '@/components/PlusIcon';
import { TrashIcon } from '@/components/TrashIcon';
import { TrophyIcon } from '@/components/TrophyIcon';
import { ReorderList } from '@/components/ReorderList';
import { gameColorForTemplate } from '@/features/games/colors';
import { coverImageForTemplate } from '@/features/games/covers';
import { useGameTemplate } from '@/features/games/hooks/useGameTemplates';
import { theme } from '@/lib/theme';
import {
  RANK_FIELD_KEY,
  computeBreakdown,
  computeTotals,
  groupByTeam,
  roundRankPoints,
  higherTotalIsBetter,
  teamLabel,
} from '@/features/sessions/scoring';
import {
  useAddSessionNote,
  useDeleteSessionNote,
  useSessionNotes,
  type SessionNote,
} from '@/features/sessions/hooks/useSessionNotes';
import { useSessionPhotos } from '@/features/sessions/hooks/useSessionPhotos';
import { SessionPhotosSection } from '@/features/sessions/components/SessionPhotosSection';
import { BoardScanSection } from '@/features/boardScan/components/BoardScanSection';
import { CATAN_POINT_COLUMNS } from '@/features/boardScan/components/ScoreIcons';
import { gameKeyForTemplate } from '@/features/games/presets';
import {
  useSessionParticipants,
  useSessionTeamByUser,
} from '@/features/sessions/hooks/useSessionParticipants';
import {
  useSetScore,
  useSetScores,
  useSessionScores,
  type ScoresByUser,
} from '@/features/sessions/hooks/useSessionScores';
import type { RoundFieldValues } from '@/features/sessions/hooks/useSessions';
import {
  useCommitRound,
  useDeleteSession,
  useFinalizeSession,
  useSession,
  useSetSessionWinner,
  useUndoRound,
} from '@/features/sessions/hooks/useSessions';
import type { AppStackParamList } from '@/navigation/types';

type Navigation = NativeStackNavigationProp<AppStackParamList>;

/** How long a finished session's scores stay writable — and its notes and photos deletable — after
 *  `completed_at`. Mirrors the window `private.can_write_scores`/`can_write_session_notes` enforce
 *  server-side. Kept as one constant so the two can't quietly drift apart. */
const EDIT_GRACE_WINDOW_MS = 2 * 60 * 60 * 1000;

function isWithinGraceWindow(completedAt: string | null): boolean {
  return (
    completedAt !== null && Date.now() - new Date(completedAt).getTime() < EDIT_GRACE_WINDOW_MS
  );
}

/** One team of a team game's session: its number, display name and players (participant order). */
interface SessionTeam {
  team: number;
  label: string;
  members: GroupMember[];
}

/** A team's overlapping avatars — the team's stand-in for a single player's avatar. */
function TeamAvatars({ members, size }: { members: GroupMember[]; size: number }) {
  return (
    <View className="flex-row">
      {members.map((member, index) => (
        <View
          key={member.userId}
          className="rounded-full border-2 border-surface"
          style={{ marginLeft: index === 0 ? 0 : -size / 3 }}
        >
          <MemberAvatar member={member} size={size} />
        </View>
      ))}
    </View>
  );
}

/** A team's name over its players' names, next to their avatars. */
function TeamHeader({ team }: { team: SessionTeam }) {
  return (
    <>
      <TeamAvatars members={team.members} size={32} />
      <View className="min-w-0 flex-1">
        <Text className="text-base font-semibold text-ink" numberOfLines={1}>
          {team.label}
        </Text>
        <Text className="text-sm text-ink-muted" numberOfLines={1}>
          {team.members.map((member) => member.displayName).join(', ')}
        </Text>
      </View>
    </>
  );
}

interface PlayerCardProps {
  member: GroupMember;
  /** Set in a team game, where one card stands for a whole team and `member` is only the player
   *  its entries are keyed under (every teammate gets the same values written). */
  team?: SessionTeam;
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
  /** Lists the field values under the name while collapsed. Off for a rounds game, whose `values`
   *  are the unbanked round draft rather than anything the running total is made of. */
  showSummary?: boolean;
  onToggleOpen: () => void;
  onChangeField: (fieldKey: string, value: number) => void;
}

/** One line per field: each numeric field with its value, and an exclusive field (at its award
 *  value) only when this participant holds it. */
function fieldSummary(
  fields: PlayerCardProps['fields'],
  values: Record<string, number>,
): { key: string; label: string; value: number }[] {
  return fields.flatMap((field) => {
    const value = values[field.key] ?? (field.exclusive ? 0 : field.defaultValue);
    if (field.exclusive && value === 0) return [];
    return [{ key: field.key, label: field.label, value }];
  });
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
  team,
  isScorekeeper,
  fields,
  values,
  total,
  roundDelta,
  canEdit,
  isOpen,
  showSummary = false,
  onToggleOpen,
  onChangeField,
}: PlayerCardProps) {
  // The collapsed card's only view of the fields — spectators can never expand it, so without this
  // they'd see a total with no way to tell where it came from. A single field *is* the total, so
  // there's nothing to break down and the line would only repeat it.
  const summary =
    showSummary && fields.length > 1 && !(canEdit && isOpen) ? fieldSummary(fields, values) : [];

  return (
    <View className="overflow-hidden rounded-2xl border border-line bg-surface">
      <Pressable
        onPress={canEdit ? onToggleOpen : undefined}
        accessibilityRole={canEdit ? 'button' : undefined}
        accessibilityState={canEdit ? { expanded: isOpen } : undefined}
        className={`flex-row items-center gap-3 px-4 py-3 ${canEdit ? 'active:opacity-70' : ''}`}
      >
        {team ? (
          <TeamAvatars members={team.members} size={36} />
        ) : (
          <MemberAvatar member={member} size={36} />
        )}
        <View className="min-w-0 flex-1">
          <View className="flex-row items-center gap-2">
            <Text className="min-w-0 shrink text-base font-semibold text-ink" numberOfLines={1}>
              {team ? team.label : member.displayName}
            </Text>
            {isScorekeeper && !team ? <Badge tone="accent">Scorebijhouder</Badge> : null}
          </View>
          {team ? (
            <Text className="text-sm text-ink-muted" numberOfLines={1}>
              {team.members.map((teamMember) => teamMember.displayName).join(', ')}
            </Text>
          ) : null}
          {summary.length > 0 ? (
            <View className="mt-1 gap-0.5">
              {summary.map((line) => (
                <View key={line.key} className="flex-row items-baseline gap-3">
                  <Text className="min-w-0 flex-1 text-sm text-ink-muted" numberOfLines={1}>
                    {line.label}
                  </Text>
                  <Text className="text-sm font-semibold text-ink-muted">{line.value}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
        <View className="items-end">
          <PoppingTotal value={total} className="text-3xl font-bold tracking-tight text-ink" />
          {roundDelta !== undefined ? (
            <Text className="text-xs font-semibold text-accent">
              {roundDelta >= 0 ? `+${roundDelta}` : roundDelta}
            </Text>
          ) : null}
        </View>
        {canEdit ? (
          // Same text chevron as the group list rows, turned down while the fields are showing.
          <Text
            className="text-xl text-ink-subtle"
            style={{ transform: [{ rotate: isOpen ? '-90deg' : '90deg' }] }}
          >
            ›
          </Text>
        ) : null}
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

/** The one header affordance for a finished session still inside its edit window — see
 *  `canEditCompletedSession` in `SessionScreen`. Toggles straight to "Klaar" once tapped rather
 *  than showing a second icon: the pencil only ever means "this can still change", not "editing is
 *  on", so a mid-edit session needs different wording, not a different glyph. */
function EditSessionButton({
  isEditing,
  isPending,
  onPress,
}: {
  isEditing: boolean;
  /** True only while entering edit mode on a rounds template involves undoing its last round on
   *  the server — a plain toggle otherwise, with nothing to wait for. */
  isPending: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={isPending}
      hitSlop={12}
      accessibilityRole="button"
      accessibilityLabel={isEditing ? 'Klaar met corrigeren' : 'Potje corrigeren'}
      className={`active:opacity-70 ${isPending ? 'opacity-50' : ''}`}
      testID="edit-completed-session-button"
    >
      {isEditing ? (
        <Text className="text-base font-semibold text-accent">Klaar</Text>
      ) : (
        <PencilIcon size={20} color={theme.ink} />
      )}
    </Pressable>
  );
}

/** "Ronde 3 van 6", with the scorekeeper's undo for the last banked round beside it. The button is
 *  sized up to the 44px tap floor with hitSlop, since it's used mid-game at arm's length. */
function RoundHeader({
  label,
  canUndo,
  isUndoing,
  onUndo,
}: {
  label: string;
  canUndo: boolean;
  isUndoing: boolean;
  onUndo: () => void;
}) {
  return (
    <View className="flex-row items-center justify-between">
      <SectionLabel>{label}</SectionLabel>
      {canUndo ? (
        <Pressable
          onPress={onUndo}
          disabled={isUndoing}
          hitSlop={12}
          accessibilityRole="button"
          className={`active:opacity-70 ${isUndoing ? 'opacity-50' : ''}`}
          testID="undo-round-button"
        >
          <Text className="text-sm font-semibold text-accent">Ronde terugdraaien</Text>
        </Pressable>
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
          <MemberAvatar member={member} size={32} />
          <Text className="min-w-0 flex-1 text-base font-semibold text-ink" numberOfLines={1}>
            {member.displayName}
          </Text>
        </View>
      ))}
    </View>
  );
}

/** Space between rows in the drag lists. */
const ROW_GAP = 8;

const FLY_MS = 380;
const POP_UP_MS = 110;
const DELTA_RETURN_DELAY_MS = 220;
const POP_SPRING = { damping: 9, stiffness: 260, mass: 0.6 };

/** The "points just landed" pop: a quick swell to `peak`, then a springy settle back to 1. Runs on
 *  either thread, so it can fire from an animation's completion callback as well as from React. */
function popScale(scale: SharedValue<number>, peak: number) {
  'worklet';
  scale.value = withSequence(
    withTiming(peak, { duration: POP_UP_MS, easing: Easing.out(Easing.quad) }),
    withSpring(1, POP_SPRING),
  );
}

/** A total that pops whenever its value changes — every stepper tap for a single-round game, every
 *  banked (or undone) round for a rounds game, and the same for spectators via realtime. The first
 *  render doesn't count as a change. */
function PoppingTotal({ value, className }: { value: number; className: string }) {
  const scale = useSharedValue(1);
  const previousValue = useRef(value);

  useEffect(() => {
    if (previousValue.current === value) return;
    previousValue.current = value;
    popScale(scale, 1.2);
    // `scale` is a stable ref; only a new value should pop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View style={style}>
      <Text className={className}>{value}</Text>
    </Animated.View>
  );
}

/** A rounds row's running total with this place's "+X" underneath. When a banked round raises the
 *  total, the "+X" floats up into it, and only on arrival does the number tick over and pop — the
 *  old total stays on screen until then so the two read as one motion. A drop (undoing a round)
 *  just snaps, since there's nothing being added. */
function RoundScore({ total, delta }: { total: number; delta: number }) {
  const [shownTotal, setShownTotal] = useState(total);
  const [flyingDelta, setFlyingDelta] = useState<number | null>(null);
  const previousTotal = useRef(total);

  const flight = useSharedValue(0);
  const totalScale = useSharedValue(1);
  const deltaOpacity = useSharedValue(1);
  const totalHeight = useSharedValue(24);
  const deltaHeight = useSharedValue(16);

  useEffect(() => {
    const previous = previousTotal.current;
    previousTotal.current = total;
    if (total === previous) return;

    cancelAnimation(flight);
    cancelAnimation(totalScale);
    cancelAnimation(deltaOpacity);

    if (total < previous) {
      setFlyingDelta(null);
      setShownTotal(total);
      flight.value = 0;
      totalScale.value = 1;
      deltaOpacity.value = 1;
      return;
    }

    setFlyingDelta(total - previous);
    flight.value = 0;
    deltaOpacity.value = 0;
    flight.value = withTiming(
      1,
      { duration: FLY_MS, easing: Easing.bezier(0.33, 0, 0.2, 1) },
      (finished) => {
        if (!finished) return;
        scheduleOnRN(setShownTotal, total);
        scheduleOnRN(setFlyingDelta, null);
        popScale(totalScale, 1.35);
        deltaOpacity.value = withDelay(DELTA_RETURN_DELAY_MS, withTiming(1, { duration: 200 }));
      },
    );
    // Shared values are stable refs; only a new total should start a flight.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total]);

  const totalStyle = useAnimatedStyle(() => ({ transform: [{ scale: totalScale.value }] }));
  const deltaStyle = useAnimatedStyle(() => ({ opacity: deltaOpacity.value }));
  const flyerStyle = useAnimatedStyle(() => {
    // Centre of the "+X" line to centre of the total line.
    const travel = (totalHeight.value + deltaHeight.value) / 2;
    return {
      opacity: interpolate(flight.value, [0, 0.6, 1], [1, 1, 0]),
      transform: [
        { translateY: -travel * flight.value },
        { scale: interpolate(flight.value, [0, 0.5, 1], [1, 1.15, 0.8]) },
      ],
    };
  });

  return (
    <View className="items-end">
      <Animated.View
        style={totalStyle}
        onLayout={(event) => {
          totalHeight.value = event.nativeEvent.layout.height;
        }}
      >
        <Text className="text-lg font-bold tracking-tight text-ink">{shownTotal}</Text>
      </Animated.View>
      <Animated.View
        style={deltaStyle}
        onLayout={(event) => {
          deltaHeight.value = event.nativeEvent.layout.height;
        }}
      >
        <Text className="text-xs font-semibold text-accent">+{delta}</Text>
      </Animated.View>
      {flyingDelta !== null ? (
        <Animated.View
          pointerEvents="none"
          style={[{ position: 'absolute', right: 0, bottom: 0 }, flyerStyle]}
        >
          <Text className="text-xs font-semibold text-accent">+{flyingDelta}</Text>
        </Animated.View>
      ) : null}
    </View>
  );
}

/** Memoised on primitive props: a live session re-renders the whole screen on every realtime echo,
 *  and there's no reason for every row to follow along. Picking up and dropping is handled by
 *  `ReorderList` around it, which is why this is a plain view rather than something pressable. */
const RankedEntryRow = memo(function RankedEntryRow({
  position,
  member,
  scoreTotal,
  scoreDelta,
  isActive,
}: {
  position: number;
  member: GroupMember;
  /** Only rounds games have anything to show here: the points banked so far and what this place
   *  would add. A plain ranked game has no running score at all. */
  scoreTotal?: number;
  scoreDelta?: number;
  isActive: boolean;
}) {
  return (
    <View
      accessible
      accessibilityLabel={`Sleep ${member.displayName} naar een andere plek`}
      className={`flex-row items-center gap-3 rounded-2xl border px-4 py-3 ${
        isActive ? 'border-accent-line bg-accent-soft' : 'border-line bg-surface'
      }`}
    >
      <RankBadge position={position} />
      <MemberAvatar member={member} size={32} />
      <Text className="min-w-0 flex-1 text-base font-semibold text-ink" numberOfLines={1}>
        {member.displayName}
      </Text>
      {scoreTotal !== undefined ? <RoundScore total={scoreTotal} delta={scoreDelta ?? 0} /> : null}
      <Text className="text-lg text-ink-subtle">≡</Text>
    </View>
  );
});

const memberKey = (member: GroupMember) => member.userId;

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

  const renderItem = useCallback(
    (member: GroupMember, index: number, isActive: boolean) => (
      <RankedEntryRow position={index + 1} member={member} isActive={isActive} />
    ),
    [],
  );

  return (
    <ReorderList
      data={order}
      keyExtractor={memberKey}
      renderItem={renderItem}
      gap={ROW_GAP}
      onReorder={(next) => {
        setOrder(next);
        onReorder(next.map((member) => member.userId));
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
  const renderItem = useCallback(
    (member: GroupMember, index: number, isActive: boolean) => {
      const position = index + 1;
      return (
        <RankedEntryRow
          position={position}
          member={member}
          scoreTotal={totalByUserId.get(member.userId) ?? 0}
          scoreDelta={roundRankPoints(position, order.length)}
          isActive={isActive}
        />
      );
    },
    [totalByUserId, order.length],
  );

  return (
    <ReorderList
      data={order}
      keyExtractor={memberKey}
      renderItem={renderItem}
      gap={ROW_GAP}
      onReorder={(next) => onOrderChange(next.map((member) => member.userId))}
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
          <MemberAvatar member={member} size={32} />
          <Text className="min-w-0 flex-1 text-base font-semibold text-ink" numberOfLines={1}>
            {member.displayName}
          </Text>
          <Text className="text-2xl font-bold tracking-tight text-ink">
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

/** A winner to pick in `PickWinnerModal`: a player (keyed by user id) or a team (by its number). */
interface WinnerCandidate {
  id: string;
  title: string;
  left: ReactNode;
}

function playerCandidate(member: GroupMember): WinnerCandidate {
  return {
    id: member.userId,
    title: member.displayName,
    left: <MemberAvatar member={member} size={32} />,
  };
}

function teamCandidate(team: SessionTeam): WinnerCandidate {
  return {
    id: String(team.team),
    title: team.label,
    left: <TeamAvatars members={team.members} size={28} />,
  };
}

/** The scorekeeper says who won. Mostly for a single-winner game that ended with a shared top
 *  total: only the tied players (or teams) are offered, and "Later" leaves the tie standing
 *  (everyone tied counts as a winner until it's settled) — the summary keeps a button to come back
 *  to it. A team game decided on who won uses it too, to finish the potje with every team offered. */
function PickWinnerModal({
  title = 'Wie heeft er gewonnen?',
  description = 'Gelijkspel, maar dit spel heeft maar één winnaar. Kies wie het potje won.',
  laterLabel = 'Later kiezen',
  candidates,
  selectedId,
  onSelect,
  onConfirm,
  onLater,
  isPending,
  hasFailed,
}: {
  title?: string;
  description?: string;
  laterLabel?: string;
  candidates: WinnerCandidate[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onConfirm: () => void;
  onLater: () => void;
  isPending: boolean;
  hasFailed: boolean;
}) {
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onLater}>
      <Pressable
        className="flex-1 items-center justify-center bg-surface-deep/70 px-6"
        onPress={onLater}
        accessibilityLabel="Sluit"
      >
        <Pressable className="w-full max-w-sm gap-4 rounded-3xl border border-line bg-surface p-6">
          <View>
            <Text className="text-xl font-bold text-ink">{title}</Text>
            <Text className="mt-1 text-sm text-ink-muted">{description}</Text>
          </View>
          <View className="gap-2">
            {candidates.map((candidate) => (
              <ChoiceRow
                key={candidate.id}
                title={candidate.title}
                left={candidate.left}
                selected={selectedId === candidate.id}
                onSelect={() => onSelect(candidate.id)}
                testID={`pick-winner-${candidate.id}`}
              />
            ))}
          </View>
          {hasFailed ? (
            <Text className="text-sm text-danger">
              Opslaan is niet gelukt. Controleer je verbinding en probeer het opnieuw.
            </Text>
          ) : null}
          <Button
            label="Winnaar vastleggen"
            onPress={onConfirm}
            isLoading={isPending}
            disabled={selectedId === null}
            testID="pick-winner-confirm"
          />
          <Button label={laterLabel} variant="secondary" onPress={onLater} />
        </Pressable>
      </Pressable>
    </Modal>
  );
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

interface DeleteSessionConfirmModalProps {
  onCancel: () => void;
  onConfirm: () => void;
  isPending: boolean;
  /** A finished session (the header bin) rather than a live one — it also drops out of stats. */
  isCompleted?: boolean;
  hasFailed?: boolean;
}

/** Throwing a session away from inside the session itself. For a live one that's the deliberate
 *  route, reached from the button at the end of the scroll — backing out of the screen offers the
 *  same thing through `LeaveSessionSheet`, which also has "later verder" to leave it running. For a
 *  finished one it's the header bin, open to the scorekeeper during the 2-hour edit window. */
function DeleteSessionConfirmModal({
  onCancel,
  onConfirm,
  isPending,
  isCompleted = false,
  hasFailed = false,
}: DeleteSessionConfirmModalProps) {
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
              {isCompleted
                ? 'Dit kun je niet ongedaan maken'
                : 'Het potje en alle scores tot nu toe worden verwijderd. Dit kun je niet ongedaan maken.'}
            </Text>
            {hasFailed ? (
              <Text className="mt-2 text-sm text-danger">Verwijderen mislukt.</Text>
            ) : null}
          </View>
          <Button
            label="Verwijderen"
            variant="secondary"
            onPress={onConfirm}
            isLoading={isPending}
          />
          <Button label="Terug naar potje" onPress={onCancel} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

interface LeaveSessionSheetProps {
  onStay: () => void;
  onLeave: () => void;
  onDiscard: () => void;
  isPending: boolean;
}

/** Shown when the scorekeeper backs out of a live session that already holds something. Leaving it
 *  running is a legitimate choice — a game night gets interrupted — but so is throwing it away, and
 *  the back button alone can't tell the two apart. A session with nothing in it never gets here: it
 *  is deleted silently, since a mis-tap and a real abandon look identical at that point. */
function LeaveSessionSheet({ onStay, onLeave, onDiscard, isPending }: LeaveSessionSheetProps) {
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onStay}>
      <Pressable
        className="flex-1 items-center justify-center bg-surface-deep/70 px-6"
        onPress={onStay}
        accessibilityLabel="Sluit"
      >
        <Pressable className="w-full max-w-sm gap-4 rounded-3xl border border-line bg-surface p-6">
          <View>
            <Text className="text-xl font-bold text-ink">Potje verlaten?</Text>
            <Text className="mt-1 text-sm text-ink-muted">
              Het potje loopt door en blijft bovenaan de groep staan, zodat je er later verder mee
              kunt. Spelen jullie niet verder? Gooi het dan weg.
            </Text>
          </View>
          <Button label="Later verder" onPress={onLeave} />
          <Button
            label="Potje weggooien"
            variant="secondary"
            onPress={onDiscard}
            isLoading={isPending}
          />
          <Button label="Doorgaan met potje" variant="ghost" onPress={onStay} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/** Whether a live session holds anything a scorekeeper would mind losing.
 *
 *  Not simply "are there score rows": `create_session` seeds a single-round template's non-zero
 *  field defaults as real rows, so a Catan session has scores the instant it starts. What counts is
 *  a value that differs from where the session began — plus any banked round, note or photo, none
 *  of which exists until someone does something. */
function hasRecordedProgress(
  roundsPlayed: number,
  fields: { key: string; defaultValue: number; exclusive: boolean }[],
  isRounds: boolean,
  scoresByUser: ScoresByUser | undefined,
  noteCount: number,
  photoCount: number,
): boolean {
  if (roundsPlayed > 0 || noteCount > 0 || photoCount > 0) return true;

  // The value each field starts at, mirroring what create_session seeds: an exclusive field's
  // default is the award for holding it rather than a starting value, and a rounds template is
  // never seeded at all because each round adds onto the total.
  const baselineByKey = new Map(
    fields.map((field) => [field.key, isRounds || field.exclusive ? 0 : field.defaultValue]),
  );

  return Object.values(scoresByUser ?? {}).some((values) =>
    Object.entries(values).some(
      ([fieldKey, value]) => value !== (baselineByKey.get(fieldKey) ?? 0),
    ),
  );
}

/** An append-only log, oldest first. Any group member can add one at any time, but only the author
 *  can delete their own, and only while `canDelete` holds (in progress, or within the 2-hour grace
 *  window after completion) — RLS is the real enforcement, this just hides the affordance. */
function SessionNotesSection({
  notes,
  authorNameById,
  currentUserId,
  canDelete,
  draft,
  onDraftChange,
  onAdd,
  onDelete,
  isAdding,
}: {
  notes: SessionNote[];
  authorNameById: Map<string, string>;
  currentUserId: string | undefined;
  canDelete: boolean;
  draft: string;
  onDraftChange: (value: string) => void;
  onAdd: () => void;
  onDelete: (noteId: string) => void;
  isAdding: boolean;
}) {
  const isNoteAddDisabled = isAdding || draft.trim().length === 0;

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
                {canDelete && note.author_id === currentUserId ? (
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
      <View className="mt-3 flex-row items-stretch gap-2">
        <View className="min-w-0 flex-1">
          <TextField
            value={draft}
            onChangeText={onDraftChange}
            placeholder="Notitie toevoegen…"
            testID="session-note-input"
          />
        </View>
        <Pressable
          onPress={isNoteAddDisabled ? undefined : onAdd}
          accessibilityRole="button"
          accessibilityLabel="Notitie toevoegen"
          accessibilityState={{ disabled: isNoteAddDisabled }}
          className={`w-[58px] items-center justify-center rounded-2xl bg-surface-sunken active:opacity-80 ${
            isNoteAddDisabled ? 'opacity-50' : ''
          }`}
          testID="session-note-submit"
        >
          {isAdding ? (
            <ActivityIndicator color={theme.ink} />
          ) : (
            <PlusIcon color={theme.ink} />
          )}
        </Pressable>
      </View>
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
  const { data: members, isPending: isMembersPending } = useGroupMembers(
    sessionData?.group_id ?? '',
  );
  const { data: participantIds, isPending: isParticipantsPending } =
    useSessionParticipants(sessionId);
  const { data: teamByUser } = useSessionTeamByUser(sessionId);
  const { data: template, isPending: isTemplatePending } = useGameTemplate(
    sessionData?.template_id ?? '',
  );
  const { data: scoresByUser, isPending: isScoresPending } = useSessionScores(sessionId);
  const setScore = useSetScore(sessionId);
  const setScores = useSetScores(sessionId);
  const finalizeSession = useFinalizeSession(sessionId, sessionData?.group_id ?? '');
  const setSessionWinner = useSetSessionWinner(sessionId, sessionData?.group_id ?? '');
  const deleteSession = useDeleteSession(sessionId, sessionData?.group_id ?? '');
  const commitRound = useCommitRound(sessionId);
  const undoRound = useUndoRound(sessionId);
  const { data: notes } = useSessionNotes(sessionId);
  const addNote = useAddSessionNote(sessionId);
  const deleteNote = useDeleteSessionNote(sessionId);
  const { data: photos } = useSessionPhotos(sessionId);

  const [openParticipantId, setOpenParticipantId] = useState<string | null>(currentUserId ?? null);
  const [noteDraft, setNoteDraft] = useState('');
  const [pendingDeleteNoteId, setPendingDeleteNoteId] = useState<string | null>(null);

  const [isDeleteConfirmVisible, setIsDeleteConfirmVisible] = useState(false);

  // The back-navigation that `beforeRemove` blocked, held until the scorekeeper says what should
  // happen to the session they're leaving — re-dispatched as-is so "back" still means whatever it
  // meant (a swipe, the header button, a deep link popping the stack).
  const [pendingLeaveAction, setPendingLeaveAction] = useState<NavigationAction | null>(null);
  // Set the moment leaving is agreed on, so the listener waves through the dispatch it makes itself
  // instead of intercepting it a second time. A ref, not state: it has to be readable by the
  // listener synchronously, within the same tick it's set.
  const isLeavingRef = useRef(false);

  // The finish order of the round being played, as ids. Local until "Volgende ronde" banks it:
  // nothing about an unfinished round is written to the server, which is also why a spectator sees
  // standings rather than a live order. Only relevant for a ranked-and-rounds template.
  const [roundOrder, setRoundOrder] = useState<string[] | null>(null);
  // The field entries for the round being played, keyed by participant then field key — the
  // highest/lowest_total_wins-rounds counterpart of `roundOrder`. Local for the same reason: it's
  // only added onto the running totals once "Volgende ronde" banks it.
  const [fieldRoundDraft, setFieldRoundDraft] = useState<RoundFieldValues>({});
  const [isFinishRoundsVisible, setIsFinishRoundsVisible] = useState(false);
  // The tie-break prompt opens by itself on a finished single-winner tie; "Later kiezen" sets this
  // so it stays closed until the summary's own button reopens it.
  const [isWinnerPromptDismissed, setIsWinnerPromptDismissed] = useState(false);
  // A player id, or — in a team game — the picked team's number as a string.
  const [pickedWinnerId, setPickedWinnerId] = useState<string | null>(null);
  // A team game decided on who won finishes through a "which team won?" prompt instead of straight
  // away; within the edit window the summary can reopen it to correct a mis-tap.
  const [isPickTeamVisible, setIsPickTeamVisible] = useState(false);
  const [countsCurrentRound, setCountsCurrentRound] = useState(true);
  // True while a finished session is being edited via the header pencil — the one state that
  // swaps the always-shown completed summary for the same entry form live play uses. For a rounds
  // template, entering this state has already popped the last round back into roundOrder/
  // fieldRoundDraft (see handleToggleEditCompletedSession below).
  const [isEditingCompletedSession, setIsEditingCompletedSession] = useState(false);
  // A single-round (non-rounds) template's edit draft: seeded from the saved scores on entering
  // edit mode, edited purely locally while typing, and only written back — once, per changed field
  // — when the scorekeeper taps "Klaar". A finished session has no one else watching it live, so
  // there's no reason to round-trip every keystroke through the server the way live play does; that
  // round-tripping is exactly what let two close-together writes for the same field race each
  // other and leave the wrong one persisted. Null whenever this isn't the active mode.
  const [completedScoresDraft, setCompletedScoresDraft] = useState<ScoresByUser | null>(null);
  // Measured so a focused field scrolls clear of the pinned footer, which sits above the keyboard.
  const [footerHeight, setFooterHeight] = useState(0);

  // Whether the header pencil shows at all: the scorekeeper, and only while the 2-hour edit window
  // (`private.can_write_scores`'s completed branch) is still open. Computed with optional chaining
  // — unlike `canEdit` further down, this has to be safe to read before the pending/error guard
  // below, since setting the header is itself a hook that must run unconditionally on every render.
  // A `team_win` game has no scores to edit — its result is corrected by picking the team again.
  const canEditCompletedSession =
    sessionData?.status === 'completed' &&
    sessionData.game_templates.scoring_direction !== 'team_win' &&
    currentUserId === sessionData?.scorekeeper_id &&
    isWithinGraceWindow(sessionData?.completed_at ?? null);
  // The header bin, under the same window — mirrors `private.can_delete_session`'s completed branch.
  // Unlike the pencil it includes `team_win` (deleting doesn't need scores), and it steps aside
  // while a correction is mid-flight, so "Klaar" is the only thing to tap until that's settled.
  const canDeleteCompletedSession =
    sessionData?.status === 'completed' &&
    currentUserId === sessionData.scorekeeper_id &&
    isWithinGraceWindow(sessionData.completed_at) &&
    !isEditingCompletedSession;

  // Same reasoning as `canEditCompletedSession`: declared up here, before the guard, purely so the
  // header effect below can reach it. A rounds template has no scores to edit directly — only its
  // last round is recoverable — so entering edit mode there first pops that round back into the
  // draft, same mechanic as "Ronde terugdraaien" during live play; anything else just flips the view.
  function handleToggleEditCompletedSession() {
    if (isEditingCompletedSession) {
      // Flush the whole draft as one request — the only write this edit makes. One request rather
      // than one per field: firing a dozen-odd independent writes here reintroduced the same
      // multi-write coordination that made per-keystroke live writes flicker in the first place,
      // just moved from every keystroke to this one tap.
      if (completedScoresDraft) {
        setScores.mutate(
          Object.entries(completedScoresDraft).flatMap(([userId, fieldValues]) =>
            Object.entries(fieldValues).map(([fieldKey, value]) => ({ userId, fieldKey, value })),
          ),
        );
      }
      setCompletedScoresDraft(null);
      setIsEditingCompletedSession(false);
      return;
    }
    if (sessionData?.game_templates.rounds) {
      undoRound.mutate(undefined, {
        onSuccess: (result) => {
          if ('order' in result) setRoundOrder(result.order);
          else setFieldRoundDraft(result.values);
          setIsEditingCompletedSession(true);
        },
      });
      return;
    }
    // A shallow copy per participant: handleCompletedFieldChange always replaces a participant's
    // whole field map rather than mutating it in place, so that's enough to keep edits here from
    // also touching the snapshot still held in `scoresByUser`.
    setCompletedScoresDraft(
      Object.fromEntries(
        Object.entries(scoresByUser ?? {}).map(([userId, values]) => [userId, { ...values }]),
      ),
    );
    setIsEditingCompletedSession(true);
  }

  // Backing out is where live sessions pile up: the scorekeeper taps back, the potje stays "nu
  // bezig" on everyone's dashboard, and nobody clears it because the person who walked away is the
  // one who'd have to. So back is the decision point rather than a no-op. Only for the scorekeeper
  // — a spectator leaving the read-only view is just leaving.
  useEffect(() => {
    if (sessionData?.status !== 'in_progress' || currentUserId !== sessionData.scorekeeper_id) {
      return;
    }

    return navigation.addListener('beforeRemove', (event) => {
      // The dispatch made below, once leaving has been settled — not a fresh back press.
      if (isLeavingRef.current) return;

      const templateFields = (template?.game_template_fields ?? []).map((field) => ({
        key: field.key,
        defaultValue: field.default_value,
        exclusive: field.exclusive,
      }));

      if (
        hasRecordedProgress(
          sessionData.rounds_played,
          templateFields,
          sessionData.game_templates.rounds,
          scoresByUser,
          notes?.length ?? 0,
          photos?.length ?? 0,
        )
      ) {
        event.preventDefault();
        // Reset first, so an earlier failed delete doesn't greet them with a stale error.
        deleteSession.reset();
        setPendingLeaveAction(event.data.action);
        return;
      }

      // Nothing was ever entered, so there's nothing to ask about and nothing to lose: a mis-tap
      // into a session and a deliberate abandon are the same thing at this point.
      event.preventDefault();
      isLeavingRef.current = true;
      deleteSession.mutate(undefined, {
        // Leaving either way — a session that couldn't be deleted is a smaller problem than a
        // screen that won't let go of whoever is trying to leave it.
        onSettled: () => navigation.dispatch(event.data.action),
      });
    });
  }, [
    navigation,
    sessionData,
    template,
    scoresByUser,
    notes,
    photos,
    currentUserId,
    deleteSession,
  ]);

  function leaveSessionRunning() {
    if (!pendingLeaveAction) return;
    isLeavingRef.current = true;
    setPendingLeaveAction(null);
    navigation.dispatch(pendingLeaveAction);
  }

  function discardSessionAndLeave() {
    if (!pendingLeaveAction) return;
    deleteSession.mutate(undefined, {
      onSuccess: () => {
        isLeavingRef.current = true;
        setPendingLeaveAction(null);
        navigation.dispatch(pendingLeaveAction);
      },
    });
  }

  useLayoutEffect(() => {
    navigation.setOptions({
      title: sessionData?.game_templates.name ?? 'Potje',
      headerRight:
        canEditCompletedSession || canDeleteCompletedSession
          ? () => (
              <View className="flex-row items-center gap-5">
                {canDeleteCompletedSession ? (
                  <Pressable
                    onPress={() => {
                      deleteSession.reset();
                      setIsDeleteConfirmVisible(true);
                    }}
                    hitSlop={12}
                    accessibilityRole="button"
                    accessibilityLabel="Potje verwijderen"
                    className="active:opacity-70"
                    testID="delete-completed-session-button"
                  >
                    <TrashIcon size={20} color={theme.danger} />
                  </Pressable>
                ) : null}
                {canEditCompletedSession ? (
                  <EditSessionButton
                    isEditing={isEditingCompletedSession}
                    isPending={undoRound.isPending}
                    onPress={handleToggleEditCompletedSession}
                  />
                ) : null}
              </View>
            )
          : undefined,
    });
  }, [
    navigation,
    sessionData?.game_templates.name,
    canEditCompletedSession,
    canDeleteCompletedSession,
    isEditingCompletedSession,
    undoRound.isPending,
    // `handleToggleEditCompletedSession` reads `completedScoresDraft` to know what "Klaar" should
    // flush, and `scoresByUser` to seed a fresh draft when the pencil is next tapped. Without these,
    // the header keeps whichever closure it last had — "Klaar" would flush a stale, un-edited
    // snapshot instead of the actual edits, and a later "edit" would seed from an outdated save.
    completedScoresDraft,
    scoresByUser,
  ]);

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

  function confirmDeleteSession() {
    deleteSession.mutate(undefined, {
      onSuccess: () => {
        setIsDeleteConfirmVisible(false);
        // Already decided — the `beforeRemove` listener must not ask "verlaten?" about it again.
        isLeavingRef.current = true;
        navigation.goBack();
      },
    });
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

  // A team game shows one card per team, keyed by its first player: every entry is written to all
  // of the team's players at once (see `teammatesOf`), so any one of them carries the team's values.
  const isTeamWin = sessionData.game_templates.scoring_direction === 'team_win';
  const sessionTeams =
    sessionData.game_templates.teams && teamByUser
      ? { teamByUser, winningTeam: sessionData.winning_team }
      : null;
  const teams: SessionTeam[] = sessionTeams
    ? groupByTeam(
        participants.map((member) => member.userId),
        sessionTeams.teamByUser,
      ).map(({ team, userIds }) => {
        const teamMembers = participants.filter((member) => userIds.includes(member.userId));
        return {
          team,
          label: teamLabel(
            team,
            sessionData.team_names,
            teamMembers.map((member) => member.displayName),
          ),
          members: teamMembers,
        };
      })
    : [];

  /** Everyone a value entered for `userId` belongs to: their whole team in a team game, else just
   *  them. */
  function teammatesOf(userId: string): string[] {
    if (!sessionTeams) return [userId];
    const team = sessionTeams.teamByUser[userId];
    return participants
      .map((member) => member.userId)
      .filter((id) => sessionTeams.teamByUser[id] === team);
  }

  // What the entry lists iterate over: a card per player, or per team in a team game.
  const entryUnits: { member: GroupMember; team?: SessionTeam }[] = sessionTeams
    ? teams.map((team) => ({ member: team.members[0], team }))
    : participants.map((member) => ({ member }));

  const fields = (template?.game_template_fields ?? []).map((field) => ({
    key: field.key,
    label: field.label,
    sign: field.sign,
    defaultValue: field.default_value,
    exclusive: field.exclusive,
  }));

  /** Writes one participant's field value (their whole team's, in a team game) and, for an
   *  exclusive field, clears it for every other participant that currently holds it — enforcing the
   *  at-most-one-holder rule client-side. */
  function handleFieldChange(userId: string, fieldKey: string, value: number) {
    const field = fields.find((candidate) => candidate.key === fieldKey);
    const targets = teammatesOf(userId);
    if (field?.exclusive && value !== 0) {
      for (const member of participants) {
        if (targets.includes(member.userId)) continue;
        if (((scoresByUser ?? {})[member.userId]?.[fieldKey] ?? 0) !== 0) {
          setScore.mutate({ userId: member.userId, fieldKey, value: 0 });
        }
      }
    }
    if (targets.length === 1) {
      setScore.mutate({ userId, fieldKey, value });
    } else {
      setScores.mutate(targets.map((target) => ({ userId: target, fieldKey, value })));
    }
  }

  /** Same exclusivity rule as `handleFieldChange`, but against this round's local draft rather than
   *  the committed running totals — nothing here is written to the server until the round is
   *  banked. */
  function handleFieldRoundChange(userId: string, fieldKey: string, value: number) {
    const field = fields.find((candidate) => candidate.key === fieldKey);
    const targets = teammatesOf(userId);
    setFieldRoundDraft((current) => {
      const next: RoundFieldValues = { ...current };
      if (field?.exclusive && value !== 0) {
        for (const member of participants) {
          if (targets.includes(member.userId)) continue;
          if ((next[member.userId]?.[fieldKey] ?? 0) !== 0) {
            next[member.userId] = { ...next[member.userId], [fieldKey]: 0 };
          }
        }
      }
      for (const target of targets) next[target] = { ...next[target], [fieldKey]: value };
      return next;
    });
  }

  /** Same exclusivity rule as `handleFieldChange`, but against `completedScoresDraft` rather than
   *  the server-synced scores — nothing here is written until "Klaar" flushes the whole draft. */
  function handleCompletedFieldChange(userId: string, fieldKey: string, value: number) {
    const field = fields.find((candidate) => candidate.key === fieldKey);
    const targets = teammatesOf(userId);
    setCompletedScoresDraft((current) => {
      const next: ScoresByUser = { ...(current ?? {}) };
      if (field?.exclusive && value !== 0) {
        for (const member of participants) {
          if (targets.includes(member.userId)) continue;
          if ((next[member.userId]?.[fieldKey] ?? 0) !== 0) {
            next[member.userId] = { ...next[member.userId], [fieldKey]: 0 };
          }
        }
      }
      for (const target of targets) next[target] = { ...next[target], [fieldKey]: value };
      return next;
    });
  }

  // What the totals and every field on screen are actually computed from: the completed-session
  // draft while it's active, the server-synced scores otherwise. The draft is only ever non-null
  // during non-rounds completed editing, and the read-only summary (the only other place scores
  // are shown) never renders while that's true, so there's no case where the two need separating.
  const displayedScoresByUser = completedScoresDraft ?? scoresByUser ?? {};

  const isScorekeeper = currentUserId === sessionData.scorekeeper_id;
  const isInProgress = sessionData.status === 'in_progress';
  const isCompletedSession = sessionData.status === 'completed';
  // Mirrors `private.can_write_scores`: the scorekeeper can still fix a mis-entered score for a
  // couple hours after finishing, same as they could while the session was live. Participants,
  // the scorekeeper role, and the rounds structure stay locked the moment the session completes —
  // this is scores only.
  const canEdit = isScorekeeper && (isInProgress || isWithinGraceWindow(sessionData.completed_at));
  // Mirrors `can_write_session_notes`: notes and photos are everyone's and can be added at any
  // time, but an author can only take theirs back while the session is live or within the same
  // grace window after finalising — after that the record is settled.
  const canDeleteNotes = isInProgress || isWithinGraceWindow(sessionData.completed_at);
  // Keyed off group members, not participants: someone who sat this one out can still comment.
  const authorNameById = new Map(
    (members ?? []).map((member) => [member.userId, member.displayName]),
  );

  function handleAddNote() {
    const body = noteDraft.trim();
    if (!body || !currentUserId) return;
    addNote.mutate({ authorId: currentUserId, body }, { onSuccess: () => setNoteDraft('') });
  }

  /** Finalising shouldn't silently drop a note that was typed but never sent, so it's posted first.
   *  `then` runs either way: a failed note stays in the input and can still be sent afterwards,
   *  which beats blocking the finish on it. */
  function withDraftNoteSaved(then: () => void) {
    const body = noteDraft.trim();
    if (!body || !currentUserId) {
      then();
      return;
    }
    addNote.mutate(
      { authorId: currentUserId, body },
      { onSuccess: () => setNoteDraft(''), onSettled: then },
    );
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
    displayedScoresByUser,
    sessionData.game_templates.scoring_direction,
    isRounds,
    sessionData.winner_id,
    sessionTeams,
  );
  const totalByUserId = new Map(totals.map((entry) => [entry.userId, entry]));
  const isTeamWinner = (team: SessionTeam) =>
    totalByUserId.get(team.members[0]?.userId ?? '')?.isWinner ?? false;
  const pointsByUserId = new Map(totals.map((entry) => [entry.userId, entry.total]));
  const memberById = new Map(participants.map((member) => [member.userId, member]));
  const roundMembers = (roundOrder ?? [])
    .map((userId) => memberById.get(userId))
    .filter((member): member is GroupMember => member !== undefined);
  // Standings, best first — the same order the result screen will end up showing.
  const standingsMembers = [...participants].sort(
    (a, b) => (pointsByUserId.get(b.userId) ?? 0) - (pointsByUserId.get(a.userId) ?? 0),
  );
  // Same, for a single-round field game, where "best" depends on the scoring direction.
  const fieldStandingsUnits = [...entryUnits].sort(({ member: a }, { member: b }) => {
    const difference = (pointsByUserId.get(b.userId) ?? 0) - (pointsByUserId.get(a.userId) ?? 0);
    return higherTotalIsBetter(sessionData.game_templates.scoring_direction, isRounds)
      ? difference
      : -difference;
  });
  const scorekeeperName =
    members?.find((member) => member.userId === sessionData.scorekeeper_id)?.displayName ?? null;

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

  /** Reverses the last banked round of a *live* session and drops the scorekeeper back into it to
   *  correct, whichever shape it was. The equivalent for a completed session is
   *  `handleToggleEditCompletedSession` above, which also has to flip `isEditingCompletedSession`
   *  — something this can't do without duplicating that function's checks, since by the time this
   *  runs the "Ronde terugdraaien" button that calls it is only ever visible on a live session. */
  function handleUndoRound() {
    undoRound.mutate(undefined, {
      onSuccess: (result) => {
        if ('order' in result) setRoundOrder(result.order);
        else setFieldRoundDraft(result.values);
      },
    });
  }

  /** Re-banks the round `handleToggleEditCompletedSession` popped back into the draft, once the
   *  scorekeeper has fixed it. Deliberately not `handleNextRound`: that also checks `round_count`
   *  and can open the finish-rounds dialog, which would call `finalizeSession` again on an
   *  already-completed session and reset `completed_at` — silently restarting the edit window on
   *  every correction. */
  function handleSaveRoundCorrection() {
    if (isRankedRounds) {
      if (!roundOrder || roundOrder.length === 0) return;
      commitRound.mutate(
        { order: roundOrder },
        { onSuccess: () => setIsEditingCompletedSession(false) },
      );
      return;
    }
    commitRound.mutate(
      { values: fieldRoundDraft },
      {
        onSuccess: () => {
          setFieldRoundDraft({});
          setIsEditingCompletedSession(false);
        },
      },
    );
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
      deleteSession.mutate(undefined, {
        onSuccess: () => {
          isLeavingRef.current = true;
          navigation.goBack();
        },
      });
      return;
    }

    const finalize = () =>
      withDraftNoteSaved(() =>
        finalizeSession.mutate(undefined, { onSuccess: () => setIsFinishRoundsVisible(false) }),
      );

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

  // A finished session always shows this summary first, whether or not it's still editable — the
  // header pencil (see `canEditCompletedSession` above) is the only way into editing it, via
  // `isEditingCompletedSession`.
  const showCompletedSummary = isCompletedSession && !isEditingCompletedSession;

  // The session row loads on its own, well before the four queries the result is actually computed
  // from — so without this the summary would first paint a winner-less card and an empty standings
  // list, then snap to the real result a moment later. Everything below waits on all four: the
  // winner is only knowable once totals are, and totals need the fields, the bonus rules, who
  // played, and their scores.
  const isResultPending =
    isMembersPending || isParticipantsPending || isTemplatePending || isScoresPending;

  // A single-winner game whose top total is shared and still unsettled. Only the scorekeeper can
  // settle it (`sessions_update`), so only they are asked — everyone else just sees the shared win
  // until it is. Deliberately not tied to the 2-hour edit window: a tie nobody resolved on the
  // night can be settled whenever the scorekeeper next opens the potje.
  // In a team game the tie is between teams, and so is the pick.
  const tiedLeaders: WinnerCandidate[] = sessionTeams
    ? teams.filter(isTeamWinner).map(teamCandidate)
    : participants
        .filter((member) => totalByUserId.get(member.userId)?.isWinner)
        .map(playerCandidate);
  const needsWinnerPick =
    showCompletedSummary &&
    !isResultPending &&
    isScorekeeper &&
    sessionData.game_templates.single_winner &&
    tiedLeaders.length > 1;

  function confirmPickWinner() {
    if (!pickedWinnerId) return;
    setSessionWinner.mutate(sessionTeams ? { team: Number(pickedWinnerId) } : pickedWinnerId);
  }

  /** "Potje afronden" for a team game decided on who won: opens the team prompt, whose confirm then
   *  finishes the potje — or, on one that's already finished, only corrects the winning team. */
  function openPickTeam() {
    finalizeSession.reset();
    setSessionWinner.reset();
    setPickedWinnerId(
      sessionData!.winning_team !== null ? String(sessionData!.winning_team) : null,
    );
    setIsPickTeamVisible(true);
  }

  function confirmPickTeam() {
    if (!pickedWinnerId) return;
    const winningTeam = Number(pickedWinnerId);
    const close = () => setIsPickTeamVisible(false);
    if (isCompletedSession) {
      setSessionWinner.mutate({ team: winningTeam }, { onSuccess: close });
      return;
    }
    withDraftNoteSaved(() => finalizeSession.mutate({ winningTeam }, { onSuccess: close }));
  }

  const pickTeamModal = isPickTeamVisible ? (
    <PickWinnerModal
      title="Welk team heeft gewonnen?"
      description="Kies het team dat dit potje won."
      laterLabel="Annuleren"
      candidates={teams.map(teamCandidate)}
      selectedId={pickedWinnerId}
      onSelect={setPickedWinnerId}
      onConfirm={confirmPickTeam}
      onLater={() => setIsPickTeamVisible(false)}
      isPending={finalizeSession.isPending || setSessionWinner.isPending || addNote.isPending}
      hasFailed={finalizeSession.isError || setSessionWinner.isError}
    />
  ) : null;

  if (showCompletedSummary) {
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
            displayedScoresByUser[member.userId] ?? {},
          ),
          values: displayedScoresByUser[member.userId] ?? {},
        };
      })
      // The winner always leads: on a tied top total the scorekeeper's pick would otherwise sit
      // wherever the participant order happened to put it.
      .sort(
        (a, b) =>
          Number(b.isWinner) - Number(a.isWinner) ||
          (higherTotalIsBetter(scoringDirection, isRounds) ? b.total - a.total : a.total - b.total),
      );

    // A team game's result reads per team: one bar per team, winner first, under the team's name.
    const orderedTeams = [...teams].sort(
      (a, b) =>
        Number(isTeamWinner(b)) - Number(isTeamWinner(a)) ||
        (higherTotalIsBetter(scoringDirection, isRounds) ? -1 : 1) *
          ((totalByUserId.get(a.members[0].userId)?.total ?? 0) -
            (totalByUserId.get(b.members[0].userId)?.total ?? 0)),
    );
    const orderedTeamRows = orderedTeams.map((team) => {
      const entry = totalByUserId.get(team.members[0].userId);
      return {
        name: team.label,
        total: entry?.total ?? 0,
        isWinner: entry?.isWinner ?? false,
        breakdown: computeBreakdown(
          fields,
          template?.bonus_rules ?? [],
          displayedScoresByUser[team.members[0].userId] ?? {},
        ),
      };
    });

    const winners = participants.filter((member) => totalByUserId.get(member.userId)?.isWinner);
    const winnerTitle = sessionTeams
      ? teams
          .filter(isTeamWinner)
          .map((team) => team.label)
          .join(' & ')
      : winners.map((member) => member.displayName).join(' & ');
    const orderedMembers = [...participants].sort(
      (a, b) =>
        Number(totalByUserId.get(b.userId)?.isWinner ?? false) -
          Number(totalByUserId.get(a.userId)?.isWinner ?? false) ||
        (totalByUserId.get(a.userId)?.total ?? 0) - (totalByUserId.get(b.userId)?.total ?? 0),
    );

    return (
      <AvatarMarksProvider groupId={sessionData.group_id}>
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
                {isResultPending ? (
                  // Sized to the winner avatar so the card doesn't jump once the result lands.
                  <View className="h-12 flex-1 items-center justify-center">
                    <ActivityIndicator />
                  </View>
                ) : (
                  <>
                    <View className="relative flex-row">
                      {winners.map((member, index) => (
                        // A tie stacks the winners' avatars, each ringed in the card colour so the
                        // overlap reads as separate faces.
                        <View
                          key={member.userId}
                          className="rounded-full border-2 border-surface"
                          style={{ marginLeft: index === 0 ? 0 : -14 }}
                        >
                          <MemberAvatar member={member} size={48} />
                        </View>
                      ))}
                      {/* Trophy badge overlaps the last (topmost) avatar's corner, like a
                        notification dot, instead of spelling "Winnaar" out as a separate pill next
                        to the name. */}
                      <View className="absolute -bottom-1 -right-1 h-6 w-6 items-center justify-center rounded-full border-2 border-surface bg-surface-muted">
                        <TrophyIcon size={13} color={theme.warning} />
                      </View>
                    </View>
                    <View className="min-w-0 flex-1 items-start">
                      <Text className="text-xl font-bold text-ink" numberOfLines={2}>
                        {winnerTitle || 'Nog geen winnaar'}
                      </Text>
                    </View>
                  </>
                )}
              </View>
            </Card>

            {needsWinnerPick && isWinnerPromptDismissed ? (
              <Button
                label="Winnaar kiezen"
                variant="secondary"
                onPress={() => {
                  setSessionWinner.reset();
                  setIsWinnerPromptDismissed(false);
                }}
                testID="open-pick-winner-button"
              />
            ) : null}

            {isTeamWin &&
            isScorekeeper &&
            !isResultPending &&
            (sessionData.winning_team === null || canEdit) ? (
              <Button
                label={sessionData.winning_team === null ? 'Winnaar kiezen' : 'Ander team kiezen'}
                variant="secondary"
                onPress={openPickTeam}
                testID="open-pick-team-button"
              />
            ) : null}

            <View>
              <SectionLabel>Eindstand</SectionLabel>
              {/* A plain ranked template has only a finish position to show; ranked-and-rounds
                (Dalmuti) banked real points round by round, so it gets the same points bar as a
                field-based template rather than an ordinal list. */}
              {isResultPending ? (
                <Card className="mt-2 items-center justify-center py-8">
                  <ActivityIndicator />
                </Card>
              ) : isTeamWin ? (
                <View className="mt-2 gap-2">
                  {orderedTeams.map((team) => (
                    <Card key={team.team} className="flex-row items-center gap-3">
                      <TeamHeader team={team} />
                      {isTeamWinner(team) ? <Badge tone="success">Gewonnen</Badge> : null}
                    </Card>
                  ))}
                </View>
              ) : sessionTeams ? (
                <Card className="mt-2">
                  <ScoreBars rows={orderedTeamRows} />
                </Card>
              ) : isRanked && !isRounds ? (
                <View className="mt-2">
                  <RankedOrderList members={orderedMembers} />
                </View>
              ) : (
                <Card className="mt-2">
                  {/* Catan shows where its points came from as columns, like the board screen. */}
                  <ScoreBars
                    rows={orderedRows}
                    columns={
                      gameKeyForTemplate(coverKey, gameName) === 'catan'
                        ? CATAN_POINT_COLUMNS
                        : undefined
                    }
                  />
                </Card>
              )}
            </View>

            {gameKeyForTemplate(coverKey, gameName) === 'catan' ? (
              <BoardScanSection sessionId={sessionId} />
            ) : null}

            <SessionNotesSection
              notes={notes ?? []}
              authorNameById={authorNameById}
              currentUserId={currentUserId}
              canDelete={canDeleteNotes}
              draft={noteDraft}
              onDraftChange={setNoteDraft}
              onAdd={handleAddNote}
              onDelete={setPendingDeleteNoteId}
              isAdding={addNote.isPending}
            />

            <SessionPhotosSection
              sessionId={sessionId}
              photos={photos}
              authorNameById={authorNameById}
              currentUserId={currentUserId}
              canDelete={canDeleteNotes}
            />
          </KeyboardAwareScrollView>

          {isDeleteConfirmVisible ? (
            <DeleteSessionConfirmModal
              onCancel={() => setIsDeleteConfirmVisible(false)}
              onConfirm={confirmDeleteSession}
              isPending={deleteSession.isPending}
              isCompleted
              hasFailed={deleteSession.isError}
            />
          ) : pendingDeleteNoteId ? (
            <DeleteNoteConfirmModal
              onCancel={() => setPendingDeleteNoteId(null)}
              onConfirm={confirmDeleteNote}
              isPending={deleteNote.isPending}
            />
          ) : needsWinnerPick && !isWinnerPromptDismissed ? (
            <PickWinnerModal
              candidates={tiedLeaders}
              selectedId={pickedWinnerId}
              onSelect={setPickedWinnerId}
              onConfirm={confirmPickWinner}
              onLater={() => setIsWinnerPromptDismissed(true)}
              isPending={setSessionWinner.isPending}
              hasFailed={setSessionWinner.isError}
            />
          ) : (
            pickTeamModal
          )}
        </View>
      </AvatarMarksProvider>
    );
  }

  // Reaching here while completed only ever means one of two things: a single-round session inside
  // its edit window (footer would just re-finalise an already-finished session — nothing to press),
  // or a rounds session mid-correction (footer needs its own "Correctie opslaan", not "Volgende
  // ronde" / "Potje afronden"). Both are handled below; only a live session keeps the original
  // footer.
  const hasFooter = canEdit && !(isCompletedSession && !isRounds);

  return (
    <AvatarMarksProvider groupId={sessionData.group_id}>
      <View className="flex-1 bg-surface">
        <KeyboardAwareScrollView
          className="flex-1"
          contentContainerClassName="gap-8 px-6 pt-6"
          // Without the pinned footer (a read-only viewer, or a completed single-round session
          // that saves inline with no footer at all), the scroll content itself is the last thing
          // above the bottom of the screen and needs the inset added directly.
          contentContainerStyle={{ paddingBottom: hasFooter ? 24 : 24 + insets.bottom }}
          // The footer rides above the keyboard (KeyboardStickyView below), so a focused field has
          // to clear it. Only part of the footer is visible there: the sticky offset pulls its
          // safe-area padding down behind the keyboard, so that part doesn't count.
          bottomOffset={8 + Math.max(footerHeight - insets.bottom, 0)}
          keyboardShouldPersistTaps="handled"
        >
          {/* A spectator's only cue that the screen is live and why nothing on it is tappable. */}
          {isInProgress && !canEdit && scorekeeperName ? (
            <Card tone="muted">
              <Text className="text-sm text-ink-muted">
                Je kijkt live mee. {scorekeeperName} houdt de score bij.
              </Text>
            </Card>
          ) : null}

          {isRankedRounds ? (
            <View>
              <RoundHeader
                label={roundLabel}
                canUndo={canEdit && canUndoRound}
                isUndoing={undoRound.isPending}
                onUndo={handleUndoRound}
              />
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
            </View>
          ) : isFieldRounds ? (
            <View>
              <RoundHeader
                label={roundLabel}
                canUndo={canEdit && canUndoRound}
                isUndoing={undoRound.isPending}
                onUndo={handleUndoRound}
              />
              <View className="mt-2 gap-2">
                {entryUnits.map(({ member, team }) => {
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
                      team={team}
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
          ) : isTeamWin ? (
            <View>
              <SectionLabel>Teams</SectionLabel>
              <View className="mt-2 gap-2">
                {teams.map((team) => (
                  <Card key={team.team} className="flex-row items-center gap-3">
                    <TeamHeader team={team} />
                  </Card>
                ))}
              </View>
              {canEdit ? (
                <Text className="mt-3 text-sm text-ink-muted">
                  Bij "Potje afronden" kies je welk team heeft gewonnen.
                </Text>
              ) : null}
            </View>
          ) : (
            <View>
              <SectionLabel>{sessionTeams ? 'Teams' : 'Deelnemers'}</SectionLabel>
              {isRanked ? (
                canEdit ? (
                  <View className="mt-2">
                    <RankedEntryList
                      participants={participants}
                      scoresByUser={displayedScoresByUser}
                      onReorder={(userIds) => {
                        // Same reasoning as handleCompletedFieldChange: a finished session's
                        // reorder is edited locally and only sent once "Klaar" flushes the draft,
                        // rather than writing every participant's rank on every drag.
                        if (isCompletedSession) {
                          setCompletedScoresDraft((current) => {
                            const next: ScoresByUser = { ...(current ?? {}) };
                            userIds.forEach((userId, index) => {
                              next[userId] = { ...next[userId], [RANK_FIELD_KEY]: index + 1 };
                            });
                            return next;
                          });
                          return;
                        }
                        // One write for the whole order: a drop past two players rewrites three
                        // ranks, and three separate upserts each triggered their own refetch right
                        // as the row was settling.
                        setScores.mutate(
                          userIds.map((userId, index) => ({
                            userId,
                            fieldKey: RANK_FIELD_KEY,
                            value: index + 1,
                          })),
                        );
                      }}
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
                  {/* The scorekeeper keeps a fixed order so a card never jumps out from under
                      their thumb mid-entry; everyone watching gets the live standings instead. */}
                  {(canEdit ? entryUnits : fieldStandingsUnits).map(({ member, team }) => (
                    <PlayerCard
                      key={member.userId}
                      member={member}
                      team={team}
                      isScorekeeper={member.userId === sessionData.scorekeeper_id}
                      fields={fields}
                      values={displayedScoresByUser[member.userId] ?? {}}
                      total={totalByUserId.get(member.userId)?.total ?? 0}
                      canEdit={canEdit}
                      isOpen={openParticipantId === member.userId}
                      showSummary
                      onToggleOpen={() =>
                        setOpenParticipantId((current) =>
                          current === member.userId ? null : member.userId,
                        )
                      }
                      onChangeField={(fieldKey, value) =>
                        isCompletedSession
                          ? handleCompletedFieldChange(member.userId, fieldKey, value)
                          : handleFieldChange(member.userId, fieldKey, value)
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
            canDelete={canDeleteNotes}
            draft={noteDraft}
            onDraftChange={setNoteDraft}
            onAdd={handleAddNote}
            onDelete={setPendingDeleteNoteId}
            isAdding={addNote.isPending}
          />

          <SessionPhotosSection
            sessionId={sessionId}
            photos={photos}
            authorNameById={authorNameById}
            currentUserId={currentUserId}
            canDelete={canDeleteNotes}
          />

          {/* Out of the pinned footer on purpose: it's the rare, destructive action, so it sits at
              the end of the scroll rather than next to "Potje afronden". */}
          {isInProgress && isScorekeeper ? (
            <Button
              label="Potje verwijderen"
              variant="ghost"
              onPress={() => {
                deleteSession.reset();
                setIsDeleteConfirmVisible(true);
              }}
              testID="delete-session-button"
            />
          ) : null}
        </KeyboardAwareScrollView>

        {hasFooter ? (
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
              {isCompletedSession ? (
                // Reaching here while completed only happens via the header pencil, on a rounds
                // template — the session is already finished, so this saves the correction and
                // nothing else; there's no "Volgende ronde" (no next round exists) and no "Potje
                // afronden" (it already is one, and calling finalizeSession again would reset
                // completed_at, silently restarting the edit window).
                <Button
                  label="Correctie opslaan"
                  onPress={handleSaveRoundCorrection}
                  isLoading={commitRound.isPending}
                  testID="round-correction-submit"
                />
              ) : isRounds ? (
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
                  onPress={
                    isTeamWin
                      ? openPickTeam
                      : () => withDraftNoteSaved(() => finalizeSession.mutate())
                  }
                  isLoading={finalizeSession.isPending || addNote.isPending}
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
            isPending={
              commitRound.isPending ||
              addNote.isPending ||
              finalizeSession.isPending ||
              deleteSession.isPending
            }
            hasFailed={commitRound.isError || finalizeSession.isError || deleteSession.isError}
          />
        ) : null}

        {pickTeamModal}

        {isDeleteConfirmVisible ? (
          <DeleteSessionConfirmModal
            onCancel={() => setIsDeleteConfirmVisible(false)}
            onConfirm={confirmDeleteSession}
            isPending={deleteSession.isPending}
          />
        ) : null}

        {pendingLeaveAction && !isFinishRoundsVisible && !isDeleteConfirmVisible ? (
          <LeaveSessionSheet
            onStay={() => setPendingLeaveAction(null)}
            onLeave={leaveSessionRunning}
            onDiscard={discardSessionAndLeave}
            isPending={deleteSession.isPending}
          />
        ) : null}

        {pendingDeleteNoteId &&
        !isFinishRoundsVisible &&
        !isDeleteConfirmVisible &&
        !pendingLeaveAction ? (
          <DeleteNoteConfirmModal
            onCancel={() => setPendingDeleteNoteId(null)}
            onConfirm={confirmDeleteNote}
            isPending={deleteNote.isPending}
          />
        ) : null}
      </View>
    </AvatarMarksProvider>
  );
}
