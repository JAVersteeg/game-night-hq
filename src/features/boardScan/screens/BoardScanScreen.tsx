import { useRoute, type RouteProp } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { PencilIcon } from '@/components/PencilIcon';
import { TrophyIcon } from '@/components/TrophyIcon';
import { SectionLabel } from '@/components/SectionLabel';
import { Text } from '@/components/Text';
import { useAuth } from '@/features/auth/context/AuthContext';
import {
  BoardView,
  PIECE_FILL,
  targetAnchor,
  type BoardTarget,
} from '@/features/boardScan/components/BoardView';
import { CATAN_POINT_COLUMNS } from '@/features/boardScan/components/ScoreIcons';
import {
  boardAsShown,
  checkBoard,
  COLOR_LABEL,
  compareWithScores,
  HARBOUR_LABEL,
  DEV_CARDS_FIELD,
  LARGEST_ARMY_FIELD,
  NUMBERS,
  PIECE_COLORS,
  recordedScores,
  summarize,
  TERRAIN_LABEL,
  TERRAINS,
  type BoardState,
  type HarbourKind,
  type PieceColor,
} from '@/features/boardScan/catan';
import {
  buildingAt,
  harbourAt,
  isCoastal,
  moveRobber,
  roadAt,
  setCorner,
  setHarbour,
  setHex,
  setRoad,
} from '@/features/boardScan/edit';
import {
  BOARD_SCAN_STALE_MS,
  MAX_BOARD_SCAN_ATTEMPTS,
  useBoardScan,
  useStartBoardScan,
  useUpdateBoardScan,
  type BoardScan,
} from '@/features/boardScan/useBoardScan';
import { useGroupMembers, type GroupMember } from '@/features/groups/hooks/useGroupMembers';
import { useSessionParticipants } from '@/features/sessions/hooks/useSessionParticipants';
import { useSessionScores } from '@/features/sessions/hooks/useSessionScores';
import { useSession } from '@/features/sessions/hooks/useSessions';
import type { AppStackParamList } from '@/navigation/types';
import { theme } from '@/lib/theme';

/** The players table's point columns, headed by icons; the labels are for screen readers. */
const COLUMNS = [...CATAN_POINT_COLUMNS, { key: 'total', label: 'Totaal', Icon: TrophyIcon }];

/** The digital board of a finished Catan session: analysing a photo, labelling colours, checking
 *  the result against the rules and the recorded scores, and correcting it piece by piece. */
