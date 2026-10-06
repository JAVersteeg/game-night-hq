import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  View,
  useWindowDimensions,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { CloseIcon } from '@/components/CloseIcon';
import { DownloadIcon } from '@/components/DownloadIcon';
import { SectionLabel } from '@/components/SectionLabel';
import { TrashIcon } from '@/components/TrashIcon';
import { Text } from '@/components/Text';
import {
  PhotoLibraryPermissionError,
  useAddSessionPhoto,
  useDeleteSessionPhoto,
  useSavePhotoToLibrary,
  type SessionPhoto,
} from '@/features/sessions/hooks/useSessionPhotos';
import { theme } from '@/lib/theme';

type PhotoSource = 'camera' | 'library';

/** Photos attached to a session. Any group member can add one at any time, during play or long
 *  after; only the uploader can delete theirs, and only while `canDelete` holds (in progress, or
 *  within the 2-hour grace window after completion) — RLS is the real enforcement, this just hides
 *  the affordance. */
export function SessionPhotosSection({
  sessionId,
  photos,
  authorNameById,
  currentUserId,
  canDelete,
}: {
  sessionId: string;
  photos: SessionPhoto[] | undefined;
  authorNameById: Map<string, string>;
  currentUserId: string | undefined;
  canDelete: boolean;
}) {
  const addPhoto = useAddSessionPhoto(sessionId);
  const deletePhoto = useDeleteSessionPhoto(sessionId);

  const [isSourcePickerVisible, setIsSourcePickerVisible] = useState(false);
  const [viewedPhotoId, setViewedPhotoId] = useState<string | null>(null);
  const [isDeleteConfirmVisible, setIsDeleteConfirmVisible] = useState(false);
  const [pickError, setPickError] = useState<string | null>(null);

  // By id rather than the object itself, so a realtime refresh (or the photo vanishing because
  // someone else deleted it) is reflected in an open viewer.
  const viewedPhoto = photos?.find((photo) => photo.id === viewedPhotoId) ?? null;

  async function pickAndUpload(source: PhotoSource) {
    setIsSourcePickerVisible(false);
    setPickError(null);
    if (!currentUserId) return;

    if (source === 'camera') {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        setPickError('Geen toegang tot de camera. Sta dit toe in je instellingen.');
        return;
      }
    }

    const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 1 };
    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);
    const asset = result.canceled ? undefined : result.assets[0];
    if (!asset) return;

    addPhoto.mutate({
      uploaderId: currentUserId,
      uri: asset.uri,
      width: asset.width,
      height: asset.height,
    });
  }

  function confirmDelete() {
    if (!viewedPhoto || !photos) return;
    // Stay in the viewer on a neighbouring photo — the next one, or the previous one if this was
    // the last — and only close it once there's nothing left to show.
    const index = photos.findIndex((photo) => photo.id === viewedPhoto.id);
    const neighbour = photos[index + 1] ?? photos[index - 1] ?? null;
    deletePhoto.mutate(viewedPhoto, {
      onSuccess: () => {
        setIsDeleteConfirmVisible(false);
        setViewedPhotoId(neighbour?.id ?? null);
      },
    });
  }

  const errorMessage =
    pickError ?? (addPhoto.isError ? 'Uploaden mislukt. Probeer het opnieuw.' : null);

  return (
    <View>
      <SectionLabel>Foto's</SectionLabel>
      <View className="mt-2">
        {!photos || photos.length === 0 ? (
          <Text className="text-sm text-ink-muted">Nog geen foto's van dit potje.</Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row gap-2">
              {photos.map((photo) => (
                <Pressable
                  key={photo.id}
                  onPress={() => setViewedPhotoId(photo.id)}
                  accessibilityRole="imagebutton"
                  accessibilityLabel="Foto bekijken"
                  className="h-24 w-24 overflow-hidden rounded-2xl border border-line bg-surface-sunken active:opacity-70"
                >
                  {photo.url ? (
                    <Image
                      source={{ uri: photo.url }}
                      className="h-full w-full"
                      resizeMode="cover"
                    />
                  ) : null}
                </Pressable>
              ))}
            </View>
          </ScrollView>
        )}
      </View>
      <View className="mt-3 gap-2">
        {errorMessage ? <Text className="text-sm text-danger">{errorMessage}</Text> : null}
        <Button
          label="Foto toevoegen"
          variant="secondary"
          onPress={() => setIsSourcePickerVisible(true)}
          isLoading={addPhoto.isPending}
          disabled={!currentUserId}
          testID="session-photo-add"
        />
      </View>

      {isSourcePickerVisible ? (
        <PhotoSourceModal
          onPick={(source) => void pickAndUpload(source)}
          onCancel={() => setIsSourcePickerVisible(false)}
        />
      ) : null}

      {photos && viewedPhoto ? (
        <PhotoViewerModal
          photos={photos}
          photo={viewedPhoto}
          onChangePhoto={setViewedPhotoId}
          uploaderName={authorNameById.get(viewedPhoto.uploader_id) ?? 'Onbekend'}
          canDelete={canDelete && viewedPhoto.uploader_id === currentUserId}
          onDelete={() => setIsDeleteConfirmVisible(true)}
          onClose={() => setViewedPhotoId(null)}
        >
          {isDeleteConfirmVisible ? (
            <DeletePhotoConfirm
              onCancel={() => setIsDeleteConfirmVisible(false)}
              onConfirm={confirmDelete}
              isPending={deletePhoto.isPending}
              isError={deletePhoto.isError}
            />
          ) : null}
        </PhotoViewerModal>
      ) : null}
    </View>
  );
}

