import type { RouteProp } from '@react-navigation/native';
import { useRoute } from '@react-navigation/native';
import { ActivityIndicator, ScrollView, Share, Text, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { SectionLabel } from '@/components/SectionLabel';
import { useAuth } from '@/features/auth/context/AuthContext';
import { useGroupMembers, type GroupMember } from '@/features/groups/hooks/useGroupMembers';
import { useGroup, type Group } from '@/features/groups/hooks/useGroups';
import { logError } from '@/lib/logError';
import type { AppStackParamList } from '@/navigation/types';

function InviteCodeCard({ group }: { group: Group }) {
  // The system share sheet, not a deep link: `gamenighthq://` only resolves inside an installed
  // build, so a plain code is the thing that actually works wherever the message lands. The share
  // sheet also covers "copy" without pulling in a native clipboard module.
  async function handleShare() {
    try {
      await Share.share({
        message:
          `Doe mee met "${group.name}" op Game Night HQ. ` +
          `Kies "Code invoeren" en vul deze code in: ${group.invite_code}`,
      });
    } catch (error) {
      // Dismissing the sheet is not an error, but a genuine failure should not take the screen
      // down either — there is nothing the user could do about it here.
      void logError('client:GroupSettingsScreen', error, { context: 'share invite code' });
    }
  }

  return (
    <View className="mt-2 gap-4 rounded-2xl border border-line bg-surface px-4 py-5">
      <Text
        className="text-center text-4xl font-bold tracking-[10px] text-ink"
        selectable
        testID="invite-code"
      >
        {group.invite_code}
      </Text>
      <Button label="Delen" onPress={handleShare} variant="secondary" testID="share-invite-code" />
    </View>
  );
}

function MemberRow({ member, isCurrentUser }: { member: GroupMember; isCurrentUser: boolean }) {
  return (
    <View className="flex-row items-center gap-3 px-4 py-3">
      <Avatar displayName={member.displayName} avatarUrl={member.avatarUrl} size={36} />
      <Text className="shrink text-base text-ink" numberOfLines={1}>
        {member.displayName}
      </Text>
      {isCurrentUser ? <Text className="text-sm text-ink-subtle">Jij</Text> : null}
    </View>
  );
}

/** Setup-time concerns for a group: the invite code and who's in it. Reached from the dashboard's
 *  gear button, not the primary destination for opening a group. */
export function GroupSettingsScreen() {
  const { groupId } = useRoute<RouteProp<AppStackParamList, 'GroupSettings'>>().params;
  const { session } = useAuth();
  const { data: group } = useGroup(groupId);
  const { data: members, isPending, isError } = useGroupMembers(groupId);

  // The group is read from the list cache, which is populated before anything can navigate here —
  // but a cache eviction or a group you were removed from would leave nothing to render.
  if (!group) {
    return (
      <View className="flex-1 items-center justify-center bg-surface px-6">
        <Text className="text-center text-base text-ink-muted">
          Deze groep kon niet worden geladen.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-surface" contentContainerClassName="px-6 pb-12 pt-6">
      <SectionLabel>Uitnodigingscode</SectionLabel>
      <InviteCodeCard group={group} />
      <Text className="mt-2 text-sm text-ink-subtle">
        Deel deze code met vrienden zodat ze zich bij de groep kunnen aansluiten.
      </Text>

      <View className="mt-8">
        <SectionLabel>{members ? `Leden (${members.length})` : 'Leden'}</SectionLabel>
        <View className="mt-2 overflow-hidden rounded-2xl border border-line bg-surface">
          {isPending ? (
            <View className="items-center py-6">
              <ActivityIndicator />
            </View>
          ) : isError || !members ? (
            <Text className="px-4 py-6 text-base text-ink-muted">
              De leden konden niet worden geladen.
            </Text>
          ) : (
            members.map((member, index) => (
              <View key={member.userId} className={index > 0 ? 'border-t border-line' : undefined}>
                <MemberRow member={member} isCurrentUser={member.userId === session?.user.id} />
              </View>
            ))
          )}
        </View>
      </View>
    </ScrollView>
  );
}
