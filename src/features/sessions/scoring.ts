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

/** A total per participant plus which of them won — ties all win, since nothing breaks them. */
export function computeTotals(
  participantIds: string[],
  fields: Pick<GameTemplateField, 'key' | 'sign'>[],
  bonusRules: BonusRule[],
  scoresByUser: Record<string, Record<string, number>>,
  scoringDirection: ScoringDirection,
): PlayerTotal[] {
  const totals = participantIds.map((userId) => ({
    userId,
    total: computeTotal(fields, bonusRules, scoresByUser[userId] ?? {}),
  }));

  if (totals.length === 0) return [];

  const best =
    scoringDirection === 'highest_total_wins'
      ? Math.max(...totals.map((entry) => entry.total))
      : Math.min(...totals.map((entry) => entry.total));

  return totals.map((entry) => ({ ...entry, isWinner: entry.total === best }));
}
