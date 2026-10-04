import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';

import type {
  GameTemplateWithBonusRules,
  ScoringDirection,
} from '@/features/games/hooks/useGameTemplates';
import { gameKeys } from '@/features/games/hooks/useGameTemplates';
import {
  areTeammates,
  beatCredit,
  computeTotals,
  higherTotalIsBetter,
  sessionTeamsOf,
  type SessionTeams,
} from '@/features/sessions/scoring';
import { supabase } from '@/lib/supabase';

export interface LeaderboardEntry {
  userId: string;
  gamesPlayed: number;
  wins: number;
  avgTotal: number;
  /**
   * "Overwicht": the share of the table this player beats in an average session, 0-100. Normalised
   * per session before averaging, so beating two of three counts the same as beating four of five
   * — the whole point of it next to a raw win count. 50 is exactly mid-table.
   */
  beatShare: number;
  /**
   * "Winstfactor": wins divided by the wins pure chance would hand out at these table sizes
   * (Σ 1/participants). 1 is chance, 2 is twice as often as chance.
   */
  winFactor: number;
  /**
   * "Puntensaldo": average points above or below the table average, one decimal. Meaningless for
   * ranked templates, where the "total" is a finish position — the screen hides it there.
   */
  pointDiff: number;
}

export interface TrendSeriesData {
  userId: string;
  /** One per label; `null` where that player sat the session out. */
  points: (number | null)[];
}

export interface GameTrend {
  /** Session dates, oldest first — short form, since the axis has no room for more. */
  labels: string[];
  series: TrendSeriesData[];
}

export interface GameStats {
  leaderboard: LeaderboardEntry[];
  trend: GameTrend;
  /** Biggest participant count in any session of this game — the ranked trend axis runs 1..this. */
  maxParticipants: number;
}

export const gameStatsKeys = {
  detail: (templateId: string) => [...gameKeys.detail(templateId), 'stats'] as const,
};

/** Beyond this the lines stop being readable at phone width, and the leaderboard already covers
 *  the whole history. */
const TREND_SESSIONS = 8;

interface SessionRow {
  id: string;
  played_at: string;
  rounds_played: number;
  winner_id: string | null;
  winning_team: number | null;
  session_participants: { user_id: string; team: number | null }[];
}

interface SessionTotals {
  playedAt: string;
  totals: { userId: string; total: number; isWinner: boolean }[];
  /** Set for a team game's session — teammates never played against each other. */
  teams: SessionTeams | null;
}

const EMPTY_STATS: GameStats = {
  leaderboard: [],
  trend: { labels: [], series: [] },
  maxParticipants: 0,
};

/**
 * Everything the stats tab shows for one game template — leaderboard and score trend — from a
 * single pair of queries, since both are derived from the same per-session totals. Same two-query
 * shape as `useSessionHistory` (session_scores has no direct FK to sessions, only the composite one
 * to session_participants, so it can't be embedded and is fetched separately for the batch of
 * session ids), scoped to one template and without the game_templates embed, since the caller
 * already has the template loaded.
 *
 * Takes the whole template rather than its parts so the query can't run before they arrive: the
 * fields and bonus rules are what the totals are computed from, they aren't in the query key, and
 * a run against an empty field list would cache a table of zeroes that nothing would invalidate.
 */
