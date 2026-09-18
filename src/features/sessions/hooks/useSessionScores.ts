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
        {
          event: '*',
          schema: 'public',
          table: 'session_scores',
          filter: `session_id=eq.${sessionId}`,
        },
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

  return useMutation({
    mutationFn: async (input: { userId: string; fieldKey: string; value: number }) => {
      const { error } = await supabase.from('session_scores').upsert({
        session_id: sessionId,
        user_id: input.userId,
        field_key: input.fieldKey,
        value: input.value,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: sessionScoreKeys.detail(sessionId) });
    },
  });
}

/** The same write, but for a whole set of entries at once. Reordering a ranked list rewrites the
 *  position of everyone the dragged player moved past, and sending those one at a time meant a
 *  burst of upserts — each with its own invalidate and refetch — landing while the drop animation
 *  was still running. One round-trip, one invalidation. */
export function useSetScores(sessionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (entries: { userId: string; fieldKey: string; value: number }[]) => {
      if (entries.length === 0) return;

      const { error } = await supabase.from('session_scores').upsert(
        entries.map((entry) => ({
          session_id: sessionId,
          user_id: entry.userId,
          field_key: entry.fieldKey,
          value: entry.value,
        })),
      );

      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: sessionScoreKeys.detail(sessionId) });
    },
  });
}
