import type { RouteProp } from '@react-navigation/native';
import { useRoute } from '@react-navigation/native';
import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Share, Text, View } from 'react-native';

import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button';
import { SectionLabel } from '@/components/SectionLabel';
import { useAuth } from '@/features/auth/context/AuthContext';
import {
  colorErrorMessage,
  useGroupMembers,
  useSetMemberColor,
  type GroupMember,
  type PlayerColor,
} from '@/features/groups/hooks/useGroupMembers';
import { useGroup, type Group } from '@/features/groups/hooks/useGroups';
import { logError } from '@/lib/logError';
import { PLAYER_COLORS } from '@/lib/playerColors';
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

/** Only the current user's own row opens the colour picker — you can't change anyone else's. */
function MemberRow({
  member,
  isCurrentUser,
  onPress,
}: {
  member: GroupMember;
  isCurrentUser: boolean;
  onPress: () => void;
}) {
  const row = (
    <View className="flex-row items-center gap-3 px-4 py-3">
      <Avatar
        displayName={member.displayName}
        avatarUrl={member.avatarUrl}
        color={member.color}
        size={36}
      />
      <Text className="shrink text-base text-ink" numberOfLines={1}>
        {member.displayName}
      </Text>
      {isCurrentUser ? <Text className="text-sm text-ink-subtle">Jij</Text> : null}
    </View>
  );

  if (!isCurrentUser) return row;

  return (
    <Pressable onPress={onPress} accessibilityRole="button" testID="member-row-self">
      {row}
    </Pressable>
  );
}

interface ColorSwatchProps {
  color: (typeof PLAYER_COLORS)[number];
  selected: boolean;
  taken: boolean;
  onSelect: () => void;
}

function ColorSwatch({ color, selected, taken, onSelect }: ColorSwatchProps) {
  return (
    <Pressable
      onPress={taken ? undefined : onSelect}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled: taken }}
      testID={`color-swatch-${color.key}`}
      className="w-1/4 items-center gap-1.5 py-2"
    >
      <View
        className={`h-12 w-12 items-center justify-center rounded-full border-2 ${
          selected ? 'border-ink' : 'border-line-strong'
        }`}
        style={{ backgroundColor: color.swatch, opacity: taken ? 0.35 : 1 }}
      >
        {selected ? (
          <Text className="text-base font-bold" style={{ color: color.fg }}>
            ✓
          </Text>
        ) : null}
      </View>
      <Text
        className={`text-xs font-medium ${taken ? 'text-ink-faint' : 'text-ink-muted'}`}
        numberOfLines={1}
      >
        {taken ? 'Bezet' : color.label}
      </Text>
    </Pressable>
  );
}

interface ColorPickerModalProps {
  visible: boolean;
  currentColor: PlayerColor;
  takenColors: ReadonlySet<PlayerColor>;
  isPending: boolean;
  errorMessage: string | null;
  onSelect: (color: PlayerColor) => void;
  onClose: () => void;
}

function ColorPickerModal({
  visible,
  currentColor,
  takenColors,
  isPending,
  errorMessage,
  onSelect,
  onClose,
}: ColorPickerModalProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        className="flex-1 items-center justify-center bg-surface-deep/70 px-6"
        onPress={onClose}
        accessibilityLabel="Sluit"
      >
        <Pressable className="w-full max-w-sm gap-4 rounded-3xl border border-line bg-surface p-6">
          <View>
            <Text className="text-xl font-bold text-ink">Kies je kleur</Text>
            <Text className="mt-1 text-sm text-ink-muted">
              Elke kleur kan maar door één speler in de groep gebruikt worden.
            </Text>
          </View>

          <View className="flex-row flex-wrap">
            {PLAYER_COLORS.map((color) => (
              <ColorSwatch
                key={color.key}
                color={color}
                selected={color.key === currentColor}
                taken={color.key !== currentColor && takenColors.has(color.key)}
                onSelect={() => onSelect(color.key)}
              />
            ))}
          </View>

          {errorMessage ? (
            <Text className="text-center text-sm text-danger">{errorMessage}</Text>
          ) : null}
          {isPending ? (
            <View className="items-center">
              <ActivityIndicator />
            </View>
          ) : null}

          <Button label="Sluiten" variant="secondary" onPress={onClose} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/** Setup-time concerns for a group: the invite code and who's in it. Reached from the dashboard's
 *  gear button, not the primary destination for opening a group. */
export function GroupSettingsScreen() {
  const { groupId } = useRoute<RouteProp<AppStackParamList, 'GroupSettings'>>().params;
  const { session } = useAuth();
  const { data: group } = useGroup(groupId);
  const { data: members, isPending, isError } = useGroupMembers(groupId);
  const [colorModalOpen, setColorModalOpen] = useState(false);
  const setColor = useSetMemberColor(groupId);

  const me = members?.find((member) => member.userId === session?.user.id);

  function closeColorModal() {
    setColorModalOpen(false);
    setColor.reset();
  }

  function handleSelectColor(color: PlayerColor) {
    setColor.mutate(color, { onSuccess: closeColorModal });
  }

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
            members.map((member, index) => {
              const isCurrentUser = member.userId === session?.user.id;
              return (
                <View
                  key={member.userId}
                  className={index > 0 ? 'border-t border-line' : undefined}
                >
                  <MemberRow
                    member={member}
                    isCurrentUser={isCurrentUser}
                    onPress={() => setColorModalOpen(true)}
                  />
                </View>
              );
            })
          )}
        </View>
      </View>

      {me ? (
        <ColorPickerModal
          visible={colorModalOpen}
          currentColor={me.color}
          takenColors={
            new Set(
              (members ?? [])
                .filter((member) => member.userId !== me.userId)
                .map((member) => member.color),
            )
          }
          isPending={setColor.isPending}
          errorMessage={setColor.isError ? colorErrorMessage(setColor.error) : null}
          onSelect={handleSelectColor}
          onClose={closeColorModal}
        />
      ) : null}
    </ScrollView>
  );
}
