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
  /** Appended to the value in the tooltip ("×", "%"), when the series has a unit worth saying. */
  unit?: string;
}

/** A second line on its own scale, read off a right-hand axis — for two metrics with different
 *  units in one chart. */
export interface SecondaryTrend {
  series: TrendSeries;
  /** Fixed, since a second auto-scaled axis would make the two lines' crossings meaningless. */
  domain: [number, number];
  /** Caption above the right-hand axis, in the series' colour. */
  axisLabel: string;
  /** A faint dashed line in the series' colour, read off the right-hand axis — "50% is
   *  middenmoot". Unlabelled: the axis tick at its end already says where it sits. */
  referenceValue?: number;
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
  /** Plots one more line against its own right-hand axis. Both axes are then captioned and tinted
   *  in their line's colour, and the tooltip becomes a plain readout — ranking a × against a %
   *  means nothing. */
  secondary?: SecondaryTrend;
  /** Caption above the left-hand axis; only drawn alongside `secondary`, where two scales need
   *  telling apart. */
  axisLabel?: string;
}

const PAD = { left: 30, right: 8, top: 10, bottom: 10 };
/** Room for the "100%" ticks of a right-hand axis. */
const SECONDARY_PAD_RIGHT = 34;
/** Room above the plot for the two axis captions. */
const CAPTION_HEIGHT = 16;
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
  secondary,
  axisLabel,
}: TrendChartProps) {
  const pad = secondary
    ? { ...PAD, right: SECONDARY_PAD_RIGHT, top: PAD.top + CAPTION_HEIGHT }
    : PAD;
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

  const innerWidth = width - pad.left - pad.right;
  const innerHeight = height - pad.top - pad.bottom;
  const count = Math.max(1, labels.length);
  // A single session has no span to spread across, so it sits in the middle rather than on the
  // left edge where it would read as the start of a line that never arrived.
  const x = (index: number) =>
    pad.left + (count === 1 ? innerWidth / 2 : (index * innerWidth) / (count - 1));
  const y = (value: number) => {
    const ratio = (value - min) / (max - min);
    return pad.top + (inverted ? ratio * innerHeight : innerHeight - ratio * innerHeight);
  };
  const ySecondary = (value: number) => {
    const [secondaryMin, secondaryMax] = secondary?.domain ?? [0, 1];
    const ratio = (value - secondaryMin) / (secondaryMax - secondaryMin);
    return pad.top + innerHeight - ratio * innerHeight;
  };

  /** Every line with the scale it's read against, so drawing and scrubbing treat both axes alike. */
  const plotted = [
    ...series.map((entry) => ({ entry, toY: y })),
    ...(secondary ? [{ entry: secondary.series, toY: ySecondary }] : []),
  ];
  // With two axes, tinting each one in its line's colour is what ties a tick to a line.
  const primaryAxisColor = secondary ? series[0]?.color ?? theme.inkSubtle : theme.inkSubtle;

  const canScrub = hasData && width > 0;
  const indexAt = (touchX: number) => {
    if (count === 1) return 0;
    const ratio = (touchX - pad.left) / innerWidth;
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

  type ActiveEntry = { name: string; color: string; unit: string; value: number; y: number };
  const activeEntries =
    activeIndex === null
      ? []
      : plotted
          .map(({ entry, toY }) => {
            const value = entry.points[activeIndex];
            return value === null
              ? null
              : { name: entry.name, color: entry.color, unit: entry.unit ?? '', value, y: toY(value) };
          })
          .filter((entry): entry is ActiveEntry => entry !== null);

  // Two metrics on two scales are a readout, not a race — they keep their legend order, unranked.
  const tooltipRows = secondary
    ? activeEntries.map((entry) => ({ ...entry, label: entry.name }))
    : [...activeEntries]
        .sort((a, b) => (higherIsBetter ? b.value - a.value : a.value - b.value))
        .map((entry) => ({
          ...entry,
          label: `${
            1 +
            activeEntries.filter((other) =>
              higherIsBetter ? other.value > entry.value : other.value < entry.value,
            ).length
          }. ${entry.name}`,
        }));

  const tooltipX =
    activeIndex === null
      ? 0
      : Math.min(
          Math.max(x(activeIndex) - TOOLTIP_WIDTH / 2, pad.left),
          Math.max(pad.left, width - pad.right - TOOLTIP_WIDTH),
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
                  x1={pad.left}
                  x2={width - pad.right}
                  y1={y(tick)}
                  y2={y(tick)}
                  stroke={theme.line}
                  strokeWidth={1}
                />
              ))}
              {tickValues(min, max).map((tick) => (
                <SvgText
                  key={`tick-${tick}`}
                  x={pad.left - 6}
                  y={y(tick) + 4}
                  textAnchor="end"
                  fontSize={10}
                  fontWeight="500"
                  fill={primaryAxisColor}
                >
                  {Math.round(tick)}
                </SvgText>
              ))}

              {secondary ? (
                <>
                  {tickValues(...secondary.domain).map((tick) => (
                    <SvgText
                      key={`secondary-tick-${tick}`}
                      x={width - pad.right + 6}
                      y={ySecondary(tick) + 4}
                      textAnchor="start"
                      fontSize={10}
                      fontWeight="500"
                      fill={secondary.series.color}
                    >
                      {`${Math.round(tick)}${secondary.series.unit ?? ''}`}
                    </SvgText>
                  ))}
                  {/* The captions sit over their own column of ticks, so each axis names itself. */}
                  {axisLabel ? (
                    <SvgText
                      x={0}
                      y={PAD.top}
                      textAnchor="start"
                      fontSize={10}
                      fontWeight="600"
                      fill={primaryAxisColor}
                    >
                      {axisLabel}
                    </SvgText>
                  ) : null}
                  <SvgText
                    x={width}
                    y={PAD.top}
                    textAnchor="end"
                    fontSize={10}
                    fontWeight="600"
                    fill={secondary.series.color}
                  >
                    {secondary.axisLabel}
                  </SvgText>
                  {secondary.referenceValue !== undefined ? (
                    <Line
                      x1={pad.left}
                      x2={width - pad.right}
                      y1={ySecondary(secondary.referenceValue)}
                      y2={ySecondary(secondary.referenceValue)}
                      stroke={secondary.series.color}
                      strokeOpacity={0.5}
                      strokeWidth={1}
                      strokeDasharray="4,4"
                    />
                  ) : null}
                </>
              ) : null}

              {reference ? (
                <>
                  <Line
                    x1={pad.left}
                    x2={width - pad.right}
                    y1={y(reference.value)}
                    y2={y(reference.value)}
                    stroke={theme.inkSubtle}
                    strokeWidth={1}
                    strokeDasharray="4,4"
                  />
                  <SvgText
                    x={width - pad.right}
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

              {plotted.map(({ entry, toY }) =>
                segmentsOf(entry.points).map((segment, segmentIndex) => (
                  <Polyline
                    key={`${entry.name}-line-${segmentIndex}`}
                    fill="none"
                    stroke={entry.color}
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={segment.map((point) => `${x(point.index)},${toY(point.value)}`).join(' ')}
                  />
                )),
              )}
              {plotted.map(({ entry, toY }) =>
                entry.points.map((value, index) =>
                  value === null ? null : (
                    <Circle
                      key={`${entry.name}-dot-${index}`}
                      cx={x(index)}
                      cy={toY(value)}
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
                    y1={pad.top}
                    y2={height - pad.bottom}
                    stroke={theme.inkSubtle}
                    strokeWidth={1}
                    strokeDasharray="2,3"
                  />
                  {activeEntries.map((entry) => (
                    <Circle
                      key={`${entry.name}-active-dot`}
                      cx={x(activeIndex)}
                      cy={entry.y}
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
                        {row.label}
                      </Text>
                    </View>
                    <Text className="text-xs font-semibold text-ink">
                      {`${formatValue(row.value)}${row.unit}`}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}
        </View>

        <View className="mt-2 flex-row flex-wrap gap-x-4 gap-y-1.5" style={{ paddingLeft: pad.left }}>
          {plotted.map(({ entry }, index) => (
            <View key={entry.name} className="flex-row items-center gap-1.5">
              <View className="h-0.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
              <Text className="text-sm font-medium text-ink-muted">
                {/* With two axes, the legend also says which side to read each line off. */}
                {secondary
                  ? `${entry.name} (${index === plotted.length - 1 ? 'rechts' : 'links'})`
                  : entry.name}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </GestureDetector>
  );
}
