import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { randomUUID } from 'expo-crypto';
import { File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as MediaLibrary from 'expo-media-library';
import { useEffect } from 'react';

import { supabase } from '@/lib/supabase';
import type { Tables } from '@/types/database';

export const SESSION_PHOTOS_BUCKET = 'session-photos';

/** Signed URLs live this long; the query goes stale well before, so a shown URL never expires. */
const SIGNED_URL_TTL_S = 60 * 60;
const PHOTOS_STALE_MS = 50 * 60 * 1000;
/** Long edge after resizing — plenty for a phone screen, and a few hundred KB instead of MBs. */
const MAX_EDGE_PX = 1600;

export type SessionPhoto = Tables<'session_photos'> & { url: string | null };

export const sessionPhotoKeys = {
  detail: (sessionId: string) => ['sessions', 'photos', sessionId] as const,
};

/**
 * Photos attached to a session, oldest first, each with a signed URL for display. Any group member
 * can add one at any time; only the uploader can remove theirs, and only while the session is live
 * or within the 2-hour grace window after completion — enforced by RLS on both the table and the
 * private `session-photos` bucket.
 */
export function useSessionPhotos(sessionId: string) {
  const queryClient = useQueryClient();
  const queryKey = sessionPhotoKeys.detail(sessionId);

  useEffect(() => {
    const channel = supabase
      .channel(`session-photos-${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'session_photos',
          filter: `session_id=eq.${sessionId}`,
        },
        () => void queryClient.invalidateQueries({ queryKey: sessionPhotoKeys.detail(sessionId) }),
      )
      .subscribe();

    return () => void supabase.removeChannel(channel);
    // Not `queryKey`: it's a fresh array every render and would resubscribe on each one.
  }, [sessionId, queryClient]);

  return useQuery({
    queryKey,
    enabled: sessionId.length > 0,
    staleTime: PHOTOS_STALE_MS,
    queryFn: async (): Promise<SessionPhoto[]> => {
      const { data, error } = await supabase
        .from('session_photos')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      if (data.length === 0) return [];

      const { data: signed, error: signError } = await supabase.storage
        .from(SESSION_PHOTOS_BUCKET)
        .createSignedUrls(
          data.map((photo) => photo.storage_path),
          SIGNED_URL_TTL_S,
        );

      if (signError) throw signError;
      const urlByPath = new Map(signed.map((entry) => [entry.path, entry.signedUrl]));
      return data.map((photo) => ({ ...photo, url: urlByPath.get(photo.storage_path) ?? null }));
    },
  });
}

/** Shrinks a picked image to `MAX_EDGE_PX` on its long edge and re-encodes it as JPEG. */
async function compressPhoto(uri: string, width: number, height: number): Promise<string> {
  const context = ImageManipulator.manipulate(uri);
  if (Math.max(width, height) > MAX_EDGE_PX) {
    context.resize(width >= height ? { width: MAX_EDGE_PX } : { height: MAX_EDGE_PX });
  }
  const image = await context.renderAsync();
  const result = await image.saveAsync({ compress: 0.7, format: SaveFormat.JPEG });
  return result.uri;
}

export function useAddSessionPhoto(sessionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      uploaderId: string;
      uri: string;
      width: number;
      height: number;
    }) => {
      const compressedUri = await compressPhoto(input.uri, input.width, input.height);
      const body = await (await fetch(compressedUri)).arrayBuffer();
      const path = `${sessionId}/${randomUUID()}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from(SESSION_PHOTOS_BUCKET)
        .upload(path, body, { contentType: 'image/jpeg' });
      if (uploadError) throw uploadError;

      const { error } = await supabase.from('session_photos').insert({
        session_id: sessionId,
        uploader_id: input.uploaderId,
        storage_path: path,
      });

      if (error) {
        // No row means nothing would ever list (or clean up) the file, so don't leave it behind.
        await supabase.storage.from(SESSION_PHOTOS_BUCKET).remove([path]);
        throw error;
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: sessionPhotoKeys.detail(sessionId) });
    },
  });
}

export function useDeleteSessionPhoto(sessionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (photo: Pick<SessionPhoto, 'id' | 'storage_path'>) => {
      // The row first: its RLS is the real gate, and a row without a file just shows no image,
      // whereas a file without a row would be invisible and never cleaned up. `select` makes a
      // policy-filtered delete (0 rows) surface as an error rather than a silent no-op.
      const { data, error } = await supabase
        .from('session_photos')
        .delete()
        .eq('id', photo.id)
        .select('id');
      if (error) throw error;
      if (data.length === 0) throw new Error('Deze foto kan niet meer verwijderd worden.');

      await supabase.storage.from(SESSION_PHOTOS_BUCKET).remove([photo.storage_path]);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: sessionPhotoKeys.detail(sessionId) });
    },
  });
}

export class PhotoLibraryPermissionError extends Error {}

/**
 * Saves a session photo to the device's photo library. Open to everyone who can see the photo —
 * reading it is all the signed URL needs. Downloads into the cache first, since the library only
 * accepts a local file.
 */
export function useSavePhotoToLibrary() {
  return useMutation({
    mutationFn: async (photo: Pick<SessionPhoto, 'id' | 'url'>) => {
      if (!photo.url) throw new Error('Deze foto is niet beschikbaar.');

      // Write-only, photos only: saving needs nothing more, and asking for the default set would
      // also request audio/video access on Android 13+.
      const permission = await MediaLibrary.requestPermissionsAsync(true, ['photo']);
      if (!permission.granted) throw new PhotoLibraryPermissionError();

      const file = await File.downloadFileAsync(
        photo.url,
        new File(Paths.cache, `${photo.id}.jpg`),
        { idempotent: true },
      );
      // `Asset.create`, not `saveToLibraryAsync`: since SDK 57 the latter is a stub that throws at
      // runtime while still type-checking.
      try {
        await MediaLibrary.Asset.create(file.uri);
      } finally {
        // Cleanup only — never let it mask the save's own outcome, and the library may have moved
        // the file rather than copied it.
        try {
          if (file.exists) file.delete();
        } catch {}
      }
    },
  });
}
