import { useQuery } from '@tanstack/react-query';

import type { BonusRule, ScoringDirection } from '@/features/games/hooks/useGameTemplates';
import { computeTotals } from '@/features/sessions/scoring';
import { supabase } from '@/lib/supabase';

export interface SessionHistoryEntry {
  id: string;
  playedAt: string;
  gameName: string;
  coverKey: string | null;
  /** All of them, in case of a tie — nothing breaks ties, same as the session's own result screen.
   *  Ids only: `session_participants.user_id` has no foreign key to `profiles` (unlike
   *  `group_members`), so display names have to be resolved by the caller against the group's
   *  member list rather than embedded here. */
  winnerIds: string[];
}

export const sessionHistoryKeys = {
  list: (groupId: string) => ['sessions', 'history', groupId] as const,
};

interface SessionRow {
  id: string;
  played_at: string;
  game_templates: {
    name: string;
    cover_key: string | null;
    scoring_direction: ScoringDirection;
    game_template_fields: { key: string; sign: number }[];
    bonus_rules: BonusRule[];
  };
  session_participants: { user_id: string }[];
}

/**
 * Finished sessions only, most recent first, each with its winner(s) computed the same way the
 * session's own locked results screen does. Two queries rather than one deep embed:
 * session_scores has no direct foreign key to sessions (only the composite one to
 * session_participants), so PostgREST can't embed it — it's fetched separately for every session
 * id and grouped client-side, the same shape `useSessionScores` already produces for a single
 * session.
 */
export function useSessionHistory(groupId: string) {
  return useQuery({
    queryKey: sessionHistoryKeys.list(groupId),
    queryFn: async (): Promise<SessionHistoryEntry[]> => {
      const { data: sessions, error: sessionsError } = await supabase
        .from('sessions')
        .select(
          `id, played_at,
           game_templates(name, cover_key, scoring_direction, game_template_fields(key, sign), bonus_rules(*)),
           session_participants(user_id)`,
        )
        .eq('group_id', groupId)
        .eq('status', 'completed')
        .order('played_at', { ascending: false })
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

      return sessions.map((session) => {
        const totals = computeTotals(
          session.session_participants.map((participant) => participant.user_id),
          session.game_templates.game_template_fields,
          session.game_templates.bonus_rules,
          scoresBySession.get(session.id) ?? {},
          session.game_templates.scoring_direction,
        );

        return {
          id: session.id,
          playedAt: session.played_at,
          gameName: session.game_templates.name,
          coverKey: session.game_templates.cover_key,
          winnerIds: totals.filter((total) => total.isWinner).map((total) => total.userId),
        };
      });
    },
  });
}
