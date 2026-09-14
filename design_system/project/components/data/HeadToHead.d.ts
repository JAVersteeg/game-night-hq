/**
 * Head-to-head record between two group members: counts above a single split bar.
 * Draws sit in the middle in ink-faint.
 */
export interface HeadToHeadProps {
  /** Left player's display name. */
  left: string;
  right: string;
  leftWins?: number;
  rightWins?: number;
  draws?: number;
}
export function HeadToHead(props: HeadToHeadProps): JSX.Element;
