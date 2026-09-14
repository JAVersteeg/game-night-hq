import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/Avatar';
import { useProfile } from '@/features/auth/hooks/useProfile';
import { useGroups, type Group } from '@/features/groups/hooks/useGroups';
import type { AppStackParamList } from '@/navigation/types';

function GroupRow({ group }: { group: Group }) {
  return (
    <View className="rounded-2xl border border-line bg-surface px-4 py-4">
      <Text className="text-lg font-semibold text-ink">{group.name}</Text>
    </View>
  );
}

function EmptyState() {
  return (
    <View className="flex-1 items-center justify-center px-6 py-16">
      <Text className="text-center text-xl font-semibold text-ink">Nog geen groepen</Text>
      <Text className="mt-2 text-center text-base text-ink-muted">
        Maak een groep voor jullie spelavonden, of sluit je aan bij een groep met een
        uitnodigingscode van een vriend.
      </Text>
    </View>
  );
}

export function GroupListScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AppStackParamList>>();
  const { data: profile } = useProfile();
  const { data: groups, isPending, isError, refetch, isRefetching } = useGroups();

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top']}>
      <View className="flex-row items-start justify-between gap-4 px-6 pb-2 pt-2">
        <View className="shrink">
          <Text className="text-3xl font-bold tracking-tight text-ink">Jouw groepen</Text>
        </View>

        {profile ? (
          <Pressable
            onPress={() => navigation.navigate('Profile')}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Naar je profiel"
            className="mt-1 active:opacity-70"
            testID="profile-button"
          >
            <Avatar displayName={profile.display_name} avatarUrl={profile.avatar_url} size={40} />
          </Pressable>
        ) : null}
      </View>

      {isPending ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator />
        </View>
      ) : isError ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-center text-base text-ink-muted">
            Je groepen konden niet worden geladen.
          </Text>
        </View>
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(group) => group.id}
          renderItem={({ item }) => <GroupRow group={item} />}
          contentContainerClassName="grow gap-3 px-6 pb-8 pt-2"
          ListEmptyComponent={EmptyState}
          onRefresh={refetch}
          refreshing={isRefetching}
        />
      )}
    </SafeAreaView>
  );
}
