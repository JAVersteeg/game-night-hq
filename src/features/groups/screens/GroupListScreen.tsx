import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ActivityIndicator, FlatList, Pressable, View } from 'react-native';
import { Text } from '@/components/Text';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { useProfile } from '@/features/auth/hooks/useProfile';
import { useGroups, type Group } from '@/features/groups/hooks/useGroups';
import type { AppStackParamList } from '@/navigation/types';

type Navigation = NativeStackNavigationProp<AppStackParamList>;

function GroupRow({ group, onPress }: { group: Group; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Open groep ${group.name}`}
      className="flex-row items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-4 active:opacity-70"
    >
      <Text className="shrink text-lg font-semibold text-ink" numberOfLines={1}>
        {group.name}
      </Text>
      {/* A chevron drawn as text: nothing in the app pulls in an icon set yet, and one glyph is not
          reason enough to add one. */}
      <Text className="ml-auto text-xl text-ink-subtle">›</Text>
    </Pressable>
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
  const navigation = useNavigation<Navigation>();
  const { data: profile } = useProfile();
  const { data: groups, isPending, isError, refetch, isRefetching } = useGroups();

  return (
    <SafeAreaView className="flex-1 bg-surface" edges={['top', 'bottom']}>
      <View className="flex-row items-center justify-between gap-4 px-6 pb-2 pt-2">
        <View >
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
          renderItem={({ item }) => (
            <GroupRow
              group={item}
              onPress={() => navigation.navigate('GroupDashboard', { groupId: item.id })}
            />
          )}
          contentContainerClassName="grow gap-3 px-6 pb-8 pt-2"
          ListEmptyComponent={EmptyState}
          onRefresh={refetch}
          refreshing={isRefetching}
        />
      )}

      {/* Pinned rather than appended to the list: these are the only two ways into the app's
          content, so they stay reachable whether the list is empty, long, or still loading. */}
      <View className="gap-3 border-t border-line px-6 py-4">
        <Button
          label="Groep aanmaken"
          onPress={() => navigation.navigate('CreateGroup')}
          testID="create-group-button"
        />
        <Button
          label="Code invoeren"
          variant="ghost"
          onPress={() => navigation.navigate('JoinGroup')}
          testID="join-group-button"
        />
      </View>
    </SafeAreaView>
  );
}
