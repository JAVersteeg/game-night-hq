import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { profileKeys } from '@/features/auth/hooks/useProfile';
import { gameKeys } from '@/features/games/hooks/useGameTemplates';
import { groupKeys } from '@/features/groups/hooks/useGroups';
import { sessionHistoryKeys } from '@/features/sessions/hooks/useSessionHistory';
import { sessionScoreKeys } from '@/features/sessions/hooks/useSessionScores';
import { supabase } from '@/lib/supabase';
import type { Tables } from '@/types/database';

export type Session = Tables<'sessions'>;

export interface SessionWithTemplate extends Session {
  game_templates: Pick<Tables<'game_templates'>, 'name' | 'scoring_direction' | 'rounds' | 'round_count'>;
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
        .select('*, game_templates(name, scoring_direction, rounds, round_count)')
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

/** One round's field entries, keyed by participant then field key — what `useCommitRound` adds onto
 *  a highest/lowest_total_wins rounds template's running totals. */
export type RoundFieldValues = Record<string, Record<string, number>>;

/** Whichever shape of round `undo_round` reversed, so the screen can drop the scorekeeper back into
 *  it to correct: a finish order for a ranked-and-rounds template, or field entries for a
 *  highest/lowest_total_wins one. */
export type RoundUndoResult = { order: string[] } | { values: RoundFieldValues };

/**
 * Banks one round: for a ranked-and-rounds template (Dalmuti) the finish order goes in and the
 * server adds `participants - rank` to every player's running `points` total; for a
 * highest/lowest_total_wins rounds template the round's field entries go in and are added onto
 * each field's running total. Either way `rounds_played` is bumped. An RPC rather than a batch of
 * score upserts because a partially applied round can't be spotted afterwards — only the running
 * totals are stored, so there's nothing to compare a half-written round against.
 */
export function useCommitRound(sessionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (round: { order: string[] } | { values: RoundFieldValues }) => {
      const { error } =
        'order' in round
          ? await supabase.rpc('commit_ranked_round', {
              p_session_id: sessionId,
              p_order: round.order,
            })
          : await supabase.rpc('commit_field_round', {
              p_session_id: sessionId,
              p_values: round.values,
            });

      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: sessionKeys.detail(sessionId) });
      void queryClient.invalidateQueries({ queryKey: sessionScoreKeys.detail(sessionId) });
    },
  });
}

/**
 * Takes back whichever round `sessions.last_round_order`/`last_round_values` describes. Only the
 * most recent round is recoverable: committing clears nothing, but undoing clears whichever of the
 * two columns was set, which is what makes a second undo in a row impossible.
 */
export function useUndoRound(sessionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<RoundUndoResult> => {
      const { data, error } = await supabase.rpc('undo_round', {
        p_session_id: sessionId,
      });

      if (error) throw error;
      return data as RoundUndoResult;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: sessionKeys.detail(sessionId) });
      void queryClient.invalidateQueries({ queryKey: sessionScoreKeys.detail(sessionId) });
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
