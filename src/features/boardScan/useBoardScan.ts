import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { randomUUID } from 'expo-crypto';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { useEffect, useId } from 'react';

import type { BoardState, Layout, PieceColor } from '@/features/boardScan/catan';
import { supabase } from '@/lib/supabase';
import type { Tables } from '@/types/database';

const BUCKET = 'board-scans';
/** Claude Opus' image limit; up to this size it points at pixels 1:1, so more is never needed. */
const MAX_IMAGE_EDGE = 2576;
/** The pieces are read from a 2×2 grid of crops, each this share of the photo per side, so they
 *  overlap in the middle and every piece is seen at full resolution. */
const CROP_SHARE = 0.58;
/** A reading takes well under a minute; one still running after this died and may be restarted
 *  (the same window as `begin_board_scan`). */
export const BOARD_SCAN_STALE_MS = 5 * 60 * 1000;

export const MAX_BOARD_SCAN_ATTEMPTS = 3;
/** How long a reading usually takes once the photos are up (measured 30–35 s; see the edge
 *  function's eval/README.md). Drives the waiting bar; nothing depends on it being exact. */
export const EXPECTED_ANALYSIS_MS = 35_000;

export type BoardScan = Omit<
  Tables<'board_scans'>,
  'state' | 'color_players' | 'layout' | 'status'
> & {
  layout: Layout;
  status: 'analyzing' | 'ready' | 'failed';
  state: BoardState | null;
  color_players: Partial<Record<PieceColor, string>>;
};

export const boardScanKeys = {
  detail: (sessionId: string) => ['sessions', 'board-scan', sessionId] as const,
};

/**
 * The session's board scan, or null when nobody has analysed the board yet. Follows the row over
 * Realtime, so a running analysis turns into the board on its own.
 */
export function useBoardScan(sessionId: string) {
  const queryClient = useQueryClient();
  const queryKey = boardScanKeys.detail(sessionId);
  // One topic per hook instance: the session screen's scan section and the scan screen both watch it.
  const channelId = useId().replace(/:/g, '');

  useEffect(() => {
    const channel = supabase
      .channel(`board-scan-${sessionId}-${channelId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'board_scans',
          filter: `session_id=eq.${sessionId}`,
        },
        () => void queryClient.invalidateQueries({ queryKey: boardScanKeys.detail(sessionId) }),
      )
      .subscribe();
    return () => void supabase.removeChannel(channel);
  }, [sessionId, channelId, queryClient]);

  return useQuery({
    queryKey,
    enabled: sessionId.length > 0,
    queryFn: async (): Promise<BoardScan | null> => {
      const { data, error } = await supabase
        .from('board_scans')
        .select('*')
        .eq('session_id', sessionId)
        .maybeSingle();
      if (error) throw error;
      return data as BoardScan | null;
    },
  });
}

type Rect = { originX: number; originY: number; width: number; height: number };

/** Where an uploaded image sits in the photo; `scale` is image pixels per photo pixel. */
interface UploadedImage {
  path: string;
  x0: number;
  y0: number;
  scale: number;
  width: number;
  height: number;
}

/** Cuts `rect` out of the photo, shrinks it to the model's limit if needed, and uploads it. */
async function uploadPart(uri: string, rect: Rect, path: string): Promise<UploadedImage> {
  const context = ImageManipulator.manipulate(uri).crop(rect);
  if (Math.max(rect.width, rect.height) > MAX_IMAGE_EDGE) {
    context.resize(
      rect.width >= rect.height ? { width: MAX_IMAGE_EDGE } : { height: MAX_IMAGE_EDGE },
    );
  }
  const image = await context.renderAsync();
  const saved = await image.saveAsync({ compress: 0.85, format: SaveFormat.JPEG });
  const body = await (await fetch(saved.uri)).arrayBuffer();
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, body, { contentType: 'image/jpeg' });
  if (error) throw new Error('Uploaden mislukt. Probeer het opnieuw.');
  return {
    path,
    x0: rect.originX,
    y0: rect.originY,
    scale: Math.min(1, saved.width / rect.width),
    width: saved.width,
    height: saved.height,
  };
}

/**
 * Uploads a board photo at full quality — the whole board, plus a 2×2 grid of overlapping crops at
 * the photo's own resolution — and starts the analysis. Never fed the 1600px session-photo copy:
 * telling a settlement from a city needs every pixel. The edge function decides who may do this
 * and how often.
 */
export function useStartBoardScan(sessionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (photo: {
      uri: string;
      /** Called as the photo's parts are prepared and uploaded: `done` of `total`. */
      onProgress?: (done: number, total: number) => void;
    }) => {
      // The decoded image is the truth about its size: a picker's numbers can predate rotation.
      const original = await ImageManipulator.manipulate(photo.uri).renderAsync();
      const { width, height } = original;
      const cropW = Math.round(width * CROP_SHARE);
      const cropH = Math.round(height * CROP_SHARE);
      const rects: Rect[] = [
        { originX: 0, originY: 0, width, height },
        ...[0, height - cropH].flatMap((originY) =>
          [0, width - cropW].map((originX) => ({ originX, originY, width: cropW, height: cropH })),
        ),
      ];

      const folder = `${sessionId}/${randomUUID()}`;
      const images: UploadedImage[] = [];
      photo.onProgress?.(0, rects.length);
      for (const [i, rect] of rects.entries()) {
        images.push(await uploadPart(photo.uri, rect, `${folder}/${i}.jpg`));
        photo.onProgress?.(i + 1, rects.length);
      }

      const { error } = await supabase.functions.invoke('analyze-board', {
        body: { session_id: sessionId, images },
      });
      if (error) {
        // The function answers with a Dutch `error` message; surface that, not the generic one.
        const context = (error as { context?: Response }).context;
        const message = await context
          ?.json()
          .then((payload: { error?: string }) => payload.error)
          .catch(() => undefined);
        throw new Error(message ?? 'Er ging iets mis. Probeer het opnieuw.');
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: boardScanKeys.detail(sessionId) });
    },
  });
}

/** Saves a correction to the board, or the colour → player labelling. Participants only (RLS). */
export function useUpdateBoardScan(sessionId: string) {
  const queryClient = useQueryClient();
  const queryKey = boardScanKeys.detail(sessionId);

  return useMutation({
    mutationFn: async (input: {
      userId: string;
      state?: BoardState;
      colorPlayers?: Partial<Record<PieceColor, string>>;
    }) => {
      const { data, error } = await supabase
        .from('board_scans')
        .update({
          updated_by: input.userId,
          ...(input.state ? { state: input.state as never } : {}),
          ...(input.colorPlayers ? { color_players: input.colorPlayers } : {}),
        })
        .eq('session_id', sessionId)
        .select('session_id');
      if (error) throw error;
      if (data.length === 0)
        throw new Error('Alleen spelers van dit potje kunnen het bord aanpassen.');
    },
    // Optimistic: corrections are made tap by tap and should feel instant.
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<BoardScan | null>(queryKey);
      if (previous) {
        queryClient.setQueryData<BoardScan | null>(queryKey, {
          ...previous,
          ...(input.state ? { state: input.state } : {}),
          ...(input.colorPlayers ? { color_players: input.colorPlayers } : {}),
        });
      }
      return { previous };
    },
    onError: (_error, _input, context) => {
      if (context?.previous !== undefined) queryClient.setQueryData(queryKey, context.previous);
    },
    onSettled: () => void queryClient.invalidateQueries({ queryKey }),
  });
}
