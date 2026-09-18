import { memo, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { View, type LayoutChangeEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

/** Where each row currently sits, by key. Lives on the UI thread so a drag never waits on React. */
type Positions = Record<string, number>;

const SPRING = { damping: 30, mass: 0.35, stiffness: 320, overshootClamping: true };

function positionsOf(keys: string[]): Positions {
  const positions: Positions = {};
  keys.forEach((key, index) => {
    positions[key] = index;
  });
  return positions;
}

/** Moves the row at `from` to `to`, shifting everything in between by one. */
function move(positions: Positions, from: number, to: number): Positions {
  'worklet';
  const next: Positions = {};
  for (const key in positions) {
    const position = positions[key]!;
    if (position === from) next[key] = to;
    else if (from < to && position > from && position <= to) next[key] = position - 1;
    else if (from > to && position < from && position >= to) next[key] = position + 1;
    else next[key] = position;
  }
  return next;
}

/**
 * A hold-and-drag reorderable list for short, uniform-height rows (a handful of players).
 *
 * Deliberately not built on react-native-draggable-flatlist. That library moves rows through a
 * FlatList: it only reports the new order once the drop spring has fully come to rest, then waits
 * for the re-render with the new data before it clears its translates — which is both why a drop
 * felt slow and why the neighbouring rows flickered. Here every row is absolutely positioned from
 * its slot on the UI thread, so data order never changes layout: the new order is committed the
 * instant the finger lifts, while the dropped row springs into place alongside it, and the next row
 * can be picked up straight away. Crossing a slot also updates the order handed to `renderItem`, so
 * position numbers and points update under the finger instead of after the drop.
 */
export function ReorderList<T>({
  data,
  keyExtractor,
  renderItem,
  onReorder,
  gap = 0,
  holdMs = 150,
}: {
  data: T[];
  keyExtractor: (item: T) => string;
  /** `index` is the row's live position, which follows the drag rather than `data`. */
  renderItem: (item: T, index: number, isActive: boolean) => ReactNode;
  onReorder: (data: T[]) => void;
  gap?: number;
  holdMs?: number;
}) {
  const keys = useMemo(() => data.map(keyExtractor), [data, keyExtractor]);
  const keysSignature = keys.join(',');

  const positions = useSharedValue<Positions>(positionsOf(keys));
  const activeKey = useSharedValue<string | null>(null);
  // Tagged with the data it was derived from, so new data shows its own order from the very first
  // render instead of one frame of stale positions.
  const [live, setLive] = useState({ base: keysSignature, order: keys });
  const liveOrder = live.base === keysSignature ? live.order : keys;
  const [activeRow, setActiveRow] = useState<string | null>(null);
  const [rowHeight, setRowHeight] = useState(0);
  const slot = useSharedValue(0);

  // New data from above (a commit echoing back, an undo, someone joining) is the truth. After our
  // own drop it already matches what's on screen, so nothing moves.
  useEffect(() => {
    positions.value = positionsOf(keys);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keysSignature]);

  const onLayoutRow = useCallback((event: LayoutChangeEvent) => {
    const height = event.nativeEvent.layout.height;
    setRowHeight((current) => Math.max(current, height));
  }, []);

  useEffect(() => {
    slot.value = rowHeight + gap;
  }, [rowHeight, gap, slot]);

  const orderFrom = useCallback(
    (next: Positions) => [...keys].sort((a, b) => (next[a] ?? 0) - (next[b] ?? 0)),
    [keys],
  );

  const onCross = useCallback(
    (next: Positions) => setLive({ base: keysSignature, order: orderFrom(next) }),
    [keysSignature, orderFrom],
  );

  const byKey = useMemo(
    () => new Map(data.map((item) => [keyExtractor(item), item])),
    [data, keyExtractor],
  );

  const onDrop = useCallback(
    (next: Positions) => {
      setActiveRow(null);
      const order = orderFrom(next);
      setLive({ base: keysSignature, order });
      if (order.join(',') === keysSignature) return;
      onReorder(order.map((key) => byKey.get(key)!));
    },
    [byKey, keysSignature, onReorder, orderFrom],
  );

  const height = rowHeight > 0 ? data.length * (rowHeight + gap) - gap : 0;

  return (
    // Hidden only for the first frame, before a row has been measured and the slots are known.
    <View style={{ height, opacity: rowHeight > 0 ? 1 : 0 }}>
      {keys.map((key) => (
        <ReorderRow
          key={key}
          rowKey={key}
          count={keys.length}
          positions={positions}
          activeKey={activeKey}
          slot={slot}
          holdMs={holdMs}
          onLayout={onLayoutRow}
          onStart={setActiveRow}
          onCross={onCross}
          onDrop={onDrop}
        >
          {renderItem(byKey.get(key)!, liveOrder.indexOf(key), activeRow === key)}
        </ReorderRow>
      ))}
    </View>
  );
}

const ReorderRow = memo(function ReorderRow({
  rowKey,
  count,
  positions,
  activeKey,
  slot,
  holdMs,
  onLayout,
  onStart,
  onCross,
  onDrop,
  children,
}: {
  rowKey: string;
  count: number;
  positions: SharedValue<Positions>;
  activeKey: SharedValue<string | null>;
  slot: SharedValue<number>;
  holdMs: number;
  onLayout: (event: LayoutChangeEvent) => void;
  onStart: (key: string) => void;
  onCross: (positions: Positions) => void;
  onDrop: (positions: Positions) => void;
  children: ReactNode;
}) {
  const top = useSharedValue(0);
  const dragStart = useSharedValue(0);
  // The row that was dragged last stays on top while it springs home, so it doesn't slide under
  // the neighbour it's landing next to.
  const raised = useSharedValue(false);

  // Follows this row's slot. Jumps on first placement or when the slot size is (re)measured,
  // springs when the order changes, and stays out of the way while this row is under the finger.
  useAnimatedReaction(
    () => ({ position: positions.value[rowKey] ?? 0, size: slot.value }),
    (current, previous) => {
      if (activeKey.value === rowKey) return;
      const target = current.position * current.size;
      if (!previous || previous.size !== current.size) top.value = target;
      else if (previous.position !== current.position) {
        // This cancels a pending drop spring before its callback can lower the row, so lower it
        // here — the row being dragged past it is the one that belongs on top now.
        raised.value = false;
        top.value = withSpring(target, SPRING);
      }
    },
  );

  const pan = Gesture.Pan()
    .activateAfterLongPress(holdMs)
    .onStart(() => {
      cancelAnimation(top);
      activeKey.value = rowKey;
      raised.value = true;
      dragStart.value = top.value;
      scheduleOnRN(onStart, rowKey);
    })
    .onUpdate((event) => {
      const max = (count - 1) * slot.value;
      top.value = Math.min(Math.max(dragStart.value + event.translationY, 0), max);
      const from = positions.value[rowKey] ?? 0;
      const to = slot.value > 0 ? Math.round(top.value / slot.value) : from;
      if (to !== from) {
        positions.value = move(positions.value, from, to);
        scheduleOnRN(onCross, positions.value);
      }
    })
    .onFinalize(() => {
      if (activeKey.value !== rowKey) return;
      activeKey.value = null;
      top.value = withSpring((positions.value[rowKey] ?? 0) * slot.value, SPRING, (finished) => {
        if (finished) raised.value = false;
      });
      scheduleOnRN(onDrop, positions.value);
    });

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: top.value }],
    zIndex: raised.value ? 1 : 0,
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        onLayout={onLayout}
        style={[{ position: 'absolute', left: 0, right: 0, top: 0 }, style]}
      >
        {children}
      </Animated.View>
    </GestureDetector>
  );
});
