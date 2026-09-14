/**
 * The "nothing here yet" block for an empty list. States the fact, then offers
 * both routes forward, without blaming the user.
 *
 * @startingPoint section="Core" subtitle="Empty list message with action" viewport="700x300"
 */
export interface EmptyStateProps {
  /** Short statement of fact, e.g. "Nog geen groepen". */
  title: string;
  /** One or two sentences on what to do next. */
  body?: string;
  /** Optional Button. */
  action?: React.ReactNode;
  style?: React.CSSProperties;
}
export function EmptyState(props: EmptyStateProps): JSX.Element;