export function BoardScanScreen() {
  const { sessionId } = useRoute<RouteProp<AppStackParamList, 'BoardScan'>>().params;
  const { session: authSession } = useAuth();
  const currentUserId = authSession?.user.id;
  const insets = useSafeAreaInsets();

  const { data: session } = useSession(sessionId);
  const { data: members } = useGroupMembers(session?.group_id ?? '');
  const { data: participantIds } = useSessionParticipants(sessionId);
  const { data: scoresByUser } = useSessionScores(sessionId);
  const { data: scan, isPending } = useBoardScan(sessionId);
  const startScan = useStartBoardScan(sessionId);

  const participants = (members ?? []).filter((m) => (participantIds ?? []).includes(m.userId));
  const isParticipant = !!currentUserId && (participantIds ?? []).includes(currentUserId);
  const attemptsLeft = MAX_BOARD_SCAN_ATTEMPTS - (scan?.attempts ?? 0);
  // A reading takes well under a minute; one still running long after that died on the way.
  const isStuck =
    scan?.status === 'analyzing' &&
    Date.now() - new Date(scan.updated_at).getTime() > BOARD_SCAN_STALE_MS;
  const canStart = isParticipant && (scan?.status !== 'analyzing' || isStuck) && attemptsLeft > 0;

  const [isReanalysing, setIsReanalysing] = useState(false);
  const [pickError, setPickError] = useState<string | null>(null);

  // Straight from the screen, no pop-up in between: one less tap, and iOS can refuse to open the
  // picker while a closing pop-up is still on screen.
  async function pickAndStart(source: 'camera' | 'library') {
    setPickError(null);
    if (source === 'camera') {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        setPickError('Geen toegang tot de camera. Sta dit toe in je instellingen.');
        return;
      }
    }
    // Full quality on purpose: telling a settlement from a city needs every pixel.
    const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 1 };
    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);
    const asset = result.canceled ? undefined : result.assets[0];
    if (!asset) return;
    startScan.mutate({ uri: asset.uri }, { onSuccess: () => setIsReanalysing(false) });
  }

  const startError = pickError ?? (startScan.error ? startScan.error.message : null);
  const photoOptions = (
    <View className="gap-2">
      {startError ? <Text className="text-sm text-danger">{startError}</Text> : null}
      {startScan.isPending ? (
        <View className="flex-row items-center gap-3 py-2">
          <ActivityIndicator color={theme.ink} />
          <Text className="text-sm text-ink-muted">Foto wordt voorbereid en verstuurd…</Text>
        </View>
      ) : (
        <>
          <Button
            label="Foto maken"
            onPress={() => void pickAndStart('camera')}
            testID="board-scan-camera"
          />
          <Button
            label="Kies uit galerij"
            variant="secondary"
            onPress={() => void pickAndStart('library')}
            testID="board-scan-library"
          />
          <Text className="text-xs text-ink-subtle">
            Recht van boven, met het hele bord in beeld. Telt als 1 van de {MAX_BOARD_SCAN_ATTEMPTS}{' '}
            analyses van dit potje (nog {attemptsLeft}).
          </Text>
        </>
      )}
    </View>
  );
  // Once there's a board, analysing again is the exception: tucked behind one quiet button.
  const startButton = !canStart ? null : scan?.status === 'ready' && !isReanalysing ? (
    <Button
      label={`Opnieuw analyseren (nog ${attemptsLeft}×)`}
      variant="ghost"
      onPress={() => setIsReanalysing(true)}
      testID="board-scan-start"
    />
  ) : (
    photoOptions
  );

  let body: ReactNode;
  if (isPending) {
    body = <ActivityIndicator color={theme.ink} />;
  } else if (!scan) {
    body = (
      <Card className="gap-3 p-5">
        <Text className="text-lg font-bold text-ink">Maak het bord digitaal</Text>
        <Text className="text-sm text-ink-muted">
          Maak een foto recht van boven, met het hele bord in beeld en zo min mogelijk schaduw. Het
          bord wordt daarna automatisch uitgelezen; je kunt alles achteraf corrigeren.
        </Text>
        {isParticipant ? (
          startButton
        ) : (
          <Text className="text-sm text-ink-subtle">
            Je speelde niet mee in dit potje. Alleen spelers kunnen het bord analyseren.
          </Text>
        )}
      </Card>
    );
  } else if (scan.status === 'analyzing') {
    body = (
      <Card className="items-center gap-3 p-6">
        <ActivityIndicator color={theme.ink} />
        <Text className="text-center text-base font-semibold text-ink">
          Bord wordt geanalyseerd…
        </Text>
        <Text className="text-center text-sm text-ink-muted">
          {isStuck
            ? 'Dit duurt veel langer dan normaal; de analyse is waarschijnlijk vastgelopen. Probeer het opnieuw.'
            : 'Dit duurt meestal minder dan een minuut. Je kunt de app gerust sluiten: het bord verschijnt hier zodra het klaar is.'}
        </Text>
        {isStuck ? startButton : null}
      </Card>
    );
  } else if (scan.status === 'failed' || !scan.state) {
    body = (
      <Card className="gap-3 p-5">
        <Text className="text-lg font-bold text-ink">Analyse mislukt</Text>
        <Text className="text-sm text-ink-muted">
          {attemptsLeft > 0
            ? 'Probeer het opnieuw, liefst met een scherpe foto recht van boven.'
            : 'Het maximum van 3 analyses voor dit potje is bereikt.'}
        </Text>
        {startButton}
      </Card>
    );
  } else {
    body = (
      <ReadyBoard
        scan={scan}
        state={scan.state}
        participants={participants}
        scoresByUser={scoresByUser ?? {}}
        currentUserId={currentUserId}
        canEdit={isParticipant}
        footer={startButton}
      />
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-surface-deep"
      contentContainerClassName="gap-5 px-4 pt-4"
      contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
    >
      {body}
    </ScrollView>
  );
}

