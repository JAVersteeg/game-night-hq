import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

export const sessionParticipantKeys = {
  list: (sessionId: string) => ['sessions', 'participants', sessionId] as const,
};

interface ParticipantRow {
  user_id: string;
  team: number | null;
}

async function fetchParticipants(sessionId: string): Promise<ParticipantRow[]> {
  const { data, error } = await supabase
    .from('session_participants')
    .select('user_id, team')
    .eq('session_id', sessionId);

  if (error) throw error;
  return data;
}

export function useSessionParticipants(sessionId: string) {
  return useQuery({
    queryKey: sessionParticipantKeys.list(sessionId),
    queryFn: () => fetchParticipants(sessionId),
    select: (rows) => rows.map((row) => row.user_id),
  });
}

/** Which team each participant plays in, or null for a session of a non-team game. Shares the
 *  participants query, so it costs no extra request. */
export function useSessionTeamByUser(sessionId: string) {
  return useQuery({
    queryKey: sessionParticipantKeys.list(sessionId),
    queryFn: () => fetchParticipants(sessionId),
    select: (rows): Record<string, number> | null =>
      rows.some((row) => row.team !== null)
        ? Object.fromEntries(rows.map((row) => [row.user_id, row.team ?? 0]))
        : null,
  });
}
