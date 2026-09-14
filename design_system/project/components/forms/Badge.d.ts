/**
 * Status pill. Live sessions use warning, finished sessions neutral, the winner success,
 * the scorekeeper accent.
 */
export interface BadgeProps {
  children?: React.ReactNode;
  tone?: 'neutral' | 'accent' | 'success' | 'warning' | 'danger';
  style?: React.CSSProperties;
}
export function Badge(props: BadgeProps): JSX.Element;
