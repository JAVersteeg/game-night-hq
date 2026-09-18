import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { supabase } from '@/lib/supabase';
import type { Tables } from '@/types/database';

export type SessionNote = Tables<'session_notes'>;

export const sessionNoteKeys = {
  detail: (sessionId: string) => ['sessions', 'notes', sessionId] as const,
};

/**
 * An append-only log, oldest first. Everyone in the group reads it; only the scorekeeper can add
 * or remove entries, and only while the session is in progress or within the 2-hour grace window
 * after completion — enforced entirely by RLS (`can_write_session_notes`).
 */
export function useSessionNotes(sessionId: string) {
  const queryClient = useQueryClient();
  const queryKey = sessionNoteKeys.detail(sessionId);

  useEffect(() => {
    const channel = supabase
      .channel(`session-notes-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'session_notes',
          filter: `session_id=eq.${sessionId}`,
        },
        () => void queryClient.invalidateQueries({ queryKey: sessionNoteKeys.detail(sessionId) }),
      )
      .subscribe();

    return () => void supabase.removeChannel(channel);
    // Not `queryKey`: it's a fresh array every render and would resubscribe on each one.
  }, [sessionId, queryClient]);

  return useQuery({
    queryKey,
    enabled: sessionId.length > 0,
    queryFn: async (): Promise<SessionNote[]> => {
      const { data, error } = await supabase
        .from('session_notes')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data;
    },
  });
}

export function useAddSessionNote(sessionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { authorId: string; body: string }) => {
      const { error } = await supabase.from('session_notes').insert({
        session_id: sessionId,
        author_id: input.authorId,
        body: input.body,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: sessionNoteKeys.detail(sessionId) });
    },
  });
}

export function useDeleteSessionNote(sessionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (noteId: string) => {
      const { error } = await supabase.from('session_notes').delete().eq('id', noteId);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: sessionNoteKeys.detail(sessionId) });
    },
  });
}
