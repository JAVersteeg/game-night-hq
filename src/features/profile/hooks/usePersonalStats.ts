import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';

import { useAuth } from '@/features/auth/context/AuthContext';
import type { BonusRule, ScoringDirection } from '@/features/games/hooks/useGameTemplates';
import {
  areTeammates,
  beatCredit,
  computeTotals,
  higherTotalIsBetter,
  sessionTeamsOf,
} from '@/features/sessions/scoring';
import { supabase } from '@/lib/supabase';

export interface PersonalGameRecord {
  templateId: string;
  name: string;
  coverKey: string | null;
  gamesPlayed: number;
  wins: number;
  /** "Winstfactor", one decimal — see `PersonalStats.winFactor`. */
  winFactor: number;
  /** "Overwicht": the share of the table beaten in an average potje, 0-100. 50 is mid-table. */
  beatShare: number;
  /** Too few potjes for the factor to mean much yet; the screen dims it rather than hiding it. */
  isWinFactorWeak: boolean;
}

export interface PersonalStats {
  sessionsPlayed: number;
  wins: number;
  /**
   * "Winstfactor": wins divided by the wins pure chance would hand out at these table sizes
   * (Σ 1/participants), one decimal. 1 is chance, 2 is twice as often as chance. The same metric
   * the group dashboard ranks on, here across every group at once — a percentage would flatter
   * whoever plays at the smallest tables.
   */
  winFactor: number;
  /** Too few potjes for the factor to mean much yet. */
  isWinFactorWeak: boolean;
  /** Winstfactor after each session, oldest first — the running figure, not a per-session spike,
   *  so a single night doesn't swing the line. `beatShares` is the running Overwicht (0-100) at
   *  the same sessions, `null` until a potje with more than one player has been played. */
  form: { labels: string[]; points: number[]; beatShares: (number | null)[] };
  /** Per game, only ones played often enough for a record to mean anything, strongest first. */
  gameRecords: PersonalGameRecord[];
}

export const personalStatsKeys = {
  byUser: (userId: string) => ['profile', userId, 'stats'] as const,
};

/** A running winstfactor needs a few points before it stops looking like noise. */
const FORM_POINTS = 12;
/** Below this, a per-game record says more about the sample than the player. */
const MIN_GAMES_FOR_RECORD = 2;
/** Below this, Winstfactor swings so hard on a single evening that it says more about the sample
 *  than the player — matches the group dashboard, which dims its rows at the same count. */
export const MIN_GAMES_FOR_WIN_FACTOR = 8;

interface SessionRow {
  id: string;
  played_at: string;
  template_id: string;
  winner_id: string | null;
  winning_team: number | null;
  game_templates: {
    name: string;
    cover_key: string | null;
    scoring_direction: ScoringDirection;
    rounds: boolean;
    game_template_fields: { key: string; sign: number }[];
    bonus_rules: BonusRule[];
  };
  session_participants: { user_id: string; team: number | null }[];
}

