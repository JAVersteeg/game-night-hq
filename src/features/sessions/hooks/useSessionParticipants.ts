import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/lib/supabase';

export const sessionParticipantKeys = {
  list: (sessionId: string) => ['sessions', 'participants', sessionId] as const,
};

export function useSessionParticipants(sessionId: string) {
  return useQuery({
    queryKey: sessionParticipantKeys.list(sessionId),
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase
        .from('session_participants')
        .select('user_id')
        .eq('session_id', sessionId);

      if (error) throw error;
      return data.map((row) => row.user_id);
    },
  });
}
