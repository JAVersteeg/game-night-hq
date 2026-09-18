import { useState } from 'react';
import { View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Text } from '@/components/Text';
import Svg, { Circle, Line, Polyline, Text as SvgText } from 'react-native-svg';

import { theme } from '@/lib/theme';

export interface TrendSeries {
  name: string;
  color: string;
  /** `null` where the player wasn't in that session — the line breaks there instead of dipping
   *  through a score they never had. */
  points: (number | null)[];
}

interface TrendChartProps {
  series: TrendSeries[];
  /** One per x position; drawn thinned out when there are too many to fit. */
  labels: string[];
  height?: number;
  /** Ranked games plot finish position, where 1 is best — flips the axis so first place is on top. */
  inverted?: boolean;
  /** Overrides the padded auto-scale, for axes with a real fixed range (1..n finish positions). */
  domain?: [number, number];
  /** A horizontal line the series is read against — "1,0× is toeval" on a Winstfactor chart.
   *  Drawn dashed under the lines, with its label riding just above the right-hand end. */
  reference?: { value: number; label: string };
  /** Whether a bigger value is the better one — decides the rank order the hold-to-inspect
   *  tooltip sorts by. Independent of `inverted`, which is purely about axis direction: a
   *  lowest-total-wins chart still plots low at the bottom, but low is what wins. */
  higherIsBetter?: boolean;
}

const PAD = { left: 30, right: 8, top: 10, bottom: 10 };
const DOT_RADIUS = 2.5;
const TOOLTIP_WIDTH = 140;
/** Space between the chart's top edge and the tooltip floating above it. */
const TOOLTIP_GAP = 8;
/** How still-and-held a touch has to be before it starts scrubbing, so a normal scroll that
 *  happens to start on the chart still scrolls — only a deliberate hold locks it. */
const HOLD_DELAY_MS = 150;

/** Three ticks normally; on a short integer range (finish positions) every step, so the axis never
 *  labels a rank of 2.5. */
function tickValues(min: number, max: number): number[] {
  const span = max - min;
  if (span <= 6 && Number.isInteger(min) && Number.isInteger(max)) {
    const step = Math.max(1, Math.ceil(span / 3));
    const ticks: number[] = [];
    for (let value = min; value < max; value += step) ticks.push(value);
    ticks.push(max);
    return ticks;
  }
  return [min, min + span / 2, max];
}

/** Splits a point list into runs of consecutive non-null values, so gaps break the line. */
function segmentsOf(points: (number | null)[]): { index: number; value: number }[][] {
  const segments: { index: number; value: number }[][] = [];
  let current: { index: number; value: number }[] = [];

  points.forEach((value, index) => {
    if (value === null) {
      if (current.length > 0) segments.push(current);
      current = [];
    } else {
      current.push({ index, value });
    }
  });
  if (current.length > 0) segments.push(current);

  return segments;
}

/** Dutch decimals, like every other number in the app. */
function formatValue(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1).replace('.', ',');
}

/**
 * Score trend over time: one line per player, evenly spaced by session index. Deliberately plain,
 * per the design system — hairline grid, 2px lines, small dots, no area fill, no animation.
 * Holding a finger on the chart drops a crosshair on the nearest session and floats a tooltip
 * above it with every player's score and rank there, since the lines alone can't be read
 * precisely once more than two or three cross each other. Width is measured rather than passed so
 * it fills whatever card it's dropped into.
 */
