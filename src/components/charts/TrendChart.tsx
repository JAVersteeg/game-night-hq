import { useState } from 'react';
import { View } from 'react-native';
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
}

const PAD = { left: 30, right: 8, top: 10, bottom: 22 };
const DOT_RADIUS = 2.5;

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

/**
 * Score trend over time: one line per player, evenly spaced by session index. Deliberately plain,
 * per the design system — hairline grid, 2px lines, small dots, no area fill, no animation, no
 * tooltips. Width is measured rather than passed so it fills whatever card it's dropped into.
 */
export function TrendChart({
  series,
  labels,
  height = 168,
  inverted = false,
  domain,
}: TrendChartProps) {
  const [width, setWidth] = useState(0);

  const values = series.flatMap((entry) => entry.points).filter((point) => point !== null);
  const hasData = values.length > 0 && labels.length > 0;

  let min = 0;
  let max = 1;
  if (domain) {
    [min, max] = domain;
  } else if (hasData) {
    const rawMin = Math.min(...values);
    const rawMax = Math.max(...values);
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

  const labelStep = Math.ceil(count / 5);

  return (
    <View onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      {/* Nothing to draw until onLayout has reported a width — one frame, invisible in practice. */}
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

          {labels.map((label, index) =>
            index % labelStep === 0 || index === count - 1 ? (
              <SvgText
                key={`label-${index}`}
                x={x(index)}
                y={height - 6}
                textAnchor="middle"
                fontSize={10}
                fontWeight="500"
                fill={theme.inkSubtle}
              >
                {label}
              </SvgText>
            ) : null,
          )}

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
        </Svg>
      ) : (
        <View style={{ height }} />
      )}

      <View className="mt-2 flex-row flex-wrap gap-x-4 gap-y-1.5" style={{ paddingLeft: PAD.left }}>
        {series.map((entry) => (
          <View key={entry.name} className="flex-row items-center gap-1.5">
            <View className="h-0.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
            <Text className="text-sm font-medium text-ink-muted">{entry.name}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
