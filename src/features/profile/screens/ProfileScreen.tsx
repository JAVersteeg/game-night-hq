import { ActivityIndicator, ScrollView, Text, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { useProfile } from '@/features/auth/hooks/useProfile';

/**
 * The user's own profile. Eventually this is where personal stats live and where the display name
 * is edited; for now it shows the name and an avatar field that is not wired up to anything yet.
 */
export function ProfileScreen() {
  const { data: profile, isPending, isError } = useProfile();

  if (isPending) {
    return (
      <View className="flex-1 items-center justify-center bg-surface">
        <ActivityIndicator />
      </View>
    );
  }

  if (isError || !profile) {
    return (
      <View className="flex-1 items-center justify-center bg-surface px-6">
        <Text className="text-center text-base text-ink-muted">
          Je profiel kon niet worden geladen.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-surface" contentContainerClassName="px-6 pb-12 pt-6">
      <View className="items-center">
        <Avatar displayName={profile.display_name} avatarUrl={profile.avatar_url} size={96} />
        {/* The avatar field is a placeholder: `profiles.avatar_url` exists in the schema but
            nothing writes it yet, so this always falls back to initials. */}
        <Text className="mt-3 text-sm text-ink-subtle">Profielfoto volgt later</Text>
      </View>

      <View className="mt-8">
        <Text className="text-sm font-semibold uppercase tracking-wide text-ink-subtle">Naam</Text>
        <View className="mt-2 rounded-2xl border border-line bg-surface px-4 py-4">
          <Text className="text-lg text-ink">{profile.display_name}</Text>
        </View>
      </View>

      <View className="mt-8">
        <Text className="text-sm font-semibold uppercase tracking-wide text-ink-subtle">
          Statistieken
        </Text>
        <View className="mt-2 rounded-2xl border border-line bg-surface-muted px-4 py-6">
          <Text className="text-base text-ink-muted">
            Je persoonlijke statistieken verschijnen hier zodra je spellen hebt gespeeld.
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}
