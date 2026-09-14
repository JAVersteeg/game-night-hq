/**
 * Identity badge for a player. Renders initials on accent-soft until image upload exists
 * (profiles.avatar_url is in the schema but nothing writes it yet).
 *
 * @startingPoint section="Core" subtitle="Initials avatar at every size" viewport="700x150"
 */
export interface AvatarProps {
  /** Full display name; initials are derived from it. */
  displayName: string;
  /** Diameter in px. Drives the font size too. Default 40. */
  size?: number;
  /** From profiles.avatar_url. Falls back to initials when null. */
  avatarUrl?: string | null;
  style?: React.CSSProperties;
}
export function Avatar(props: AvatarProps): JSX.Element;
export function initialsFrom(displayName: string): string;
