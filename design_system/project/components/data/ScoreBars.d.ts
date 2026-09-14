export interface ScoreBarRow {
  name: string;
  /** Signed total for the session. */
  total: number;
}

/**
 * Final totals for one session as horizontal bars, in finishing order. The first row
 * is the winner and takes the success colour; the rest are clay-700.
 */
export interface ScoreBarsProps {
  /** Already sorted by the template's scoring direction. */
  rows: ScoreBarRow[];
  winnerTone?: string;
}
export function ScoreBars(props: ScoreBarsProps): JSX.Element;
