import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { supabase } from '@/lib/supabase';
import type { Tables } from '@/types/database';

export type ScoresByUser = Record<string, Record<string, number>>;

export const sessionScoreKeys = {
  detail: (sessionId: string) => ['sessions', 'scores', sessionId] as const,
};

function groupByUser(rows: Tables<'session_scores'>[]): ScoresByUser {
  const scoresByUser: ScoresByUser = {};
  for (const row of rows) {
    scoresByUser[row.user_id] ??= {};
    scoresByUser[row.user_id][row.field_key] = row.value;
  }
  return scoresByUser;
}

/**
 * Everyone in the group reads this, but only the scorekeeper writes to it — that split is enforced
 * entirely by RLS (`can_write_scores`), not by anything client-side. The realtime subscription is
 * what makes the read side "live" for the participants watching from the read-only view.
 */
export function useSessionScores(sessionId: string) {
  const queryClient = useQueryClient();
  const queryKey = sessionScoreKeys.detail(sessionId);

  useEffect(() => {
    const channel = supabase
      .channel(`session-scores-${sessionId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'session_scores', filter: `session_id=eq.${sessionId}` },
        () => void queryClient.invalidateQueries({ queryKey }),
      )
      .subscribe();

    return () => void supabase.removeChannel(channel);
  }, [sessionId, queryClient, queryKey]);

  return useQuery({
    queryKey,
    enabled: sessionId.length > 0,
    queryFn: async (): Promise<ScoresByUser> => {
      const { data, error } = await supabase
        .from('session_scores')
        .select('*')
        .eq('session_id', sessionId);

      if (error) throw error;
      return groupByUser(data);
    },
  });
}

/** One field, one participant, one write — upserted so the scorekeeper can revise a value they
 *  already entered without caring whether a row exists yet. */
export function useSetScore(sessionId: string) {
  const queryClient = useQueryClient();
  const queryKey = sessionScoreKeys.detail(sessionId);

  return useMutation({
    mutationKey: queryKey,
    mutationFn: async (input: { userId: string; fieldKey: string; value: number }) => {
      const { error } = await supabase.from('session_scores').upsert({
        session_id: sessionId,
        user_id: input.userId,
        field_key: input.fieldKey,
        value: input.value,
      });

      if (error) throw error;
    },
    // Totals are derived from this cache, so writing into it up front makes them update instantly
    // instead of after the upsert plus a refetch. Cancelling first stops an in-flight refetch from
    // landing afterwards with an older value.
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<ScoresByUser>(queryKey);
      queryClient.setQueryData<ScoresByUser>(queryKey, (current = {}) => ({
        ...current,
        [input.userId]: { ...current[input.userId], [input.fieldKey]: input.value },
      }));
      return { previous };
    },
    onError: (_error, _input, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
    },
    onSettled: () => {
      // Skipped while other score writes are still in flight, so an early refetch can't briefly
      // overwrite their optimistic values; the last write to settle does the sync.
      if (queryClient.isMutating({ mutationKey: queryKey }) <= 1) {
        void queryClient.invalidateQueries({ queryKey });
      }
    },
  });
}