export function useGameStats(template: GameTemplateWithBonusRules | null | undefined) {
  const templateId = template?.id ?? '';
  const fields = template?.game_template_fields ?? [];
  const bonusRules = template?.bonus_rules ?? [];
  const scoringDirection = template?.scoring_direction ?? 'highest_total_wins';
  const rounds = template?.rounds ?? false;

  return useQuery({
    queryKey: gameStatsKeys.detail(templateId),
    enabled: Boolean(template),
    queryFn: async (): Promise<GameStats> => {
      const { data: sessions, error: sessionsError } = await supabase
        .from('sessions')
        .select(
          'id, played_at, rounds_played, winner_id, winning_team, session_participants(user_id, team)',
        )
        .eq('template_id', templateId)
        .eq('status', 'completed')
        .order('played_at', { ascending: true })
        .returns<SessionRow[]>();

      if (sessionsError) throw sessionsError;
      if (sessions.length === 0) return EMPTY_STATS;

      const { data: scores, error: scoresError } = await supabase
        .from('session_scores')
        .select('session_id, user_id, field_key, value')
        .in(
          'session_id',
          sessions.map((session) => session.id),
        );

      if (scoresError) throw scoresError;

      const scoresBySession = new Map<string, Record<string, Record<string, number>>>();
      for (const row of scores) {
        const scoresByUser = scoresBySession.get(row.session_id) ?? {};
        scoresByUser[row.user_id] ??= {};
        scoresByUser[row.user_id][row.field_key] = row.value;
        scoresBySession.set(row.session_id, scoresByUser);
      }

      // A rounds game's session total grows with however many rounds were played, so a long evening
      // and a short one aren't comparable as raw numbers — every total is divided by its round count
      // and the whole stats surface works in points per round instead. Dividing by a positive
      // constant can't reorder a session, so the winner flags `computeTotals` set still hold.
      const totalsBySession: SessionTotals[] = sessions.map((session) => {
        const teams = sessionTeamsOf(session.session_participants, session.winning_team);
        const totals = computeTotals(
          session.session_participants.map((participant) => participant.user_id),
          fields,
          bonusRules,
          scoresBySession.get(session.id) ?? {},
          scoringDirection,
          rounds,
          session.winner_id,
          teams,
        );
        const divisor = rounds ? Math.max(1, session.rounds_played) : 1;

        return {
          playedAt: session.played_at,
          teams,
          totals:
            divisor === 1
              ? totals
              : totals.map((entry) => ({ ...entry, total: entry.total / divisor })),
        };
      });

      // The leaderboard stays points-based for a ranked-and-rounds template (Dalmuti) — a saldo
      // against the table average still means something there — but the trend line is meant to
      // read like the plain-ranked case: who finished where in each game, not how many points that
      // was worth. So the trend gets its own totals, converted from points to finish rank.
      const trendTotalsBySession: SessionTotals[] =
        scoringDirection === 'ranked' && rounds
          ? totalsBySession.map((session) => ({
              ...session,
              totals: toFinishRanks(session.totals),
            }))
          : totalsBySession;

      return {
        leaderboard: buildLeaderboard(totalsBySession, scoringDirection, rounds),
        trend: buildTrend(trendTotalsBySession),
        maxParticipants: Math.max(...totalsBySession.map((session) => session.totals.length)),
      };
    },
  });
}

/** Converts one session's point totals (higher is better) into finish rank (1 = best), the way a
 *  plain ranked template already stores its result. Ties share a rank, competition-style — two
 *  players tied for first are both rank 1 and the next player is rank 3, not 2. */
function toFinishRanks(
  totals: { userId: string; total: number; isWinner: boolean }[],
): { userId: string; total: number; isWinner: boolean }[] {
  return totals.map((entry) => ({
    ...entry,
    total: 1 + totals.filter((other) => other.total > entry.total).length,
  }));
}

interface LeaderboardTally {
  gamesPlayed: number;
  wins: number;
  totalSum: number;
  /** Σ of "share of the table beaten", one term per session with more than one player. */
  shareSum: number;
  shareCount: number;
  /** Σ 1/participants — the wins an average player would pick up at these table sizes. */
  expectedWins: number;
  /** Σ of (own total − table average). */
  diffSum: number;
}

