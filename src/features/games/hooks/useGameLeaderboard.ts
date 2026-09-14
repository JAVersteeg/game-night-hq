import { useQuery } from '@tanstack/react-query';

import type {
  BonusRule,
  GameTemplateField,
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

export const gameLeaderboardKeys = {
  detail: (templateId: string) => [...gameKeys.detail(templateId), 'leaderboard'] as const,
};

interface SessionRow {
  id: string;
  session_participants: { user_id: string }[];
}

/**
 * Per-player wins / win % / average total for every session played on this template, across the
 * whole group. Same two-query shape as `useSessionHistory` (session_scores has no direct FK to
 * sessions, only the composite one to session_participants, so it can't be embedded and is fetched
 * separately per batch of session ids), but scoped to one template instead of the whole group and
 * without the game_templates embed, since the caller already has the template's fields, bonus
 * rules and scoring direction.
 */
export function useGameLeaderboard(
  templateId: string,
  fields: Pick<GameTemplateField, 'key' | 'sign'>[],
  bonusRules: BonusRule[],
  scoringDirection: ScoringDirection,
) {
  return useQuery({
    queryKey: gameLeaderboardKeys.detail(templateId),
    enabled: templateId.length > 0,
    queryFn: async (): Promise<LeaderboardEntry[]> => {
      const { data: sessions, error: sessionsError } = await supabase
        .from('sessions')
        .select('id, session_participants(user_id)')
        .eq('template_id', templateId)
        .eq('status', 'completed')
        .returns<SessionRow[]>();

      if (sessionsError) throw sessionsError;
      if (sessions.length === 0) return [];

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

      const byUser = new Map<string, { gamesPlayed: number; wins: number; totalSum: number }>();

      for (const session of sessions) {
        const totals = computeTotals(
          session.session_participants.map((participant) => participant.user_id),
          fields,
          bonusRules,
          scoresBySession.get(session.id) ?? {},
          scoringDirection,
        );

        for (const entry of totals) {
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
    },
  });
}