const EMPTY_STATS: PersonalStats = {
  sessionsPlayed: 0,
  wins: 0,
  winFactor: 0,
  isWinFactorWeak: true,
  form: { labels: [], points: [], beatShares: [] },
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
 * Wizard isn't 10 points at Catan), so everything cross-game is counted in wins — weighted by how
 * many people were at the table, which is what makes Winstfactor and Overwicht comparable across
 * games that seat three and games that seat six.
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
          `id, played_at, template_id, winner_id, winning_team,
           game_templates(name, cover_key, scoring_direction, rounds, game_template_fields(key, sign), bonus_rules(*)),
           session_participants(user_id, team)`,
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
        {
          name: string;
          coverKey: string | null;
          gamesPlayed: number;
          wins: number;
          /** Σ 1/participants — the wins an average player would pick up at these table sizes. */
          expectedWins: number;
          /** Σ of "share of the table beaten", one term per potje with more than one player. */
          shareSum: number;
          shareCount: number;
        }
      >();
      const formLabels: string[] = [];
      const formPoints: number[] = [];
      const formBeatShares: (number | null)[] = [];
      let wins = 0;
      let expectedWins = 0;
      let shareSum = 0;
      let shareCount = 0;

      for (const entry of sessions) {
        const teams = sessionTeamsOf(entry.session_participants, entry.winning_team);
        const totals = computeTotals(
          entry.session_participants.map((participant) => participant.user_id),
          entry.game_templates.game_template_fields,
          entry.game_templates.bonus_rules,
          scoresBySession.get(entry.id) ?? {},
          entry.game_templates.scoring_direction,
          entry.game_templates.rounds,
          entry.winner_id,
          teams,
        );

        // Nothing in the schema forbids a session without participants, and it would divide the
        // expected wins by zero — skip it rather than let one bad row poison every figure.
        if (totals.length === 0) continue;

        const own = totals.find((total) => total.userId === userId);
        const isWinner = own?.isWinner ?? false;
        if (isWinner) wins += 1;
        // Chance odds are per competitor: a team in a team game, a player otherwise.
        const competitorCount = teams
          ? new Set(Object.values(teams.teamByUser)).size
          : totals.length;
        expectedWins += 1 / competitorCount;

        const game = byGame.get(entry.template_id) ?? {
          name: entry.game_templates.name,
          coverKey: entry.game_templates.cover_key,
          gamesPlayed: 0,
          wins: 0,
          expectedWins: 0,
          shareSum: 0,
          shareCount: 0,
        };
        game.gamesPlayed += 1;
        game.wins += isWinner ? 1 : 0;
        game.expectedWins += 1 / competitorCount;

        // Teammates never played against each other, so only opponents count as "the table".
        const opponents = own
          ? totals.filter(
              (other) =>
                other.userId !== own.userId && !areTeammates(teams, own.userId, other.userId),
            )
          : [];

        // A one-player potje has no table to beat, so it's left out of the average rather than
        // counted as a perfect score — the same call `useGameStats` makes for a group's Overwicht.
        if (own && opponents.length > 0) {
          const higherWins = higherTotalIsBetter(
            entry.game_templates.scoring_direction,
            entry.game_templates.rounds,
          );
          const beaten = opponents.reduce(
            (count, other) => count + beatCredit(own, other, higherWins),
            0,
          );

          game.shareSum += beaten / opponents.length;
          game.shareCount += 1;
          shareSum += beaten / opponents.length;
          shareCount += 1;
        }

        byGame.set(entry.template_id, game);

        formLabels.push(format(new Date(entry.played_at), 'd MMM', { locale: nl }));
        formPoints.push(expectedWins === 0 ? 0 : round1(wins / expectedWins));
        formBeatShares.push(shareCount === 0 ? null : Math.round((shareSum / shareCount) * 100));
      }

      const gameRecords = Array.from(byGame.entries())
        .map(([templateId, game]) => ({
          templateId,
          name: game.name,
          coverKey: game.coverKey,
          gamesPlayed: game.gamesPlayed,
          wins: game.wins,
          winFactor: game.expectedWins === 0 ? 0 : round1(game.wins / game.expectedWins),
          beatShare:
            game.shareCount === 0 ? 0 : Math.round((game.shareSum / game.shareCount) * 100),
          isWinFactorWeak: game.gamesPlayed < MIN_GAMES_FOR_WIN_FACTOR,
        }))
        .filter((game) => game.gamesPlayed >= MIN_GAMES_FOR_RECORD)
        .sort((a, b) => b.winFactor - a.winFactor || b.gamesPlayed - a.gamesPlayed);

      return {
        sessionsPlayed: sessions.length,
        wins,
        winFactor: expectedWins === 0 ? 0 : round1(wins / expectedWins),
        isWinFactorWeak: sessions.length < MIN_GAMES_FOR_WIN_FACTOR,
        // The running average is computed over the full history, then only its tail is plotted —
        // the last twelve points of a career, not a fresh twelve-session career.
        form: {
          labels: formLabels.slice(-FORM_POINTS),
          points: formPoints.slice(-FORM_POINTS),
          beatShares: formBeatShares.slice(-FORM_POINTS),
        },
        gameRecords,
      };
    },
  });
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
