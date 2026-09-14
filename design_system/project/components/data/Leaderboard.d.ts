export interface LeaderboardRow {
  name: string;
  /** One string per column, pre-formatted. Percentages include the sign. */
  values: (string | number)[];
  /** Tints the row — use for the signed-in user. */
  highlight?: boolean;
}

/**
 * Per-game leaderboard table. Rows render in the order given; the caller applies the
 * template's scoring direction before passing them in.
 */
export interface LeaderboardProps {
  rows: LeaderboardRow[];
  /** Column headers, right-aligned. Three fit at phone width. */
  columns?: string[];
  /** Optional avatar renderer, called per row. */
  renderAvatar?: (row: LeaderboardRow) => React.ReactNode;
}
export function Leaderboard(props: LeaderboardProps): JSX.Element;