function buildLeaderboard(
  sessions: SessionTotals[],
  scoringDirection: ScoringDirection,
  rounds: boolean,
): LeaderboardEntry[] {
  const byUser = new Map<string, LeaderboardTally>();

  for (const session of sessions) {
    // What competes in this session: a team in a team game (each of whose players carries the
    // team's total), a player otherwise. Chance odds and the table average are per competitor, so
    // a team of three doesn't weigh three times as much as a team of one.
    const competitors = session.teams
      ? Array.from(
          new Map(
            session.totals.map((entry) => [session.teams!.teamByUser[entry.userId], entry]),
          ).values(),
        )
      : session.totals;
    const competitorCount = competitors.length;
    const average =
      competitors.reduce((sum, entry) => sum + entry.total, 0) / Math.max(1, competitorCount);

    for (const entry of session.totals) {
      const tally = byUser.get(entry.userId) ?? {
        gamesPlayed: 0,
        wins: 0,
        totalSum: 0,
        shareSum: 0,
        shareCount: 0,
        expectedWins: 0,
        diffSum: 0,
      };

      tally.gamesPlayed += 1;
      tally.wins += entry.isWinner ? 1 : 0;
      tally.totalSum += entry.total;
      tally.expectedWins += 1 / competitorCount;
      tally.diffSum += entry.total - average;

      // Teammates never played against each other, so only opponents count as "the table".
      const opponents = session.totals.filter(
        (other) =>
          other.userId !== entry.userId && !areTeammates(session.teams, entry.userId, other.userId),
      );

      // A one-player session has no table to beat, so it's left out of the average rather than
      // counted as a perfect score. It shouldn't exist, but nothing in the schema forbids it.
      if (opponents.length > 0) {
        const higherWins = higherTotalIsBetter(scoringDirection, rounds);
        const beaten = opponents.reduce(
          (count, other) => count + beatCredit(entry, other, higherWins),
          0,
        );

        tally.shareSum += beaten / opponents.length;
        tally.shareCount += 1;
      }

      byUser.set(entry.userId, tally);
    }
  }

  return Array.from(byUser.entries())
    .map(([userId, tally]) => ({
      userId,
      gamesPlayed: tally.gamesPlayed,
      wins: tally.wins,
      avgTotal: round1(tally.totalSum / tally.gamesPlayed),
      beatShare: tally.shareCount === 0 ? 0 : Math.round((tally.shareSum / tally.shareCount) * 100),
      winFactor: tally.expectedWins === 0 ? 0 : round1(tally.wins / tally.expectedWins),
      pointDiff: round1(tally.diffSum / tally.gamesPlayed),
    }))
    .sort((a, b) => b.beatShare - a.beatShare || b.gamesPlayed - a.gamesPlayed);
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/** The last few sessions, with a line per player who appears in any of them — a regular who missed
 *  one keeps their line (with a gap in it). No cap on how many lines show: a group tops out at a
 *  handful of members anyway, and everyone who actually played belongs on their own chart. Ordered
 *  by whoever shows up most often, ties broken by whoever played most recently, so the legend reads
 *  regulars-first. */
function buildTrend(sessions: SessionTotals[]): GameTrend {
  const window = sessions.slice(-TREND_SESSIONS);

  const appearances = new Map<string, number>();
  const lastSeenIndex = new Map<string, number>();
  window.forEach((session, index) => {
    for (const entry of session.totals) {
      appearances.set(entry.userId, (appearances.get(entry.userId) ?? 0) + 1);
      lastSeenIndex.set(entry.userId, index);
    }
  });

  const userIds = Array.from(appearances.keys()).sort((a, b) => {
    const byAppearances = appearances.get(b)! - appearances.get(a)!;
    if (byAppearances !== 0) return byAppearances;
    return lastSeenIndex.get(b)! - lastSeenIndex.get(a)!;
  });

  return {
    labels: window.map((session) => format(new Date(session.playedAt), 'd-M')),
    series: userIds.map((userId) => ({
      userId,
      points: window.map(
        (session) => session.totals.find((entry) => entry.userId === userId)?.total ?? null,
      ),
    })),
  };
}
