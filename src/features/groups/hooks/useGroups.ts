import { useQuery } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/context/AuthContext';
import { supabase } from '@/lib/supabase';
import type { Tables } from '@/types/database';

export type Group = Tables<'groups'>;

export const groupKeys = {
  all: ['groups'] as const,
  list: (userId: string) => ['groups', 'list', userId] as const,
};

/**
 * No `.eq('user_id', ...)` filter here on purpose: the groups_select policy already limits rows to
 * groups the caller is a member of, so filtering client-side would only duplicate — and risk
 * diverging from — the rule the database enforces.
 */
export function useGroups() {
  const { session } = useAuth();
  const userId = session?.user.id;

  return useQuery({
    queryKey: userId ? groupKeys.list(userId) : groupKeys.all,
    enabled: Boolean(userId),
    queryFn: async (): Promise<Group[]> => {
      const { data, error } = await supabase
        .from('groups')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      return data;
    },
  });
}