export function TrendChart({
  series,
  labels,
  height = 168,
  inverted = false,
  domain,
  reference,
  higherIsBetter = true,
}: TrendChartProps) {
  const [width, setWidth] = useState(0);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const values = series.flatMap((entry) => entry.points).filter((point) => point !== null);
  const hasData = values.length > 0 && labels.length > 0;

  let min = 0;
  let max = 1;
  if (domain) {
    [min, max] = domain;
  } else if (hasData) {
    // The reference joins the extremes: a line drawn outside the plotted range would be clipped
    // off the chart, taking the only thing the series is supposed to be read against with it.
    const rawMin = Math.min(...values, reference?.value ?? Infinity);
    const rawMax = Math.max(...values, reference?.value ?? -Infinity);
    const span = Math.max(1, rawMax - rawMin);
    min = Math.floor((rawMin - span * 0.15) / 2) * 2;
    max = Math.ceil((rawMax + span * 0.15) / 2) * 2;
  }
  if (max === min) max = min + 1;

  const innerWidth = width - PAD.left - PAD.right;
  const innerHeight = height - PAD.top - PAD.bottom;
  const count = Math.max(1, labels.length);
  // A single session has no span to spread across, so it sits in the middle rather than on the
  // left edge where it would read as the start of a line that never arrived.
  const x = (index: number) =>
    PAD.left + (count === 1 ? innerWidth / 2 : (index * innerWidth) / (count - 1));
  const y = (value: number) => {
    const ratio = (value - min) / (max - min);
    return PAD.top + (inverted ? ratio * innerHeight : innerHeight - ratio * innerHeight);
  };

  const canScrub = hasData && width > 0;
  const indexAt = (touchX: number) => {
    if (count === 1) return 0;
    const ratio = (touchX - PAD.left) / innerWidth;
    return Math.min(count - 1, Math.max(0, Math.round(ratio * (count - 1))));
  };

  // A plain Pan gesture would grab every touch on the first frame and fight the screen's own
  // ScrollView for it, which is what made the tooltip flicker shut while someone was mid-scroll.
  // `activateAfterLongPress` keeps the touch available to the ScrollView until it's been held
  // still for a beat; only once it activates does it start scrubbing and block the scroll for the
  // rest of that gesture. Runs on the JS thread since it only touches plain React state.
  const scrubGesture = Gesture.Pan()
    .activateAfterLongPress(HOLD_DELAY_MS)
    .onStart((event) => {
      if (canScrub) setActiveIndex(indexAt(event.x));
    })
    .onUpdate((event) => {
      if (canScrub) setActiveIndex(indexAt(event.x));
    })
    .onFinalize(() => setActiveIndex(null))
    .runOnJS(true);

  const activeEntries =
    activeIndex === null
      ? []
      : series
          .map((entry) => ({ name: entry.name, color: entry.color, value: entry.points[activeIndex] }))
          .filter((entry): entry is { name: string; color: string; value: number } => entry.value !== null);

  const tooltipRows = [...activeEntries]
    .sort((a, b) => (higherIsBetter ? b.value - a.value : a.value - b.value))
    .map((entry) => ({
      ...entry,
      rank:
        1 +
        activeEntries.filter((other) =>
          higherIsBetter ? other.value > entry.value : other.value < entry.value,
        ).length,
    }));

  const tooltipX =
    activeIndex === null
      ? 0
      : Math.min(
          Math.max(x(activeIndex) - TOOLTIP_WIDTH / 2, PAD.left),
          Math.max(PAD.left, width - PAD.right - TOOLTIP_WIDTH),
        );

  return (
    <GestureDetector gesture={scrubGesture}>
      <View onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
        {/* Its own fixed-height box, separate from the legend below, so the tooltip — anchored to
            this box's top edge — floats above the chart itself rather than above the whole
            component. It's allowed to spill outside this box and the card around it; nothing here
            clips. */}
        <View style={{ height }}>
          {hasData && width > 0 ? (
            <Svg width={width} height={height}>
              {tickValues(min, max).map((tick) => (
                <Line
                  key={`grid-${tick}`}
                  x1={PAD.left}
                  x2={width - PAD.right}
                  y1={y(tick)}
                  y2={y(tick)}
                  stroke={theme.line}
                  strokeWidth={1}
                />
              ))}
              {tickValues(min, max).map((tick) => (
                <SvgText
                  key={`tick-${tick}`}
                  x={PAD.left - 6}
                  y={y(tick) + 4}
                  textAnchor="end"
                  fontSize={10}
                  fontWeight="500"
                  fill={theme.inkSubtle}
                >
                  {Math.round(tick)}
                </SvgText>
              ))}

              {reference ? (
                <>
                  <Line
                    x1={PAD.left}
                    x2={width - PAD.right}
                    y1={y(reference.value)}
                    y2={y(reference.value)}
                    stroke={theme.inkSubtle}
                    strokeWidth={1}
                    strokeDasharray="4,4"
                  />
                  <SvgText
                    x={width - PAD.right}
                    y={y(reference.value) - 4}
                    textAnchor="end"
                    fontSize={10}
                    fontWeight="500"
                    fill={theme.inkSubtle}
                  >
                    {reference.label}
                  </SvgText>
                </>
              ) : null}

              {series.map((entry) =>
                segmentsOf(entry.points).map((segment, segmentIndex) => (
                  <Polyline
                    key={`${entry.name}-line-${segmentIndex}`}
                    fill="none"
                    stroke={entry.color}
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={segment.map((point) => `${x(point.index)},${y(point.value)}`).join(' ')}
                  />
                )),
              )}
              {series.map((entry) =>
                entry.points.map((value, index) =>
                  value === null ? null : (
                    <Circle
                      key={`${entry.name}-dot-${index}`}
                      cx={x(index)}
                      cy={y(value)}
                      r={DOT_RADIUS}
                      fill={theme.surface}
                      stroke={entry.color}
                      strokeWidth={2}
                    />
                  ),
                ),
              )}

              {activeIndex !== null && tooltipRows.length > 0 ? (
                <>
                  <Line
                    x1={x(activeIndex)}
                    x2={x(activeIndex)}
                    y1={PAD.top}
                    y2={height - PAD.bottom}
                    stroke={theme.inkSubtle}
                    strokeWidth={1}
                    strokeDasharray="2,3"
                  />
                  {activeEntries.map((entry) => (
                    <Circle
                      key={`${entry.name}-active-dot`}
                      cx={x(activeIndex)}
                      cy={y(entry.value)}
                      r={DOT_RADIUS + 1.5}
                      fill={entry.color}
                      stroke={theme.surface}
                      strokeWidth={1.5}
                    />
                  ))}
                </>
              ) : null}
            </Svg>
          ) : null}

          {activeIndex !== null && tooltipRows.length > 0 ? (
            <View
              pointerEvents="none"
              className="absolute rounded-xl border border-line bg-surface-sunken px-2 py-1.5"
              style={{ left: tooltipX, bottom: height + TOOLTIP_GAP, width: TOOLTIP_WIDTH }}
            >
              <Text className="text-xs font-semibold text-ink-subtle" numberOfLines={1}>
                {labels[activeIndex]}
              </Text>
              <View className="mt-1 gap-1">
                {tooltipRows.map((row) => (
                  <View key={row.name} className="flex-row items-center justify-between gap-2">
                    <View className="min-w-0 flex-1 flex-row items-center gap-1.5">
                      <View
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: row.color }}
                      />
                      <Text className="shrink text-xs font-medium text-ink" numberOfLines={1}>
                        {`${row.rank}. ${row.name}`}
                      </Text>
                    </View>
                    <Text className="text-xs font-semibold text-ink">{formatValue(row.value)}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}
        </View>

        <View className="mt-2 flex-row flex-wrap gap-x-4 gap-y-1.5" style={{ paddingLeft: PAD.left }}>
          {series.map((entry) => (
            <View key={entry.name} className="flex-row items-center gap-1.5">
              <View className="h-0.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
              <Text className="text-sm font-medium text-ink-muted">{entry.name}</Text>
            </View>
          ))}
        </View>
      </View>
    </GestureDetector>
  );
}
