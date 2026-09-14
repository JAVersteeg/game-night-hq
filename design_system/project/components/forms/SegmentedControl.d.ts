/**
 * Tab row for the views inside a group (games, history, stats). Two to four options,
 * one word each. Not for filters and not for more than four.
 */
export interface SegmentedControlProps {
  /** Option labels. Also the value. */
  options: string[];
  value?: string;
  onChange?: (value: string) => void;
}
export function SegmentedControl(props: SegmentedControlProps): JSX.Element;
