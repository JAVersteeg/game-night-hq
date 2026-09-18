import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from '@/features/auth/context/AuthContext';
import { supabase } from '@/lib/supabase';
import type { Tables } from '@/types/database';

export type Profile = Tables<'profiles'>;

/** Long enough for a real name, short enough to still fit a scoreboard row. */
export const MAX_DISPLAY_NAME_LENGTH = 40;

export const profileKeys = {
  all: ['profile'] as const,
  byUser: (userId: string) => ['profile', userId] as const,
};

/**
 * `display_name` is NOT NULL, so a profile row only exists once onboarding has collected one.
 * "Signed in but no profile row" is therefore the single source of truth for "still needs a name",
 * rather than a separate flag we would have to keep in sync.
 */
export function useProfile() {
  const { session } = useAuth();
  const userId = session?.user.id;

  return useQuery({
    queryKey: userId ? profileKeys.byUser(userId) : profileKeys.all,
    enabled: Boolean(userId),
    queryFn: async (): Promise<Profile | null> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId!)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });
}

export function useSetDisplayName() {
  const { session } = useAuth();
  const queryClient = useQueryClient();
  const userId = session?.user.id;

  return useMutation({
    mutationFn: async (displayName: string): Promise<Profile> => {
      if (!userId) throw new Error('not signed in');

      // Upsert rather than insert so a retry after a timeout — where the row may already have
      // landed — succeeds instead of tripping the primary key.
      const { data, error } = await supabase
        .from('profiles')
        .upsert({ id: userId, display_name: displayName.trim() })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (profile) => {
      queryClient.setQueryData(profileKeys.byUser(profile.id), profile);
    },
  });
}
