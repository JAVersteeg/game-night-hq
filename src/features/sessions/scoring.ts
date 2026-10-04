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

export interface ScoreBreakdownLine {
  label: string;
  value: number;
}

/** The synthetic `session_scores.field_key` a ranked template's finish order is stored under —
 *  ranked templates have no real fields, so there's nothing else to key it by. Value is the
 *  finish position, 1 = first place. Only used when the template isn't also `rounds`; a
 *  ranked-and-rounds template (Dalmuti) accumulates under `POINTS_FIELD_KEY` instead. */
export const RANK_FIELD_KEY = 'rank';

/** The synthetic `session_scores.field_key` a ranked-and-rounds session's running point total is
 *  kept under. Like `rank` it isn't a template field: ranked templates have none. Only the total is
 *  stored, never the per-round breakdown — see the generic_rounds migration. */
export const POINTS_FIELD_KEY = 'points';

/** What one player scores for finishing `rank`th (1 = first) out of `participants` in one round of
 *  a ranked-and-rounds template: last place scores 0 and every place above it is worth one point
 *  more. */
export function roundRankPoints(rank: number, participants: number): number {
  return participants - rank;
}

/** Whether a bigger number is the better one for this direction. `ranked` without rounds stores a
 *  finish position (1 = best), so it reads like `lowest_total_wins`; `ranked` with rounds
 *  accumulates points instead and reads like `highest_total_wins`. A `team_win` "total" is 1 for
 *  the winning team and 0 for everyone else. */
export function higherTotalIsBetter(direction: ScoringDirection, rounds: boolean): boolean {
  return (
    direction === 'highest_total_wins' ||
    direction === 'team_win' ||
    (direction === 'ranked' && rounds)
  );
}

/** Who played in which team (numbered from 1) in a team game's session, plus the team recorded as
 *  the winner: the result itself for `team_win`, a tie-break for a single-winner game on points. */
export interface SessionTeams {
  teamByUser: Record<string, number>;
  winningTeam: number | null;
}

/** The `SessionTeams` for one session's rows, or null for a session of a non-team game (whose
 *  participants have no team). */
export function sessionTeamsOf(
  participants: { user_id: string; team: number | null }[],
  winningTeam: number | null,
): SessionTeams | null {
  if (!participants.some((participant) => participant.team !== null)) return null;
  return {
    teamByUser: Object.fromEntries(
      participants.map((participant) => [participant.user_id, participant.team ?? 0]),
    ),
    winningTeam,
  };
}

/** Each team's members in participant order, teams in number order. */
export function groupByTeam(
  participantIds: string[],
  teamByUser: Record<string, number>,
): { team: number; userIds: string[] }[] {
  const byTeam = new Map<number, string[]>();
  for (const userId of participantIds) {
    const team = teamByUser[userId] ?? 0;
    byTeam.set(team, [...(byTeam.get(team) ?? []), userId]);
  }
  return Array.from(byTeam.entries())
    .sort(([a], [b]) => a - b)
    .map(([team, userIds]) => ({ team, userIds }));
}

/** A team's name: the one typed when the potje started, or else its players' names written out
 *  the way you'd say them — "Anna & Piet", "Jochem, Anna & Piet". */
export function teamLabel(
  team: number,
  teamNames: (string | null)[] | null | undefined,
  memberNames: string[],
): string {
  const typed = teamNames?.[team - 1]?.trim();
  if (typed) return typed;
  if (memberNames.length === 0) return `Team ${team}`;
  if (memberNames.length === 1) return memberNames[0];
  return `${memberNames.slice(0, -1).join(', ')} & ${memberNames[memberNames.length - 1]}`;
}

/** Whether `a` and `b` played on the same team — a pair that never played against each other, so
 *  stats comparing players skip it. Always false outside a team game. */
