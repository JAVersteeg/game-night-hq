import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useId } from 'react';

import { supabase } from '@/lib/supabase';

export interface LiveSession {
  id: string;
  groupId: string;
  playedAt: string;
  scorekeeperId: string;
  roundsPlayed: number;
  gameName: string;
  coverKey: string | null;
  rounds: boolean;
  roundCount: number | null;
  participantIds: string[];
}

export const liveSessionKeys = {
  all: ['sessions', 'live'] as const,
};

interface LiveSessionRow {
  id: string;
  group_id: string;
  played_at: string;
  scorekeeper_id: string;
  rounds_played: number;
  game_templates: { name: string; cover_key: string | null; rounds: boolean; round_count: number | null };
  session_participants: { user_id: string }[];
}

/**
 * Every in-progress session across all of the user's groups, newest first — RLS already limits
 * `sessions` to groups they're a member of, so one query serves both the group list's "Nu bezig"
 * marker and the dashboard's live card (which filters it down to its own group).
 *
 * Subscribed to realtime so a session someone else starts, finishes or deletes shows up or drops
 * off without a refresh. No filter on the channel: RLS scopes the events the same way it scopes the
 * query, and every event just triggers a refetch rather than being applied from its payload.
 */
export function useLiveSessions() {
  const queryClient = useQueryClient();
  // The group list stays mounted underneath the dashboard, so two instances of this hook are live
  // at once — each needs its own topic, or the second would reuse the first's already-subscribed
  // channel and fail to add its handler.
  // useId's `:r0:` shape is stripped to keep the topic plain.
  const channelId = useId().replace(/:/g, '');

  useEffect(() => {
    const channel = supabase
      .channel(`live-sessions-${channelId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' }, () => {
        void queryClient.invalidateQueries({ queryKey: liveSessionKeys.all });
      })
      .subscribe();

    return () => void supabase.removeChannel(channel);
  }, [channelId, queryClient]);

  return useQuery({
    queryKey: liveSessionKeys.all,
    queryFn: async (): Promise<LiveSession[]> => {
      const { data, error } = await supabase
        .from('sessions')
        .select(
          `id, group_id, played_at, scorekeeper_id, rounds_played,
           game_templates(name, cover_key, rounds, round_count),
           session_participants(user_id)`,
        )
        .eq('status', 'in_progress')
        .order('played_at', { ascending: false })
        .returns<LiveSessionRow[]>();

      if (error) throw error;

      return data.map((row) => ({
        id: row.id,
        groupId: row.group_id,
        playedAt: row.played_at,
        scorekeeperId: row.scorekeeper_id,
        roundsPlayed: row.rounds_played,
        gameName: row.game_templates.name,
        coverKey: row.game_templates.cover_key,
        rounds: row.game_templates.rounds,
        roundCount: row.game_templates.round_count,
        participantIds: row.session_participants.map((participant) => participant.user_id),
      }));
    },
  });
}
