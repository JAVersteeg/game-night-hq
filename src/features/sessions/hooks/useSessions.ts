import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { profileKeys } from '@/features/auth/hooks/useProfile';
import { gameKeys } from '@/features/games/hooks/useGameTemplates';
import { groupKeys } from '@/features/groups/hooks/useGroups';
import { sessionHistoryKeys } from '@/features/sessions/hooks/useSessionHistory';
import { supabase } from '@/lib/supabase';
import type { Tables } from '@/types/database';

export type Session = Tables<'sessions'>;

export interface SessionWithTemplate extends Session {
  game_templates: Pick<Tables<'game_templates'>, 'name' | 'scoring_direction'>;
}

export const sessionKeys = {
  detail: (sessionId: string) => ['sessions', 'detail', sessionId] as const,
};

/**
 * Goes through create_session rather than two separate inserts: RLS lets any group member insert
 * the session row, but session_participants_insert only allows the session's own scorekeeper to
 * write — which the person starting the session often isn't. Only the RPC's definer privileges can
 * seat the chosen participants regardless of who that ends up being.
 */
export function useCreateSession(groupId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      templateId: string;
      scorekeeperId: string;
      participantIds: string[];
    }): Promise<Session> => {
      const { data, error } = await supabase.rpc('create_session', {
        p_group_id: groupId,
        p_template_id: input.templateId,
        p_scorekeeper_id: input.scorekeeperId,
        p_participant_ids: input.participantIds,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: groupKeys.dashboard(groupId) });
    },
  });
}

/**
 * The session plus its game's name and scoring direction, for the live session screen's header.
 * Subscribed to realtime so a read-only participant sees `status` flip to `completed` — and score
 * entry lock — the moment the scorekeeper finalises, without polling.
 */
export function useSession(sessionId: string) {
  const queryClient = useQueryClient();
  const queryKey = sessionKeys.detail(sessionId);

  useEffect(() => {
    const channel = supabase
      .channel(`session-${sessionId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'sessions', filter: `id=eq.${sessionId}` },
        () => void queryClient.invalidateQueries({ queryKey }),
      )
      .subscribe();

    return () => void supabase.removeChannel(channel);
  }, [sessionId, queryClient, queryKey]);

  return useQuery({
    queryKey,
    queryFn: async (): Promise<SessionWithTemplate> => {
      const { data, error } = await supabase
        .from('sessions')
        .select('*, game_templates(name, scoring_direction)')
        .eq('id', sessionId)
        .single();

      if (error) throw error;
      return data;
    },
  });
}

/**
 * Finalising is a plain update, not an RPC: `sessions_update` already restricts it to the
 * scorekeeper, and flipping `status` to `completed` is exactly what makes `can_write_scores` start
 * rejecting further writes — the "lock" is a side effect of this one column, nothing more.
 */
export function useFinalizeSession(sessionId: string, groupId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('sessions')
        .update({ status: 'completed', completed_at: new Date().toISOString() })
        .eq('id', sessionId);

      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: sessionKeys.detail(sessionId) });
      void queryClient.invalidateQueries({ queryKey: groupKeys.dashboard(groupId) });
      void queryClient.invalidateQueries({ queryKey: sessionHistoryKeys.list(groupId) });
      // Every stats surface counts this session from now on. Invalidated by prefix rather than by
      // exact key: the template id isn't in scope here, and the profile's stats span all groups,
      // so neither one can be named precisely — and both are cheap to refetch at this scale.
      void queryClient.invalidateQueries({ queryKey: gameKeys.all });
      void queryClient.invalidateQueries({ queryKey: profileKeys.all });
    },
  });
}

/**
 * Abandoning a session the scorekeeper never actually played out — `sessions_delete` restricts
 * this to the scorekeeper and only while `in_progress`, so a finished session can never be erased
 * this way. The cascade on `session_participants`/`session_scores` handles the rest.
 */
export function useDeleteSession(sessionId: string, groupId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('sessions').delete().eq('id', sessionId);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: groupKeys.dashboard(groupId) });
    },
  });
}