export function areTeammates(
  teams: SessionTeams | null | undefined,
  a: string,
  b: string,
): boolean {
  return Boolean(teams) && teams!.teamByUser[a] === teams!.teamByUser[b];
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

/** How much of a win `own` gets over `other` in one session: 1 for a win, 0.5 for a tie, 0 for a
 *  loss. Equal totals are normally a tie, except when exactly one of the two is flagged the winner
 *  — a single-winner game where the scorekeeper broke the tie — in which case that pick decides it,
 *  so "Overwicht" can't contradict who actually won. */
export function beatCredit(
  own: { total: number; isWinner: boolean },
  other: { total: number; isWinner: boolean },
  higherWins: boolean,
): number {
  if (own.total === other.total) {
    if (own.isWinner === other.isWinner) return 0.5;
    return own.isWinner ? 1 : 0;
  }
  return (higherWins ? own.total > other.total : own.total < other.total) ? 1 : 0;
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

/** Per-field composition of a player's total, in field order, plus one trailing line for any
 *  triggered bonus rules combined (a single line rather than one per rule, since bonus rules have
 *  no label of their own to show — just the condition they were defined with). Lines sum to
 *  exactly `computeTotal`'s result. Only meaningful for a fielded direction; a ranked template has
 *  no fields, so this always returns an empty array for it. */
export function computeBreakdown(
  fields: Pick<GameTemplateField, 'key' | 'label' | 'sign'>[],
  bonusRules: BonusRule[],
  values: Record<string, number>,
): ScoreBreakdownLine[] {
  const fieldLines = fields.map((field) => ({
    label: field.label,
    value: field.sign * (values[field.key] ?? 0),
  }));
  const bonusTotal = bonusRules.reduce(
    (sum, rule) => sum + bonusDelta(rule, values[rule.field_key] ?? 0),
    0,
  );
  return bonusTotal !== 0
    ? [...fieldLines, { label: 'Bonuspunten', value: bonusTotal }]
    : fieldLines;
}

/** The "total" of a fieldless direction, read straight out of its synthetic score key, or null for
 *  a direction whose total is a signed sum of real fields — which now includes a `rounds` template
 *  with real fields (highest/lowest_total_wins), since each round only adds onto those same field
 *  values rather than replacing them. A ranked participant nobody ordered counts as last; a
 *  ranked-and-rounds participant who hasn't banked a point yet counts as zero. */
function synthesizedTotal(
  direction: ScoringDirection,
  rounds: boolean,
  values: Record<string, number>,
  participants: number,
): number | null {
  if (direction !== 'ranked') return null;
  return rounds ? (values[POINTS_FIELD_KEY] ?? 0) : (values[RANK_FIELD_KEY] ?? participants);
}

/** A total per participant plus which of them won — ties all win, unless the scorekeeper broke
 *  the tie by picking `winnerId` (a single-winner game, see `game_templates.single_winner`). The
 *  pick is only honoured while that player is still among the best scorers, so a score corrected
 *  after the pick can't leave a stale winner standing. Ranked templates have no fields to sum: "total" is the finish position instead (1 = best),
 *  which is also why the "lowest wins" branch below doubles as "lowest rank wins" for them.
 *  Ranked-and-rounds templates have no fields either, but their "total" is the points banked so
 *  far, which the server accumulated round by round — here it's only read back.
 *
 *  In a team game every member carries the team's score (it's written to all of them), so the
 *  whole best team wins together; `teams.winningTeam` breaks a tie the same way `winnerId` does.
 *  A `team_win` game has no score at all: the winning team's members total 1, everyone else 0, and
 *  nobody has won until a team is picked. */
export function computeTotals(
  participantIds: string[],
  fields: Pick<GameTemplateField, 'key' | 'sign'>[],
  bonusRules: BonusRule[],
  scoresByUser: Record<string, Record<string, number>>,
  scoringDirection: ScoringDirection,
  rounds: boolean,
  winnerId: string | null = null,
  teams: SessionTeams | null = null,
): PlayerTotal[] {
  const winningTeam = teams?.winningTeam ?? null;
  const isOnWinningTeam = (userId: string) =>
    winningTeam !== null && teams?.teamByUser[userId] === winningTeam;

  if (scoringDirection === 'team_win') {
    return participantIds.map((userId) => ({
      userId,
      total: isOnWinningTeam(userId) ? 1 : 0,
      isWinner: isOnWinningTeam(userId),
    }));
  }

  const totals = participantIds.map((userId) => ({
    userId,
    total:
      synthesizedTotal(
        scoringDirection,
        rounds,
        scoresByUser[userId] ?? {},
        participantIds.length,
      ) ?? computeTotal(fields, bonusRules, scoresByUser[userId] ?? {}),
  }));

  if (totals.length === 0) return [];

  const best = higherTotalIsBetter(scoringDirection, rounds)
    ? Math.max(...totals.map((entry) => entry.total))
    : Math.min(...totals.map((entry) => entry.total));

  const isPickedWinnerBest = totals.some(
    (entry) => entry.userId === winnerId && entry.total === best,
  );
  const isPickedTeamBest = totals.some(
    (entry) => isOnWinningTeam(entry.userId) && entry.total === best,
  );

  return totals.map((entry) => ({
    ...entry,
    isWinner: isPickedTeamBest
      ? isOnWinningTeam(entry.userId)
      : isPickedWinnerBest
        ? entry.userId === winnerId
        : entry.total === best,
  }));
}
