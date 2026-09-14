/**
 * A single scoring field during live entry: label on the left, minus / value / plus on the right.
 * Fields whose template sign is -1 are marked "telt af" in danger colour.
 */
export interface NumberStepperProps {
  /** The field's label from the game template, e.g. "Nederzettingen". */
  label: string;
  value?: number;
  onChange?: (value: number) => void;
  /** From the template field: 1 counts toward the total, -1 counts against it. */
  sign?: 1 | -1;
  step?: number;
  min?: number;
  max?: number;
}
export function NumberStepper(props: NumberStepperProps): JSX.Element;
