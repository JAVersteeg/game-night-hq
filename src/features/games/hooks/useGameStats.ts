import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';

import type {
  GameTemplateWithBonusRules,
  ScoringDirection,
} from '@/features/games/hooks/useGameTemplates';
import { gameKeys } from '@/features/games/hooks/useGameTemplates';
import { computeTotals } from '@/features/sessions/scoring';
import { supabase } from '@/lib/supabase';

export interface LeaderboardEntry {
  userId: string;
  gamesPlayed: number;
  wins: number;
  /** 0-100, rounded. */
  winPct: number;
  avgTotal: number;
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

export interface HeadToHeadRecord {
  wins: number;
  losses: number;
  draws: number;
}

export interface GameStats {
  leaderboard: LeaderboardEntry[];
  trend: GameTrend;
  /** `headToHead[a][b]` is a's record against b, over the sessions they both played. */
  headToHead: Record<string, Record<string, HeadToHeadRecord>>;
  /** Biggest participant count in any session of this game — the ranked trend axis runs 1..this. */
  maxParticipants: number;
}

export const gameStatsKeys = {
  detail: (templateId: string) => [...gameKeys.detail(templateId), 'stats'] as const,
};

/** Beyond this the lines stop being readable at phone width, and the leaderboard already covers
 *  the whole history. */
const TREND_SESSIONS = 8;
/** The design system's ceiling on lines in one trend chart. */
const TREND_SERIES = 6;

interface SessionRow {
  id: string;
  played_at: string;
  session_participants: { user_id: string }[];
}

interface SessionTotals {
  playedAt: string;
  totals: { userId: string; total: number; isWinner: boolean }[];
}

const EMPTY_STATS: GameStats = {
  leaderboard: [],
  trend: { labels: [], series: [] },
  headToHead: {},
  maxParticipants: 0,
};

/**
 * Everything the stats tab shows for one game template — leaderboard, score trend and the
 * head-to-head matrix — from a single pair of queries, since all three are derived from the same
 * per-session totals. Same two-query shape as `useSessionHistory` (session_scores has no direct FK
 * to sessions, only the composite one to session_participants, so it can't be embedded and is
 * fetched separately for the batch of session ids), scoped to one template and without the
 * game_templates embed, since the caller already has the template loaded.
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

  return useQuery({
    queryKey: gameStatsKeys.detail(templateId),
    enabled: Boolean(template),
    queryFn: async (): Promise<GameStats> => {
      const { data: sessions, error: sessionsError } = await supabase
        .from('sessions')
        .select('id, played_at, session_participants(user_id)')
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

      const totalsBySession: SessionTotals[] = sessions.map((session) => ({
        playedAt: session.played_at,
        totals: computeTotals(
          session.session_participants.map((participant) => participant.user_id),
          fields,
          bonusRules,
          scoresBySession.get(session.id) ?? {},
          scoringDirection,
        ),
      }));

      return {
        leaderboard: buildLeaderboard(totalsBySession),
        trend: buildTrend(totalsBySession),
        headToHead: buildHeadToHead(totalsBySession, scoringDirection),
        maxParticipants: Math.max(...totalsBySession.map((session) => session.totals.length)),
      };
    },
  });
}

function buildLeaderboard(sessions: SessionTotals[]): LeaderboardEntry[] {
  const byUser = new Map<string, { gamesPlayed: number; wins: number; totalSum: number }>();

  for (const session of sessions) {
    for (const entry of session.totals) {
      const current = byUser.get(entry.userId) ?? { gamesPlayed: 0, wins: 0, totalSum: 0 };
      current.gamesPlayed += 1;
      current.wins += entry.isWinner ? 1 : 0;
      current.totalSum += entry.total;
      byUser.set(entry.userId, current);
    }
  }

  return Array.from(byUser.entries())
    .map(([userId, stats]) => ({
      userId,
      gamesPlayed: stats.gamesPlayed,
      wins: stats.wins,
      winPct: Math.round((stats.wins / stats.gamesPlayed) * 100),
      avgTotal: Math.round((stats.totalSum / stats.gamesPlayed) * 10) / 10,
    }))
    .sort((a, b) => b.winPct - a.winPct || b.gamesPlayed - a.gamesPlayed);
}

/** The last few sessions, with a line per player who shows up most often in them — a regular who
 *  missed one keeps their line (with a gap in it), a one-off guest doesn't get one at all. */
function buildTrend(sessions: SessionTotals[]): GameTrend {
  const window = sessions.slice(-TREND_SESSIONS);

  const appearances = new Map<string, number>();
  for (const session of window) {
    for (const entry of session.totals) {
      appearances.set(entry.userId, (appearances.get(entry.userId) ?? 0) + 1);
    }
  }

  const userIds = Array.from(appearances.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, TREND_SERIES)
    .map(([userId]) => userId);

  return {
    labels: window.map((session) => format(new Date(session.playedAt), 'd MMM', { locale: nl })),
    series: userIds.map((userId) => ({
      userId,
      points: window.map(
        (session) => session.totals.find((entry) => entry.userId === userId)?.total ?? null,
      ),
    })),
  };
}

function buildHeadToHead(
  sessions: SessionTotals[],
  scoringDirection: ScoringDirection,
): Record<string, Record<string, HeadToHeadRecord>> {
  const matrix: Record<string, Record<string, HeadToHeadRecord>> = {};

  const recordFor = (a: string, b: string): HeadToHeadRecord => {
    matrix[a] ??= {};
    matrix[a][b] ??= { wins: 0, losses: 0, draws: 0 };
    return matrix[a][b];
  };

  for (const session of sessions) {
    for (const left of session.totals) {
      for (const right of session.totals) {
        if (left.userId === right.userId) continue;

        const entry = recordFor(left.userId, right.userId);
        if (left.total === right.total) {
          entry.draws += 1;
          continue;
        }

        // 'ranked' stores finish position, so lower is better there too — the same branch as
        // lowest_total_wins, exactly the way `computeTotals` treats it.
        const leftIsBetter =
          scoringDirection === 'highest_total_wins'
            ? left.total > right.total
            : left.total < right.total;

        if (leftIsBetter) entry.wins += 1;
        else entry.losses += 1;
      }
    }
  }

  return matrix;
}
