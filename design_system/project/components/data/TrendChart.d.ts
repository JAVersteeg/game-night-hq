export interface TrendSeries {
  /** Player display name, shown in the legend. */
  name: string;
  /** A --series-N token, so a player keeps one colour across every chart. */
  color: string;
  /** One total per session, oldest first. */
  points: number[];
}

/**
 * Score trend per player over session history. Hairline grid, 2px lines, small dots,
 * no area fill and no animation — the numbers are the content.
 *
 * @startingPoint section="Stats" subtitle="Score trend line chart" viewport="700x260"
 */
export interface TrendChartProps {
  series: TrendSeries[];
  /** X labels, one per point. Short dates, e.g. "12/9". */
  labels?: string[];
  height?: number;
  /** Design width used for the viewBox; the svg itself scales to its container. */
  width?: number;
}
export function TrendChart(props: TrendChartProps): JSX.Element;
