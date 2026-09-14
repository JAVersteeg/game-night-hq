import { useQuery } from '@tanstack/react-query';

import { groupKeys } from '@/features/groups/hooks/useGroups';
import { supabase } from '@/lib/supabase';

export interface PopularGame {
  templateId: string;
  name: string;
  playCount: number;
}

export interface GroupDashboardStats {
  gamesCount: number;
  sessionsPlayedCount: number;
  lastPlayedAt: string | null;
  /** Only templates that have actually been played, most-played first, capped at 5. */
  popularGames: PopularGame[];
}

const MAX_POPULAR_GAMES = 5;

/**
 * Two flat queries aggregated client-side, rather than a PostgREST embedded `sessions(count)`
 * select: at friend-group scale the row counts are tiny, and this avoids the embed-filter dance of
 * counting only `status = 'completed'` sessions without also restricting which templates come back.
 *
 * Neither query needs a membership filter beyond `group_id` — `game_templates_select` and
 * `sessions_select` both already gate on `is_group_member(group_id)`, the same convention used in
 * `useGroups` and `useGroupMembers`.
 */
export function useGroupDashboardStats(groupId: string) {
  return useQuery({
    queryKey: groupKeys.dashboard(groupId),
    queryFn: async (): Promise<GroupDashboardStats> => {
      const [templatesResult, sessionsResult] = await Promise.all([
        supabase.from('game_templates').select('id, name').eq('group_id', groupId),
        supabase
          .from('sessions')
          .select('id, template_id, played_at')
          .eq('group_id', groupId)
          .eq('status', 'completed'),
      ]);

      if (templatesResult.error) throw templatesResult.error;
      if (sessionsResult.error) throw sessionsResult.error;

      const templates = templatesResult.data;
      const sessions = sessionsResult.data;

      const playCountByTemplateId = new Map<string, number>();
      let lastPlayedAt: string | null = null;
      for (const session of sessions) {
        playCountByTemplateId.set(
          session.template_id,
          (playCountByTemplateId.get(session.template_id) ?? 0) + 1,
        );
        if (!lastPlayedAt || session.played_at > lastPlayedAt) {
          lastPlayedAt = session.played_at;
        }
      }

      const popularGames = templates
        .map((template) => ({
          templateId: template.id,
          name: template.name,
          playCount: playCountByTemplateId.get(template.id) ?? 0,
        }))
        .filter((game) => game.playCount > 0)
        .sort((a, b) => b.playCount - a.playCount)
        .slice(0, MAX_POPULAR_GAMES);

      return {
        gamesCount: templates.length,
        sessionsPlayedCount: sessions.length,
        lastPlayedAt,
        popularGames,
      };
    },
  });
}