function PhotoSourceModal({
  onPick,
  onCancel,
}: {
  onPick: (source: PhotoSource) => void;
  onCancel: () => void;
}) {
  return (
    <Modal visible transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable
        className="flex-1 items-center justify-center bg-surface-deep/70 px-6"
        onPress={onCancel}
        accessibilityLabel="Sluit"
      >
        <Pressable className="w-full max-w-sm gap-4 rounded-3xl border border-line bg-surface p-6">
          <Text className="text-xl font-bold text-ink">Foto toevoegen</Text>
          <Button
            label="Foto maken"
            onPress={() => onPick('camera')}
            testID="session-photo-camera"
          />
          <Button
            label="Kies uit galerij"
            variant="secondary"
            onPress={() => onPick('library')}
            testID="session-photo-library"
          />
          <Button label="Annuleren" variant="ghost" onPress={onCancel} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/** Full-screen pager over all of a session's photos, opened on `photo`; swiping sideways moves
 *  between them and reports the new one through `onChangePhoto`, so the header and the save/delete
 *  actions always follow what's on screen. The delete confirmation is passed in as `children` and
 *  drawn on top inside this same Modal — stacking a second Modal over an open one is unreliable on
 *  iOS. */
function PhotoViewerModal({
  photos,
  photo,
  onChangePhoto,
  uploaderName,
  canDelete,
  onDelete,
  onClose,
  children,
}: {
  photos: SessionPhoto[];
  photo: SessionPhoto;
  onChangePhoto: (photoId: string) => void;
  uploaderName: string;
  canDelete: boolean;
  onDelete: () => void;
  onClose: () => void;
  children?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const listRef = useRef<FlatList<SessionPhoto>>(null);
  const savePhoto = useSavePhotoToLibrary();
  const { reset: resetSave } = savePhoto;

  const index = Math.max(
    0,
    photos.findIndex((candidate) => candidate.id === photo.id),
  );

  // A realtime add or delete shifts indices under the pager; snap back to the shown photo so it
  // doesn't silently swap for whichever one now sits at the old offset. After a swipe this is a
  // no-op, since the pager is already there.
  useEffect(() => {
    listRef.current?.scrollToIndex({ index, animated: false });
  }, [index, photos.length]);

  useEffect(() => {
    resetSave();
  }, [photo.id, resetSave]);

  function handleSwipeEnd(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const next = photos[Math.round(event.nativeEvent.contentOffset.x / width)];
    if (next && next.id !== photo.id) onChangePhoto(next.id);
  }

  const saveStatus = savePhoto.isSuccess
    ? 'Opgeslagen in je galerij'
    : savePhoto.error instanceof PhotoLibraryPermissionError
      ? 'Geen toegang tot je galerij. Sta dit toe in je instellingen.'
      : savePhoto.isError
        ? 'Opslaan mislukt. Probeer het opnieuw.'
        : null;

  return (
    <Modal visible animationType="fade" onRequestClose={onClose}>
      <View
        className="flex-1 bg-surface-deep"
        style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
      >
        <View className="flex-row items-center gap-3 px-4 py-3">
          {photos.length > 1 ? (
            <Text className="text-sm font-semibold text-ink-muted">
              {index + 1} / {photos.length}
            </Text>
          ) : null}
          <View className="min-w-0 flex-1">
            <Text className="text-base font-semibold text-ink">{uploaderName}</Text>
            <Text className="text-xs text-ink-subtle">
              {format(new Date(photo.created_at), 'd MMM yyyy · HH:mm', { locale: nl })}
            </Text>
          </View>
          {canDelete ? (
            <Pressable
              onPress={onDelete}
              accessibilityRole="button"
              accessibilityLabel="Foto verwijderen"
              hitSlop={8}
              className="p-1 active:opacity-70"
              testID="session-photo-delete"
            >
              <TrashIcon color={theme.danger} />
            </Pressable>
          ) : null}
          <Pressable
            onPress={() => savePhoto.mutate(photo)}
            disabled={!photo.url || savePhoto.isPending}
            accessibilityRole="button"
            accessibilityLabel="Opslaan in galerij"
            hitSlop={8}
            className={`p-1 active:opacity-70 ${photo.url ? '' : 'opacity-40'}`}
            testID="session-photo-save"
          >
            {savePhoto.isPending ? (
              <ActivityIndicator size="small" color={theme.ink} />
            ) : (
              <DownloadIcon color={theme.ink} />
            )}
          </Pressable>
          <Pressable
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Sluit"
            hitSlop={8}
            className="p-1 active:opacity-70"
          >
            <CloseIcon color={theme.ink} />
          </Pressable>
        </View>
        <FlatList
          ref={listRef}
          className="flex-1"
          data={photos}
          keyExtractor={(item) => item.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          initialScrollIndex={index}
          getItemLayout={(_, itemIndex) => ({
            length: width,
            offset: width * itemIndex,
            index: itemIndex,
          })}
          onMomentumScrollEnd={handleSwipeEnd}
          renderItem={({ item }) => (
            <View style={{ width }} className="h-full">
              {item.url ? (
                <Image source={{ uri: item.url }} className="h-full w-full" resizeMode="contain" />
              ) : null}
            </View>
          )}
        />
        {saveStatus ? (
          <View className="px-4 py-3">
            <Text
              className={`text-center text-sm ${savePhoto.isError ? 'text-danger' : 'text-ink-muted'}`}
            >
              {saveStatus}
            </Text>
          </View>
        ) : null}
        {children}
      </View>
    </Modal>
  );
}

/** A photo has no undo once it's gone, so deleting one asks first — same as a note. */
function DeletePhotoConfirm({
  onCancel,
  onConfirm,
  isPending,
  isError,
}: {
  onCancel: () => void;
  onConfirm: () => void;
  isPending: boolean;
  isError: boolean;
}) {
  return (
    <Pressable
      className="absolute inset-0 items-center justify-center bg-surface-deep/70 px-6"
      onPress={onCancel}
      accessibilityLabel="Sluit"
    >
      <Pressable className="w-full max-w-sm gap-4 rounded-3xl border border-line bg-surface p-6">
        <View>
          <Text className="text-xl font-bold text-ink">Foto verwijderen?</Text>
          <Text className="mt-1 text-sm text-ink-muted">
            Deze foto is daarna niet meer terug te halen.
          </Text>
          {isError ? <Text className="mt-2 text-sm text-danger">Verwijderen mislukt.</Text> : null}
        </View>
        <Button
          label="Verwijderen"
          variant="secondary"
          onPress={onConfirm}
          isLoading={isPending}
          testID="delete-photo-confirm"
        />
        <Button label="Annuleren" onPress={onCancel} />
      </Pressable>
    </Pressable>
  );
}
