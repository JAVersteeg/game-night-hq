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
];

export interface GameTemplatePreset {
  id: string;
  name: string;
  scoringDirection: ScoringDirection;
  fields: NewGameTemplateField[];
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
