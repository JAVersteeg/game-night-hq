import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/context/AuthContext';
import { supabase } from '@/lib/supabase';
import type { Tables } from '@/types/database';

export type Group = Tables<'groups'>;

export const groupKeys = {
  all: ['groups'] as const,
  list: (userId: string) => ['groups', 'list', userId] as const,
  members: (groupId: string) => ['groups', 'members', groupId] as const,
  dashboard: (groupId: string) => ['groups', 'dashboard', groupId] as const,
  badges: (groupId: string) => ['groups', 'badges', groupId] as const,
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

/**
 * Reads one group out of the list the user already has loaded, rather than fetching it again. The
 * list is in cache before any screen can navigate to a group, and create/join seed it with the new
 * group, so there is never a moment where a detail screen would have to wait on a round trip.
 */
export function useGroup(groupId: string) {
  const { data: groups, ...rest } = useGroups();
  return { ...rest, data: groups?.find((group) => group.id === groupId) ?? null };
}

/**
 * Shared by create and join: put the group straight into the list cache so the screen we navigate
 * to can read it immediately, then invalidate to reconcile with whatever the server actually has.
 * Append rather than replace — `useGroups` orders by created_at ascending, and a newly created
 * group is by definition the newest. Join is idempotent, so a group already in the list is left
 * alone instead of being duplicated.
 */
function useCacheGroup() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const userId = session?.user.id;

  return (group: Group) => {
    if (userId) {
      queryClient.setQueryData<Group[]>(groupKeys.list(userId), (groups) => {
        if (!groups) return [group];
        return groups.some((existing) => existing.id === group.id) ? groups : [...groups, group];
      });
    }
    // `refetchType: 'all'` rather than the default 'active': create/join both immediately navigate
    // away to the new group's dashboard, which can leave the list screen's query observer inactive
    // at the exact moment this fires. The default would mark it stale without refetching it, so it
    // would only catch up the next time something else touches it (a pull-to-refresh, a remount).
    void queryClient.invalidateQueries({ queryKey: groupKeys.all, refetchType: 'all' });
  };
}

/**
 * Creating a group goes through the create_group RPC rather than an insert: there is deliberately
 * no INSERT policy on `groups` or `group_members`, because the group row and the creator's
 * membership row have to land together or not at all.
 */
export function useCreateGroup() {
  const cacheGroup = useCacheGroup();

  return useMutation({
    mutationFn: async (name: string): Promise<Group> => {
      const { data, error } = await supabase.rpc('create_group', { p_name: name.trim() });

      if (error) throw error;
      return data;
    },
    onSuccess: cacheGroup,
  });
}

/**
 * Likewise a definer RPC: the invite code is the one thing that has to resolve a group the caller
 * cannot yet read. Upper-casing here is cosmetic only — join_group_by_code applies the same
 * `upper(btrim(...))` server-side — but it keeps what the user typed and what was looked up
 * identical, which matters when the code comes back as "does not exist".
 */
export function useJoinGroup() {
  const cacheGroup = useCacheGroup();

  return useMutation({
    mutationFn: async (code: string): Promise<Group> => {
      const { data, error } = await supabase.rpc('join_group_by_code', {
        p_code: code.trim().toUpperCase(),
      });

      if (error) throw error;
      return data;
    },
    onSuccess: cacheGroup,
  });
}

/**
 * join_group_by_code raises P0002 (no_data_found) for a code that matches no group. That is the one
 * failure the user can actually fix, so it gets its own message; everything else is a connection or
 * server problem and gets the generic one.
 */
export function joinErrorMessage(error: unknown): string {
  const code = (error as { code?: string } | null)?.code;
  if (code === 'P0002') {
    return 'Deze code bestaat niet. Controleer of je hem goed hebt overgenomen.';
  }
  return 'Deelnemen is niet gelukt. Controleer je verbinding en probeer het opnieuw.';
}
