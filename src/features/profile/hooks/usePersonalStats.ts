import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';

import { useAuth } from '@/features/auth/context/AuthContext';
import type { BonusRule, ScoringDirection } from '@/features/games/hooks/useGameTemplates';
import { computeTotals } from '@/features/sessions/scoring';
import { supabase } from '@/lib/supabase';

export interface PersonalGameRecord {
  templateId: string;
  name: string;
  coverKey: string | null;
  gamesPlayed: number;
  wins: number;
  /** 0-100, rounded. */
  winPct: number;
}

export interface PersonalStats {
  sessionsPlayed: number;
  wins: number;
  /** 0-100, rounded. */
  winPct: number;
  /** Win percentage after each session, oldest first — the running average, not a per-session
   *  spike, so a single night doesn't swing the line to 0 or 100. */
  form: { labels: string[]; points: number[] };
  /** Per game, only ones played often enough for a percentage to mean anything. */
  gameRecords: PersonalGameRecord[];
}

export const personalStatsKeys = {
  byUser: (userId: string) => ['profile', userId, 'stats'] as const,
};

/** A running win rate needs a few points before it stops looking like noise. */
const FORM_POINTS = 12;
/** Below this, a win percentage per game says more about the sample than the player. */
const MIN_GAMES_FOR_RECORD = 2;

interface SessionRow {
  id: string;
  played_at: string;
  template_id: string;
  game_templates: {
    name: string;
    cover_key: string | null;
    scoring_direction: ScoringDirection;
    game_template_fields: { key: string; sign: number }[];
    bonus_rules: BonusRule[];
  };
  session_participants: { user_id: string }[];
}

const EMPTY_STATS: PersonalStats = {
  sessionsPlayed: 0,
  wins: 0,
  winPct: 0,
  form: { labels: [], points: [] },
  gameRecords: [],
};

/**
 * The signed-in user's own record across every group they belong to — the profile counterpart to
 * the per-group stats on the group dashboard.
 *
 * Three queries rather than one: the sessions a user took part in are only reachable through
 * session_participants, and embedding that as an inner join to filter on `user_id` would also
 * narrow the embedded participant list to just them, leaving nothing to compute a winner against.
 * So the ids come first, then the sessions, then their scores — the same
 * "session_scores can't be embedded" split `useSessionHistory` makes.
 *
 * No scores are averaged here on purpose: totals only mean something within one game (10 points at
 * Wizard isn't 10 points at Catan), so everything cross-game is counted in wins.
 */
export function usePersonalStats() {
  const { session } = useAuth();
  const userId = session?.user.id;

  return useQuery({
    queryKey: personalStatsKeys.byUser(userId ?? 'anonymous'),
    enabled: Boolean(userId),
    queryFn: async (): Promise<PersonalStats> => {
      const { data: participations, error: participationsError } = await supabase
        .from('session_participants')
        .select('session_id')
        .eq('user_id', userId!);

      if (participationsError) throw participationsError;
      if (participations.length === 0) return EMPTY_STATS;

      const { data: sessions, error: sessionsError } = await supabase
        .from('sessions')
        .select(
          `id, played_at, template_id,
           game_templates(name, cover_key, scoring_direction, game_template_fields(key, sign), bonus_rules(*)),
           session_participants(user_id)`,
        )
        .in(
          'id',
          participations.map((participation) => participation.session_id),
        )
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
          sessions.map((entry) => entry.id),
        );

      if (scoresError) throw scoresError;

      const scoresBySession = new Map<string, Record<string, Record<string, number>>>();
      for (const row of scores) {
        const scoresByUser = scoresBySession.get(row.session_id) ?? {};
        scoresByUser[row.user_id] ??= {};
        scoresByUser[row.user_id][row.field_key] = row.value;
        scoresBySession.set(row.session_id, scoresByUser);
      }

      const byGame = new Map<
        string,
        { name: string; coverKey: string | null; gamesPlayed: number; wins: number }
      >();
      const formLabels: string[] = [];
      const formPoints: number[] = [];
      let wins = 0;

      sessions.forEach((entry, index) => {
        const totals = computeTotals(
          entry.session_participants.map((participant) => participant.user_id),
          entry.game_templates.game_template_fields,
          entry.game_templates.bonus_rules,
          scoresBySession.get(entry.id) ?? {},
          entry.game_templates.scoring_direction,
        );

        const isWinner = totals.some((total) => total.userId === userId && total.isWinner);
        if (isWinner) wins += 1;

        const game = byGame.get(entry.template_id) ?? {
          name: entry.game_templates.name,
          coverKey: entry.game_templates.cover_key,
          gamesPlayed: 0,
          wins: 0,
        };
        game.gamesPlayed += 1;
        game.wins += isWinner ? 1 : 0;
        byGame.set(entry.template_id, game);

        formLabels.push(format(new Date(entry.played_at), 'd MMM', { locale: nl }));
        formPoints.push(Math.round((wins / (index + 1)) * 100));
      });

      const gameRecords = Array.from(byGame.entries())
        .map(([templateId, game]) => ({
          templateId,
          name: game.name,
          coverKey: game.coverKey,
          gamesPlayed: game.gamesPlayed,
          wins: game.wins,
          winPct: Math.round((game.wins / game.gamesPlayed) * 100),
        }))
        .filter((game) => game.gamesPlayed >= MIN_GAMES_FOR_RECORD)
        .sort((a, b) => b.winPct - a.winPct || b.gamesPlayed - a.gamesPlayed);

      return {
        sessionsPlayed: sessions.length,
        wins,
        winPct: Math.round((wins / sessions.length) * 100),
        // The running average is computed over the full history, then only its tail is plotted —
        // the last twelve points of a career, not a fresh twelve-session career.
        form: {
          labels: formLabels.slice(-FORM_POINTS),
          points: formPoints.slice(-FORM_POINTS),
        },
        gameRecords,
      };
    },
  });
}