function ReadyBoard({
  scan,
  state: rawState,
  participants,
  scoresByUser,
  currentUserId,
  canEdit,
  footer,
}: {
  scan: BoardScan;
  state: BoardState;
  participants: GroupMember[];
  scoresByUser: Record<string, Record<string, number>>;
  currentUserId: string | undefined;
  canEdit: boolean;
  footer: ReactNode;
}) {
  const { width } = useWindowDimensions();
  const layout = scan.layout;
  const update = useUpdateBoardScan(scan.session_id);
  const [editing, setEditing] = useState(false);
  const [target, setTarget] = useState<{ target: BoardTarget; anchor: Anchor } | null>(null);
  const boardRef = useRef<View>(null);
  const boardWidth = width - 32;
  const [labelling, setLabelling] = useState<PieceColor | null>(null);

  // `state` is the reading plus hand-made corrections, and what corrections apply to. `shown`
  // additionally lets the recorded scores settle settlement vs city for labelled colours.
  // Suggestions fill in only what nobody has labelled yet; saved labels always win.
  const recorded = recordedScores(
    participants.map((m) => m.userId),
    scoresByUser,
  );
  const { state, colorPlayers, shown } = boardAsShown(
    layout,
    rawState,
    scan.color_players,
    recorded,
  );
  const pendingSuggestions = PIECE_COLORS.filter((c) => colorPlayers[c] && !scan.color_players[c]);
  const summaries = summarize(layout, shown);
  const issues = checkBoard(layout, shown);
  const nameOf = (userId: string) =>
    participants.find((m) => m.userId === userId)?.displayName ?? 'Onbekend';
  const mismatches = compareWithScores(summaries, colorPlayers, recorded, nameOf);
  const unsure = shown.buildings.filter((b) => !b.sure).length;

  /** Opens the correction popover next to the tapped spot, measured where the board is now. */
  function openTarget(tapped: BoardTarget) {
    const local = targetAnchor(layout, tapped, boardWidth);
    boardRef.current?.measureInWindow((x, y) =>
      setTarget({ target: tapped, anchor: { x: x + local.x, y: y + local.y, r: local.r } }),
    );
  }

  function save(next: BoardState) {
    if (currentUserId) update.mutate({ userId: currentUserId, state: next });
  }
  function label(color: PieceColor, userId: string | null) {
    if (!currentUserId) return;
    const next = { ...scan.color_players };
    for (const c of PIECE_COLORS) if (userId && next[c] === userId) delete next[c];
    if (userId) next[color] = userId;
    else delete next[color];
    update.mutate({ userId: currentUserId, colorPlayers: next });
    setLabelling(null);
  }

  return (
    <View className="gap-5">
      <View className="gap-2">
        <View ref={boardRef} className="overflow-hidden rounded-2xl" style={{ width: boardWidth }}>
          <BoardView
            layout={layout}
            state={shown}
            width={boardWidth}
            // The tap markers go while a popover is open, so the clear circle shows the spot as is.
            editing={editing && !target}
            onPressTarget={openTarget}
          />
          {canEdit ? (
            // Correcting is a mode of the board itself, so its switch sits on the board.
            <Pressable
              onPress={() => setEditing((v) => !v)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={editing ? 'Klaar met corrigeren' : 'Corrigeren'}
              accessibilityState={{ selected: editing }}
              style={{ position: 'absolute', top: EDIT_BUTTON_INSET, right: EDIT_BUTTON_INSET }}
              className={`h-10 w-10 items-center justify-center rounded-full border active:opacity-70 ${
                editing ? 'border-accent bg-accent' : 'border-line bg-surface'
              }`}
              testID="board-scan-edit"
            >
              <PencilIcon size={18} color={editing ? theme.accentFg : theme.ink} />
            </Pressable>
          ) : null}
        </View>
        {unsure > 0 ? (
          <Text className="text-xs text-ink-subtle">
            Gestippeld met “?”: {unsure} {unsure === 1 ? 'gebouw' : 'gebouwen'} waarvan dorp of stad
            onzeker is of door de ingevulde scores is bepaald. Bevestig of corrigeer ze via het
            potlood rechtsboven op het bord.
          </Text>
        ) : null}
        {update.isError ? (
          <Text className="text-sm text-danger">{update.error.message}</Text>
        ) : null}
      </View>

      <View>
        <SectionLabel>Spelers</SectionLabel>
        <Card className="mt-2">
          <View className="flex-row items-end px-4 pb-1 pt-3">
            <View className="flex-1" />
            {COLUMNS.map(({ label, Icon }) => (
              <View key={label} className="w-8 items-center" accessibilityLabel={label}>
                <Icon size={18} color={theme.inkSubtle} />
              </View>
            ))}
          </View>
          {summaries.map((s) => {
            const userId = colorPlayers[s.color];
            const route = s.hasLongestRoad ? 2 : 0;
            // Largest army isn't on the board: it comes from the recorded scores.
            const army = userId ? (scoresByUser[userId]?.[LARGEST_ARMY_FIELD] ?? 0) : 0;
            const cards = userId ? (scoresByUser[userId]?.[DEV_CARDS_FIELD] ?? 0) : 0;
            return (
              <Pressable
                key={s.color}
                disabled={!canEdit}
                onPress={() => setLabelling(s.color)}
                className="border-t border-line px-4 py-3 active:opacity-70"
                accessibilityRole="button"
                accessibilityLabel={`Speler voor ${COLOR_LABEL[s.color]} kiezen`}
              >
                <View className="flex-row items-center">
                  <View
                    className="mr-2 h-4 w-4 rounded-full border border-line"
                    style={{ backgroundColor: PIECE_FILL[s.color] }}
                  />
                  <Text
                    numberOfLines={1}
                    className={`min-w-0 flex-1 text-base font-semibold ${userId ? 'text-ink' : 'text-ink-subtle'}`}
                  >
                    {userId ? nameOf(userId) : `Wie speelde ${COLOR_LABEL[s.color]}?`}
                    {userId && !scan.color_players[s.color] ? (
                      <Text className="text-sm font-normal text-ink-subtle"> (voorstel)</Text>
                    ) : null}
                  </Text>
                  <PointCell value={s.buildingPoints} />
                  <PointCell value={route} />
                  <PointCell value={army} />
                  <PointCell value={cards} />
                  <PointCell value={s.buildingPoints + route + army + cards} strong />
                </View>
                <View className="ml-6 mt-1 flex-row">
                  <Text className="w-16 text-xs text-ink-subtle">
                    {s.settlements} {s.settlements === 1 ? 'dorp' : 'dorpen'}
                  </Text>
                  <Text className="w-16 text-xs text-ink-subtle">
                    {s.cities} {s.cities === 1 ? 'stad' : 'steden'}
                  </Text>
                  <Text className="w-16 text-xs text-ink-subtle">route {s.longestRoad}</Text>
                </View>
              </Pressable>
            );
          })}
        </Card>
        {canEdit && pendingSuggestions.length > 0 ? (
          <View className="mt-2">
            <Button
              label="Voorstel overnemen"
              variant="secondary"
              onPress={() =>
                currentUserId && update.mutate({ userId: currentUserId, colorPlayers })
              }
              testID="board-scan-accept-suggestions"
            />
          </View>
        ) : null}
      </View>

      <View>
        <SectionLabel>Controle</SectionLabel>
        <Card className="mt-2 gap-2 p-4">
          {issues.length === 0 && mismatches.length === 0 ? (
            <Text className="text-sm text-success">
              Het bord klopt met de spelregels en de ingevulde scores.
            </Text>
          ) : null}
          {mismatches.map((m, i) => (
            <Text key={`m-${i}`} className="text-sm text-warning">
              {m.message}
            </Text>
          ))}
          {issues.map((issue, i) => (
            <Text
              key={`i-${i}`}
              className={`text-sm ${issue.level === 'error' ? 'text-danger' : 'text-warning'}`}
            >
              {issue.message}
            </Text>
          ))}
        </Card>
      </View>

      {footer}

      {labelling ? (
        <Sheet title={`Wie speelde ${COLOR_LABEL[labelling]}?`} onClose={() => setLabelling(null)}>
          {participants.map((m) => (
            <Chip
              key={m.userId}
              label={m.displayName}
              selected={colorPlayers[labelling] === m.userId}
              onPress={() => label(labelling, m.userId)}
            />
          ))}
          <Button label="Niemand" variant="ghost" onPress={() => label(labelling, null)} />
        </Sheet>
      ) : null}

      {target ? (
        <TargetSheet
          layout={layout}
          state={state}
          shown={shown}
          target={target.target}
          anchor={target.anchor}
          onChange={(next) => save(next)}
          onClose={() => setTarget(null)}
        />
      ) : null}
    </View>
  );
}

type Anchor = { x: number; y: number; r: number };

const POPOVER_WIDTH = 300;
/** The edit button's distance from the board's top and right edge — the same on both sides. */
const EDIT_BUTTON_INSET = 10;
/** `surface-deep` at 60%, as a raw colour: it's a border colour, not a className. */
const OVERLAY = `${theme.surfaceDeep}99`;

function TargetSheet({
  layout,
  state,
  shown,
  target,
  anchor,
  onChange,
  onClose,
}: {
  layout: BoardScan['layout'];
  /** What corrections apply to. */
  state: BoardState;
  /** What the board shows, with settlement/city settled by the scores. */
  shown: BoardState;
  target: BoardTarget;
  /** The tapped spot on screen. */
  anchor: Anchor;
  onChange: (next: BoardState) => void;
  onClose: () => void;
}) {
  return (
    <Popover
      anchor={anchor}
      nudge={target.type === 'corner' && buildingAt(layout, shown, target)?.kind === 'city'}
      onClose={onClose}
    >
      {target.type === 'hex' ? (
        <HexEditor state={state} target={target} onChange={onChange} onClose={onClose} />
      ) : target.type === 'corner' ? (
        <CornerEditor
          layout={layout}
          state={state}
          shown={shown}
          target={target}
          onChange={onChange}
          onClose={onClose}
        />
      ) : (
        <EdgeEditor layout={layout} state={state} target={target} onChange={onChange} />
      )}
    </Popover>
  );
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** The colour as read, shown as a fact with a pencil behind it to change it. */
function ColorLine({
  color,
  prefix,
  emptyLabel,
  onEdit,
}: {
  color: PieceColor | null;
  prefix?: string;
  emptyLabel: string;
  onEdit: () => void;
}) {
  return (
    <View className="flex-row items-center gap-3">
      {color ? (
        <>
          <View
            className="h-5 w-5 rounded-full border border-line"
            style={{ backgroundColor: PIECE_FILL[color] }}
          />
          <Text className="flex-1 text-base font-semibold text-ink">
            {prefix ? `${prefix} · ${COLOR_LABEL[color]}` : capitalize(COLOR_LABEL[color])}
          </Text>
          <Pressable
            onPress={onEdit}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Kleur aanpassen"
            className="p-1 active:opacity-70"
          >
            <PencilIcon size={18} color={theme.inkSubtle} />
          </Pressable>
        </>
      ) : (
        <Text className="flex-1 text-base font-semibold text-ink">{emptyLabel}</Text>
      )}
    </View>
  );
}

function ColorChips({
  selected,
  onPick,
}: {
  selected: PieceColor | null | undefined;
  onPick: (color: PieceColor) => void;
}) {
  return (
    <ChipRow>
      {PIECE_COLORS.map((c) => (
        <Chip
          key={c}
          label={COLOR_LABEL[c]}
          swatch={PIECE_FILL[c]}
          selected={selected === c}
          onPress={() => onPick(c)}
        />
      ))}
    </ChipRow>
  );
}

/**
 * A building. The colour as read is almost always right, so it's only shown; settlement vs city
 * is what usually needs fixing, so those are the big buttons — one tap saves and closes.
 */
function CornerEditor({
  layout,
  state,
  shown,
  target,
  onChange,
  onClose,
}: {
  layout: BoardScan['layout'];
  state: BoardState;
  shown: BoardState;
  target: Extract<BoardTarget, { type: 'corner' }>;
  onChange: (next: BoardState) => void;
  onClose: () => void;
}) {
  const current = buildingAt(layout, shown, target);
  const [color, setColor] = useState<PieceColor | null>(current?.color ?? null);
  const [isPickingColor, setIsPickingColor] = useState(!current);

  function pickColor(c: PieceColor) {
    setColor(c);
    setIsPickingColor(false);
    // An existing piece changes colour right away; a new one waits for its kind.
    if (current) onChange(setCorner(layout, state, target, { kind: current.kind, color: c }));
  }

  return (
    <View className="gap-3">
      <ColorLine
        color={color}
        emptyLabel="Welke kleur staat hier?"
        onEdit={() => setIsPickingColor((v) => !v)}
      />
      {isPickingColor ? <ColorChips selected={color} onPick={pickColor} /> : null}
      <View className="flex-row gap-2">
        {(['settlement', 'city'] as const).map((kind) => (
          <KindButton
            key={kind}
            label={kind === 'settlement' ? 'Dorp' : 'Stad'}
            selected={current?.kind === kind}
            disabled={!color}
            onPress={() => {
              if (!color) return;
              onChange(setCorner(layout, state, target, { kind, color }));
              onClose();
            }}
          />
        ))}
      </View>
      {current && !current.sure ? (
        <Text className="text-xs text-ink-subtle">
          Onzeker of door de scores bepaald — tik op Dorp of Stad om te bevestigen.
        </Text>
      ) : null}
      {current ? (
        <Pressable
          onPress={() => {
            onChange(setCorner(layout, state, target, null));
            onClose();
          }}
          accessibilityRole="button"
          className="self-start py-1 active:opacity-70"
        >
          <Text className="text-sm text-danger">Gebouw weghalen</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function KindButton({
  label,
  selected,
  disabled,
  onPress,
}: {
  label: string;
  selected: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      className={`flex-1 items-center rounded-2xl border py-3 active:opacity-70 ${
        selected ? 'border-accent-line bg-accent-soft' : 'border-line bg-surface-sunken'
      } ${disabled ? 'opacity-40' : ''}`}
    >
      <Text className="text-base font-semibold text-ink">{label}</Text>
    </Pressable>
  );
}

/** An edge: the road's colour as read, with a pencil to change it; harbours on the coast. */
function EdgeEditor({
  layout,
  state,
  target,
  onChange,
}: {
  layout: BoardScan['layout'];
  state: BoardState;
  target: Extract<BoardTarget, { type: 'edge' }>;
  onChange: (next: BoardState) => void;
}) {
  const road = roadAt(layout, state, target);
  const coastal = isCoastal(layout, target);
  const harbour = coastal ? harbourAt(layout, state, target) : null;
  const [isPickingColor, setIsPickingColor] = useState(!road);

  return (
    <View className="gap-3">
      <ColorLine
        color={road?.color ?? null}
        prefix="Weg"
        emptyLabel="Geen weg — kies een kleur om er een te leggen"
        onEdit={() => setIsPickingColor((v) => !v)}
      />
      {isPickingColor ? (
        <ColorChips
          selected={road?.color}
          onPick={(c) => {
            onChange(setRoad(layout, state, target, c));
            setIsPickingColor(false);
          }}
        />
      ) : null}
      {road ? (
        <Pressable
          onPress={() => onChange(setRoad(layout, state, target, null))}
          accessibilityRole="button"
          className="self-start py-1 active:opacity-70"
        >
          <Text className="text-sm text-danger">Weg weghalen</Text>
        </Pressable>
      ) : null}
      {coastal ? (
        <>
          <Text className="text-sm font-semibold text-ink">Haven</Text>
          <ChipRow>
            <Chip
              label="Geen"
              selected={!harbour}
              onPress={() => onChange(setHarbour(layout, state, target, null))}
            />
            {(Object.keys(HARBOUR_LABEL) as HarbourKind[]).map((kind) => (
              <Chip
                key={kind}
                label={HARBOUR_LABEL[kind]}
                selected={harbour?.kind === kind}
                onPress={() => onChange(setHarbour(layout, state, target, kind))}
              />
            ))}
          </ChipRow>
        </>
      ) : null}
    </View>
  );
}

function HexEditor({
  state,
  target,
  onChange,
  onClose,
}: {
  state: BoardState;
  target: Extract<BoardTarget, { type: 'hex' }>;
  onChange: (next: BoardState) => void;
  onClose: () => void;
}) {
  const hex = state.hexes.find((h) => h.row === target.row && h.col === target.col);
  const isRobber = state.robber.row === target.row && state.robber.col === target.col;
  return (
    <View className="gap-3">
      <ChipRow>
        {TERRAINS.map((terrain) => (
          <Chip
            key={terrain}
            label={TERRAIN_LABEL[terrain]}
            selected={hex?.terrain === terrain}
            onPress={() =>
              onChange(setHex(state, target.row, target.col, { terrain, number: hex?.number ?? 0 }))
            }
          />
        ))}
      </ChipRow>
      {hex && hex.terrain !== 'desert' ? (
        <ChipRow>
          {NUMBERS.map((n) => (
            <Chip
              key={n}
              label={String(n)}
              selected={hex.number === n}
              onPress={() =>
                onChange(setHex(state, target.row, target.col, { terrain: hex.terrain, number: n }))
              }
            />
          ))}
        </ChipRow>
      ) : null}
      <Chip
        label={isRobber ? 'De rover staat hier' : 'Rover hierheen'}
        selected={isRobber}
        onPress={() => onChange(moveRobber(state, target.row, target.col))}
      />
      <Button label="Klaar" variant="secondary" onPress={onClose} />
    </View>
  );
}

/**
 * A small card next to the tapped spot, with a ring around that spot so it's clear what's being
 * corrected. Opens below the spot in the top half of the screen and above it in the bottom half.
 */
function Popover({
  anchor,
  nudge = false,
  onClose,
  children,
}: {
  anchor: Anchor;
  /** Shift the circle slightly up-left: a city's tower makes it look off its corner. */
  nudge?: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const { width, height } = useWindowDimensions();
  // A little roomier than the spot itself; centred on it, except a city, whose tower makes it look
  // slightly up-left of the point it stands on.
  const r = anchor.r * 1.25;
  const cx = nudge ? anchor.x - 1 : anchor.x;
  const cy = nudge ? anchor.y - 1 : anchor.y;
  const below = cy < height / 2;
  const gap = r + 10;
  const cardWidth = Math.min(POPOVER_WIDTH, width - 32);
  const left = Math.min(Math.max(cx - cardWidth / 2, 16), width - cardWidth - 16);
  // The dim layer is one circle with a border so thick it covers the screen: the circle itself
  // stays fully clear, so the tapped spot shows exactly as it is.
  const spread = Math.max(width, height) * 2;
  return (
    <Modal
      visible
      transparent
      statusBarTranslucent
      navigationBarTranslucent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable className="flex-1" onPress={onClose} accessibilityLabel="Sluit">
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: cx - r - spread,
            top: cy - r - spread,
            width: (r + spread) * 2,
            height: (r + spread) * 2,
            borderRadius: r + spread,
            borderWidth: spread,
            borderColor: OVERLAY,
          }}
        />
        <Pressable
          className="absolute rounded-3xl border border-line bg-surface p-4"
          style={[
            { left, width: cardWidth },
            below ? { top: cy + gap } : { bottom: height - cy + gap },
          ]}
        >
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function Sheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  // Drawn edge-to-edge and padded by the real inset, so Android's navigation bar never covers it.
  const insets = useSafeAreaInsets();
  return (
    <Modal
      visible
      transparent
      statusBarTranslucent
      navigationBarTranslucent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        className="flex-1 justify-end bg-surface-deep/70"
        onPress={onClose}
        accessibilityLabel="Sluit"
      >
        <Pressable
          className="gap-3 rounded-t-3xl border border-line bg-surface p-6"
          style={{ paddingBottom: insets.bottom + 24 }}
        >
          <Text className="text-xl font-bold text-ink">{title}</Text>
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/** One number column in the players table; empty rather than 0, so the points that count stand out. */
function PointCell({ value, strong = false }: { value: number; strong?: boolean }) {
  return (
    <Text
      className={`w-8 text-center ${strong ? 'text-lg font-bold text-ink' : 'text-base text-ink-muted'}`}
    >
      {value > 0 || strong ? value : ''}
    </Text>
  );
}

function ChipRow({ children }: { children: ReactNode }) {
  return <View className="flex-row flex-wrap gap-2">{children}</View>;
}

function Chip({
  label,
  selected,
  onPress,
  swatch,
  disabled,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  swatch?: string;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      className={`flex-row items-center gap-2 rounded-full border px-3 py-1.5 active:opacity-70 ${
        selected ? 'border-accent-line bg-accent-soft' : 'border-line bg-surface-sunken'
      } ${disabled ? 'opacity-40' : ''}`}
    >
      {swatch ? (
        <View
          className="h-3 w-3 rounded-full border border-line"
          style={{ backgroundColor: swatch }}
        />
      ) : null}
      <Text className="text-sm text-ink">{label}</Text>
    </Pressable>
  );
}
