import type {
  BonusRule,
  GameTemplateField,
  ScoringDirection,
} from '@/features/games/hooks/useGameTemplates';

export interface PlayerTotal {
  userId: string;
  total: number;
  isWinner: boolean;
}

/** The synthetic `session_scores.field_key` a ranked template's finish order is stored under —
 *  ranked templates have no real fields, so there's nothing else to key it by. Value is the
 *  finish position, 1 = first place. */
export const RANK_FIELD_KEY = 'rank';

/** The synthetic `session_scores.field_key` a `dalmuti_rounds` session's running point total is
 *  kept under. Like `rank` it isn't a template field: rounds templates have none. Only the total is
 *  stored, never the per-round breakdown — see the dalmuti_rounds migration. */
export const POINTS_FIELD_KEY = 'points';

/** What one player scores for finishing `rank`th (1 = first) out of `participants` in a Dalmuti
 *  round: last place scores 0 and every place above it is worth one point more. */
export function dalmutiRoundPoints(rank: number, participants: number): number {
  return participants - rank;
}

/** Whether a bigger number is the better one for this direction. `ranked` stores a finish position
 *  (1 = best), so it reads like `lowest_total_wins`; `dalmuti_rounds` stores accumulated points and
 *  reads like `highest_total_wins`. */
export function higherTotalIsBetter(direction: ScoringDirection): boolean {
  return direction === 'highest_total_wins' || direction === 'dalmuti_rounds';
}

function bonusDelta(rule: BonusRule, fieldValue: number): number {
  switch (rule.operator) {
    case '==':
      return fieldValue === rule.value ? rule.points_delta : 0;
    case '>':
      return fieldValue > rule.value ? rule.points_delta : 0;
    case '<':
      return fieldValue < rule.value ? rule.points_delta : 0;
    case '>=':
      return fieldValue >= rule.value ? rule.points_delta : 0;
    case '<=':
      return fieldValue <= rule.value ? rule.points_delta : 0;
  }
}

/** Signed sum of a player's fields, plus any bonus rule deltas their field values trigger. */
export function computeTotal(
  fields: Pick<GameTemplateField, 'key' | 'sign'>[],
  bonusRules: BonusRule[],
  values: Record<string, number>,
): number {
  const fieldTotal = fields.reduce((sum, field) => sum + field.sign * (values[field.key] ?? 0), 0);
  const bonusTotal = bonusRules.reduce(
    (sum, rule) => sum + bonusDelta(rule, values[rule.field_key] ?? 0),
    0,
  );
  return fieldTotal + bonusTotal;
}

/** The "total" of a fieldless direction, read straight out of its synthetic score key, or null for
 *  the directions whose total is a signed sum of real fields. A ranked participant nobody ordered
 *  counts as last; a rounds participant who hasn't banked a point yet counts as zero. */
function synthesizedTotal(
  direction: ScoringDirection,
  values: Record<string, number>,
  participants: number,
): number | null {
  switch (direction) {
    case 'ranked':
      return values[RANK_FIELD_KEY] ?? participants;
    case 'dalmuti_rounds':
      return values[POINTS_FIELD_KEY] ?? 0;
    default:
      return null;
  }
}

/** A total per participant plus which of them won — ties all win, since nothing breaks them.
 *  Ranked templates have no fields to sum: "total" is the finish position instead (1 = best),
 *  which is also why the "lowest wins" branch below doubles as "lowest rank wins" for them.
 *  Rounds templates have no fields either, but their "total" is the points banked so far, which
 *  the server accumulated round by round — here it's only read back. */
export function computeTotals(
  participantIds: string[],
  fields: Pick<GameTemplateField, 'key' | 'sign'>[],
  bonusRules: BonusRule[],
  scoresByUser: Record<string, Record<string, number>>,
  scoringDirection: ScoringDirection,
): PlayerTotal[] {
  const totals = participantIds.map((userId) => ({
    userId,
    total: synthesizedTotal(scoringDirection, scoresByUser[userId] ?? {}, participantIds.length) ??
      computeTotal(fields, bonusRules, scoresByUser[userId] ?? {}),
  }));

  if (totals.length === 0) return [];

  const best = higherTotalIsBetter(scoringDirection)
    ? Math.max(...totals.map((entry) => entry.total))
    : Math.min(...totals.map((entry) => entry.total));

  return totals.map((entry) => ({ ...entry, isWinner: entry.total === best }));
}
