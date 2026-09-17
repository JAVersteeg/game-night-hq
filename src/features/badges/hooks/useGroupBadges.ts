import { useQuery } from '@tanstack/react-query';

import { badgeArtFor } from '@/features/badges/badgeArt';
import type { BadgeStandings, DerivedSession, HolderPeriod } from '@/features/badges/passOnBadges';
import { buildPassOnBadges, replayHolders } from '@/features/badges/passOnBadges';
import type { BonusRule, ScoringDirection } from '@/features/games/hooks/useGameTemplates';
import { gameKeyForTemplate } from '@/features/games/presets';
import { groupKeys } from '@/features/groups/hooks/useGroups';
import { computeTotals, higherTotalIsBetter } from '@/features/sessions/scoring';
import { supabase } from '@/lib/supabase';
import type { ImageSourcePropType } from 'react-native';

export interface BadgeHolder {
  userId: string;
  /** The figure under the name, or null when the date is the only thing worth saying. */
  metric: string | null;
  /** When they took the badge over. */
  since: string;
  /** How many potjes the group has played since then — "4 potjes geleden" on the detail screen. */
  sessionsAgo: number;
}

export interface GroupBadge {
  id: string;
  name: string;
  condition: string;
  description: string;
  art: ImageSourcePropType | null;
  featured: boolean;
  /** Whether the holder wears this badge on their avatar — see `AvatarMarksProvider`. */
  avatarMark: boolean;
  /** Null when no session has met the condition yet. */
  holder: BadgeHolder | null;
  /** Everyone who held it before, newest first. */
  previousHolders: HolderPeriod[];
  /** The ranking the badge is decided on, for badges that have one. */
  standings: BadgeStandings | null;
}

export interface GroupBadges {
  badges: GroupBadge[];
  /** Every finished session in the group, oldest first — what the milestones are measured from. */
  sessions: DerivedSession[];
}

interface SessionRow {
  id: string;
  played_at: string;
  template_id: string;
  game_templates: {
    name: string;
    cover_key: string | null;
    scoring_direction: ScoringDirection;
    rounds: boolean;
    game_template_fields: { key: string; sign: number }[];
    bonus_rules: BonusRule[];
  };
  session_participants: { user_id: string }[];
}

/**
 * Every badge and milestone in one group, derived on read — no badge rows are ever written, in
 * line with how the rest of the app treats stats.
 *
 * Same two-query split as `useSessionHistory` (session_scores has no direct foreign key to
 * sessions, so PostgREST can't embed it), plus the group's templates: a badge can exist for a game
 * nobody has played yet, so the template list can't be inferred from the sessions alone.
 */
export function useGroupBadges(groupId: string) {
  return useQuery({
    queryKey: groupKeys.badges(groupId),
    // Empty while a caller is still waiting on its own group id — SessionScreen reads it off a
    // session that's still loading.
    enabled: groupId.length > 0,
    queryFn: async (): Promise<GroupBadges> => {
      const [templatesResult, sessionsResult] = await Promise.all([
        supabase.from('game_templates').select('id, name, cover_key').eq('group_id', groupId),
        supabase
          .from('sessions')
          .select(
            `id, played_at, template_id,
             game_templates(name, cover_key, scoring_direction, rounds, game_template_fields(key, sign), bonus_rules(*)),
             session_participants(user_id)`,
          )
          .eq('group_id', groupId)
          .eq('status', 'completed')
          .order('played_at', { ascending: true })
          .returns<SessionRow[]>(),
      ]);

      if (templatesResult.error) throw templatesResult.error;
      if (sessionsResult.error) throw sessionsResult.error;

      const templates = templatesResult.data.map((template) => ({
        id: template.id,
        name: template.name,
        gameKey: gameKeyForTemplate(template.cover_key, template.name),
      }));

      const sessionRows = sessionsResult.data;
      const scoresBySession = new Map<string, Record<string, Record<string, number>>>();

      if (sessionRows.length > 0) {
        const { data: scores, error: scoresError } = await supabase
          .from('session_scores')
          .select('session_id, user_id, field_key, value')
          .in(
            'session_id',
            sessionRows.map((session) => session.id),
          );

        if (scoresError) throw scoresError;

        for (const row of scores) {
          const scoresByUser = scoresBySession.get(row.session_id) ?? {};
          scoresByUser[row.user_id] ??= {};
          scoresByUser[row.user_id][row.field_key] = row.value;
          scoresBySession.set(row.session_id, scoresByUser);
        }
      }

      const sessions: DerivedSession[] = sessionRows.map((row) => {
        const template = row.game_templates;
        const participantIds = row.session_participants.map((participant) => participant.user_id);
        const totals = computeTotals(
          participantIds,
          template.game_template_fields,
          template.bonus_rules,
          scoresBySession.get(row.id) ?? {},
          template.scoring_direction,
          template.rounds,
        );

        return {
          id: row.id,
          playedAt: row.played_at,
          templateId: row.template_id,
          gameName: template.name,
          gameKey: gameKeyForTemplate(template.cover_key, template.name),
          participantIds,
          winnerIds: totals.filter((total) => total.isWinner).map((total) => total.userId),
          lastPlaceId: lastPlaceOf(totals, template.scoring_direction, template.rounds),
        };
      });

      const badges = buildPassOnBadges(templates, sessions).map((definition) => {
        const periods = replayHolders(definition, sessions);
        const current = periods[periods.length - 1] ?? null;

        return {
          id: definition.id,
          name: definition.name,
          condition: definition.condition,
          description: definition.description,
          art: badgeArtFor(definition.artKey),
          featured: definition.featured,
          avatarMark: definition.avatarMark,
          holder: current
            ? {
                userId: current.userId,
                metric: current.metric,
                since: current.from,
                sessionsAgo: sessions.filter((session) => session.playedAt > current.from).length,
              }
            : null,
          previousHolders: periods.slice(0, -1).reverse(),
          // Over the whole history, not a prefix: the ranking is the state of play right now,
          // where `periods` is how the badge got here.
          standings: definition.standings?.(sessions.filter(definition.qualifies)) ?? null,
        };
      });

      return { badges, sessions };
    },
  });
}

/** The one player who finished worst, or null when two or more of them tied for it — a shared last
 *  place has no single loser to hand a pass-on badge to. */
function lastPlaceOf(
  totals: { userId: string; total: number }[],
  scoringDirection: ScoringDirection,
  rounds: boolean,
): string | null {
  if (totals.length < 2) return null;

  const higherIsBetter = higherTotalIsBetter(scoringDirection, rounds);
  const worst = totals.reduce((worstSoFar, entry) =>
    (higherIsBetter ? entry.total < worstSoFar.total : entry.total > worstSoFar.total)
      ? entry
      : worstSoFar,
  );

  const tied = totals.filter((entry) => entry.total === worst.total).length;
  return tied === 1 ? worst.userId : null;
}
