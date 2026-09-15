import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { groupKeys } from '@/features/groups/hooks/useGroups';
import { supabase } from '@/lib/supabase';
import type { Enums } from '@/types/database';

export type PlayerColor = Enums<'player_color'>;

export interface GroupMember {
  userId: string;
  joinedAt: string;
  displayName: string;
  avatarUrl: string | null;
  color: PlayerColor;
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
    // Empty when the caller doesn't have a groupId yet — SessionScreen reads it off a session
    // that's still loading — rather than firing a query that can only come back empty anyway.
    enabled: groupId.length > 0,
    queryFn: async (): Promise<GroupMember[]> => {
      const { data, error } = await supabase
        .from('group_members')
        .select('user_id, joined_at, color, profiles(display_name, avatar_url)')
        .eq('group_id', groupId)
        .order('joined_at', { ascending: true });

      if (error) throw error;

      return data.map((row) => ({
        userId: row.user_id,
        joinedAt: row.joined_at,
        displayName: row.profiles.display_name,
        avatarUrl: row.profiles.avatar_url,
        color: row.color,
      }));
    },
  });
}

/**
 * Changing your own colour goes through set_member_color rather than a direct update: there is no
 * UPDATE policy on group_members (see the migration for why), so this is the only write path.
 * `colorErrorMessage` below covers the one failure the user can act on — another member took the
 * colour first, a real possibility since the picker's "taken" state can go stale between opening
 * the modal and tapping a swatch.
 */
export function useSetMemberColor(groupId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (color: PlayerColor) => {
      const { data, error } = await supabase.rpc('set_member_color', {
        p_group_id: groupId,
        p_color: color,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: groupKeys.members(groupId) });
    },
  });
}

/** set_member_color raises 23505 (unique_violation) when the colour was taken between the picker
 *  loading and the tap landing; everything else is a connection or server problem. */
export function colorErrorMessage(error: unknown): string {
  const code = (error as { code?: string } | null)?.code;
  if (code === '23505') {
    return 'Deze kleur is net door iemand anders gekozen. Kies een andere.';
  }
  return 'Kleur wijzigen is niet gelukt. Controleer je verbinding en probeer het opnieuw.';
}
