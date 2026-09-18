import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { logError } from '@/lib/logError';
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
        () => {
          // Supabase echoes a client's own writes back over the same channel, so this can fire for
          // a change this client just made itself while `useSetScore` still has a write of its own
          // in flight for the same session. Refetching then would race that write's own
          // onMutate/onSettled dance — the two aren't coordinated, so whichever response landed
          // last would win, even if it reflected an earlier value. Skipping while a write is
          // pending leaves that write's own onSettled to invalidate once it's actually done;
          // everyone else's changes (or this client's, once nothing of its own is still in flight)
          // still come through immediately.
          if (queryClient.isMutating({ mutationKey: queryKey }) > 0) return;
          void queryClient.invalidateQueries({ queryKey });
        },
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
    // Typing "15" fires two writes (value 1, then value 15) close enough together that nothing
    // guarantees they reach the database in that order — upsert is "last write wins" per request,
    // not per keystroke, so whichever one the server happened to finish second is what stuck, even
    // if it was the *first* one sent. `scope` makes every write for this session's scores run
    // strictly one at a time, in the order it was called: the optimistic value below still updates
    // the total on every keystroke (onMutate isn't gated by this), only the actual network request
    // queues, so typing itself never feels slower.
    scope: { id: `session-scores-${sessionId}` },
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
    // Rolling back alone made a rejected write look like the value "snapping back" for no reason —
    // RLS refusing the write (e.g. a finished session past its edit window) left no trace at all.
    onError: (error, input, context) => {
      void logError('client:useSetScore', error, { details: { sessionId, ...input } });
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

/**
 * Writes every field in `inputs` as one request, for the two places that change a whole batch of
 * values at once: `SessionScreen`'s completed-session correction (which edits a draft locally and
 * only saves it here) and a ranked drag, where dropping a player past two others rewrites three
 * ranks. Deliberately not a loop of `useSetScore` calls: that fires one independent mutation per
 * field, and a dozen-odd of those sharing one mutation key is exactly the kind of concurrent,
 * order-sensitive writes `useSetScore`'s `scope`/`isMutating` coordination exists to referee in the
 * first place — correct in principle, but more moving parts than a single "save everything" action
 * needs. One request, one optimistic update, one confirmation: nothing left to referee. For the
 * drag that also means the drop animation isn't competing with a burst of refetches.
 */
export function useSetScores(sessionId: string) {
  const queryClient = useQueryClient();
  const queryKey = sessionScoreKeys.detail(sessionId);

  return useMutation({
    // Same key as `useSetScore`, so the realtime subscription's self-echo guard (which checks
    // `isMutating` against this key) also holds off while this batch write is in flight.
    mutationKey: queryKey,
    mutationFn: async (inputs: { userId: string; fieldKey: string; value: number }[]) => {
      if (inputs.length === 0) return;
      const { error } = await supabase.from('session_scores').upsert(
        inputs.map((input) => ({
          session_id: sessionId,
          user_id: input.userId,
          field_key: input.fieldKey,
          value: input.value,
        })),
      );

      if (error) throw error;
    },
    onMutate: async (inputs) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<ScoresByUser>(queryKey);
      queryClient.setQueryData<ScoresByUser>(queryKey, (current = {}) => {
        const next: ScoresByUser = { ...current };
        for (const input of inputs) {
          next[input.userId] = { ...next[input.userId], [input.fieldKey]: input.value };
        }
        return next;
      });
      return { previous };
    },
    onError: (error, inputs, context) => {
      void logError('client:useSetScores', error, { details: { sessionId, inputs } });
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
    },
    onSettled: () => {
      // Same guard as `useSetScore`, for the same reason — belt and braces, since the two never
      // actually run for the same session at once (`useSetScore` only ever writes fields, and the
      // two callers here are a ranked drag, which has no fields, and completed-session editing),
      // but sharing a mutation key makes it free to check anyway. It does matter between two
      // batches of its own: a quick second drag before the first write settles.
      if (queryClient.isMutating({ mutationKey: queryKey }) <= 1) {
        void queryClient.invalidateQueries({ queryKey });
      }
    },
  });
}
