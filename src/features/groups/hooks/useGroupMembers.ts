import { useQuery } from '@tanstack/react-query';

import { groupKeys } from '@/features/groups/hooks/useGroups';
import { supabase } from '@/lib/supabase';

export interface GroupMember {
  userId: string;
  joinedAt: string;
  displayName: string;
  avatarUrl: string | null;
}

/**
 * The embedded `profiles(...)` select rides the group_members → profiles foreign key added in
 * 20260914090000. PostgREST cannot see the older FK to auth.users, so without that constraint this
 * would have to be two round trips stitched together on the client.
 *
 * Two policies have to agree for a row to come back: group_members_select limits members to groups
 * the caller belongs to, and profiles_select only reveals a profile to someone who shares a group
 * with them. Both are satisfied here by construction, which is why no extra filtering is needed
 * beyond naming the group.
 */
export function useGroupMembers(groupId: string) {
  return useQuery({
    queryKey: groupKeys.members(groupId),
    queryFn: async (): Promise<GroupMember[]> => {
      const { data, error } = await supabase
        .from('group_members')
        .select('user_id, joined_at, profiles(display_name, avatar_url)')
        .eq('group_id', groupId)
        .order('joined_at', { ascending: true });

      if (error) throw error;

      return data.map((row) => ({
        userId: row.user_id,
        joinedAt: row.joined_at,
        displayName: row.profiles.display_name,
        avatarUrl: row.profiles.avatar_url,
      }));
    },
  });
}
