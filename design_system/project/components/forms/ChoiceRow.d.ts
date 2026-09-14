/**
 * Selectable row: one of a set (radio) or any of a set (check). Used for the scoring
 * direction, picking who plays tonight, and picking the scorekeeper.
 */
export interface ChoiceRowProps {
  title: string;
  meta?: string;
  /** Optional leading element, usually an Avatar. */
  left?: React.ReactNode;
  mode?: 'radio' | 'check';
  selected?: boolean;
  onSelect?: () => void;
}
export function ChoiceRow(props: ChoiceRowProps): JSX.Element;
