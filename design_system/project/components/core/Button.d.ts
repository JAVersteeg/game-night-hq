/**
 * The app's only action control. Primary for the single forward action on a screen,
 * secondary for a same-weight alternative, ghost for a low-commitment escape.
 *
 * @startingPoint section="Core" subtitle="Primary, secondary and ghost actions" viewport="700x150"
 */
export interface ButtonProps {
  /** Button text. Sentence case, verb-first. */
  label?: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  /** Swaps the label for a spinner and blocks presses. */
  isLoading?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
}
export function Button(props: ButtonProps): JSX.Element;
