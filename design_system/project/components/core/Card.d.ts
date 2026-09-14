/**
 * Bordered container and list row. Extracted from the repeated
 * "rounded-2xl border border-line bg-surface px-4 py-4" block in the screens.
 *
 * @startingPoint section="Core" subtitle="Bordered card and list row" viewport="700x180"
 */
export interface CardProps {
  children?: React.ReactNode;
  /** plain = --surface, muted = --surface-muted (used for placeholder panels). */
  tone?: 'plain' | 'muted';
  /** Adds press feedback and a button role. */
  interactive?: boolean;
  onClick?: () => void;
  /** Overrides the default 16px padding. */
  padding?: string;
  style?: React.CSSProperties;
}
export function Card(props: CardProps): JSX.Element;

export interface ListRowProps {
  title: string;
  meta?: string;
  right?: React.ReactNode;
  onClick?: () => void;
}
export function ListRow(props: ListRowProps): JSX.Element;
