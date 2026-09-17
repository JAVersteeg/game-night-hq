import type {
  NewGameTemplateField,
  ScoringDirection,
} from '@/features/games/hooks/useGameTemplates';

export interface GameLibraryEntry {
  id: string;
  name: string;
}

/**
 * Every game offered in the create-game screen's name search, whether or not it also has a full
 * scoring template below. Picking one always fills in the name and cover (via `id`, the same key
 * `GAME_COVERS` and a created template's `cover_key` use); only entries whose `id` also appears in
 * `GAME_TEMPLATE_PRESETS` prefill scoring direction and fields too. Adding a game here with no
 * matching preset is expected — it's how a game can be searchable without anyone having done the
 * work of defining its scoring yet.
 */
export const GAME_LIBRARY: GameLibraryEntry[] = [
  { id: 'catan', name: 'Catan' },
  { id: 'heat', name: 'Heat' },
  { id: 'arschmallows', name: 'Arschmallows' },
  { id: 'dalmuti', name: 'De Grote Dalmuti' },
  { id: 'terraforming_mars', name: 'Terraforming Mars' },
  { id: 'secret_hitler', name: 'Secret Hitler' },
  { id: 'wingspan', name: 'Wingspan' },
];

const BY_NORMALIZED_NAME = new Map(
  GAME_LIBRARY.map((entry) => [entry.name.trim().toLowerCase(), entry.id]),
);

/**
 * The library key a saved template belongs to. `cover_key` is authoritative, but templates created
 * before covers existed (or typed in by hand rather than picked from the search) have none, so an
 * exact name match against the library stands in — that's what makes an older "Catan" row still
 * render Catan's art and colour. Deliberately exact: a variant like "Catan - Steden en Ridders" is
 * its own game and keeps the neutral fallback rather than borrowing Catan's identity.
 */
export function gameKeyForTemplate(
  coverKey: string | null | undefined,
  name: string | null | undefined,
): string | undefined {
  if (coverKey) return coverKey;
  return name ? BY_NORMALIZED_NAME.get(name.trim().toLowerCase()) : undefined;
}

export interface GameTemplatePreset {
  id: string;
  name: string;
  scoringDirection: ScoringDirection;
  fields: NewGameTemplateField[];
  /** Whether the live entry form repeats each round, accumulating into a running total, rather
   *  than being filled in once. */
  rounds?: boolean;
  /** Informational expected round count (e.g. Arschmallows' 6) — shown as progress, not enforced.
   *  Omitted for an open-ended rounds template like Dalmuti, which has no fixed count. */
  roundCount?: number;
}

/**
 * Starter templates offered on the create-game screen. A preset only prefills the form: what gets
 * saved is an ordinary per-group template, so a group can rename or reshape it afterwards without
 * the preset being involved again — except its cover art, which is remembered by storing the
 * preset's `id` as the new template's `cover_key`. A preset with no matching entry in
 * `GAME_COVERS` (see covers.ts) just renders without one; add art there when it becomes available.
 *
 * Catan's longest road and largest army are each worth two points and can only be held by one
 * player at a time. Both are `exclusive` fields: the live entry screen renders them as a toggle
 * per participant (not a stepper) and clears every other participant's toggle the moment one is
 * turned on, so the one-holder rule is enforced rather than left to the scorekeeper's judgment.
 * `default` is the point value awarded while held.
 */
export const GAME_TEMPLATE_PRESETS: GameTemplatePreset[] = [
  {
    // Scored per round on finish order alone, so it has no fields — an ordinary ranked template,
    // just played round by round rather than once. No fixed round count: a hand of Dalmuti runs
    // until the cards decide, not until some number is reached.
    id: 'dalmuti',
    name: 'De Grote Dalmuti',
    scoringDirection: 'ranked',
    fields: [],
    rounds: true,
  },
  {
    id: 'catan',
    name: 'Catan',
    scoringDirection: 'highest_total_wins',
    fields: [
      { key: 'nederzettingen', label: 'Nederzettingen', sign: 1 },
      { key: 'ontwikkelingskaarten', label: 'Punten uit ontwikkelingskaarten', sign: 1 },
      {
        key: 'langste_handelsroute',
        label: 'Langste handelsroute',
        sign: 1,
        exclusive: true,
        default: 2,
      },
      {
        key: 'grootste_riddermacht',
        label: 'Grootste riddermacht',
        sign: 1,
        exclusive: true,
        default: 2,
      },
    ],
  },
];
