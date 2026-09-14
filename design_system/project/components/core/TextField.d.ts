/**
 * Single-line text input. Same geometry as Button so the two stack cleanly in a form.
 *
 * @startingPoint section="Core" subtitle="Text input, focus and error states" viewport="700x200"
 */
export interface TextFieldProps {
  value?: string;
  onChange?: (value: string) => void;
  /** Shown in ink-subtle. Write it as an example, not an instruction. */
  placeholder?: string;
  /** Optional field label above the input. */
  label?: string;
  /** Error message shown below; also retints the border. */
  error?: string;
  maxLength?: number;
  id?: string;
  style?: React.CSSProperties;
}
export function TextField(props: TextFieldProps): JSX.Element;
