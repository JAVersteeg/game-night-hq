/**
 * One headline number with its label, for the top of a stats screen. Three across
 * at phone width; the number is tabular and never decorated.
 */
export interface StatTileProps {
  /** What the number is, lower case, e.g. "avonden gespeeld". */
  label: string;
  value: string | number;
  /** Short suffix rendered smaller, e.g. "%" or "pt". */
  unit?: string;
  /** Optional second line in ink-subtle. */
  meta?: string;
}
export function StatTile(props: StatTileProps): JSX.Element;
