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
 * the preset being involved again.
 *
 * Catan's longest road and largest army are each worth two points and can only be held by one
 * player at a time. Neither part fits the v1 model — a field contributes its raw value rather than
 * a per-unit score, and bonus rules are evaluated per player in isolation, so nothing can express
 * "at most one player may hold this". Both are therefore plain 0-or-2 fields whose label carries
 * the points, and the scorekeeper is trusted not to award them to two people.
 */
export const GAME_TEMPLATE_PRESETS: GameTemplatePreset[] = [
  {
    id: 'catan',
    name: 'Catan',
    scoringDirection: 'highest_total_wins',
    fields: [
      { key: 'nederzettingen', label: 'Nederzettingen', sign: 1 },
      { key: 'ontwikkelingskaarten', label: 'Punten uit ontwikkelingskaarten', sign: 1 },
      { key: 'langste_handelsroute', label: 'Langste handelsroute (2 punten)', sign: 1 },
      { key: 'grootste_riddermacht', label: 'Grootste riddermacht (2 punten)', sign: 1 },
    ],
  },
];
