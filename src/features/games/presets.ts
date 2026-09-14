import type {
  NewGameTemplateField,
  ScoringDirection,
} from '@/features/games/hooks/useGameTemplates';

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
