// Starts a board analysis for a finished Catan session. The app uploads the photo as an overview
// plus full-resolution crops and posts { session_id, images }; this checks the caller took part,
// claims one of the session's 3 attempts, answers right away and reads the board in the
// background (~35 s, well inside the edge runtime's 150 s). The app follows the `board_scans` row
// over Realtime until it turns `ready` or `failed`.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2.117.2';

import { analyzeBoard, MAX_IMAGE_EDGE, type BoardImage, type Layout } from './boardVision.ts';

const BUCKET = 'board-scans';
const MAX_IMAGES = 10;
const SIGNED_URL_TTL_S = 10 * 60;

function secretKey(): string {
  const keys = Deno.env.get('SUPABASE_SECRET_KEYS');
  if (keys) return JSON.parse(keys)['default'];
  return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
}

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

/** Same rule as the app's `gameKeyForTemplate`: the cover key, else an exact name match. */
function isCatan(template: { name: string; cover_key: string | null }): boolean {
  if (template.cover_key) return template.cover_key === 'catan';
  return template.name.trim().toLowerCase() === 'catan';
}

interface UploadedImage {
  path: string;
  x0: number;
  y0: number;
  scale: number;
  width: number;
  height: number;
}

/** The overview first, then the crops; each with where it sits in the photo. */
function parseImages(value: unknown, sessionId: string): UploadedImage[] | null {
  if (!Array.isArray(value) || value.length < 2 || value.length > MAX_IMAGES) return null;
  const isAmount = (n: unknown): n is number =>
    typeof n === 'number' && Number.isFinite(n) && n >= 0;
  const images = value as Partial<UploadedImage>[];
  const valid = images.every(
    (img) =>
      typeof img.path === 'string' &&
      img.path.startsWith(`${sessionId}/`) &&
      img.path.endsWith('.jpg') &&
      isAmount(img.x0) &&
      isAmount(img.y0) &&
      isAmount(img.scale) &&
      img.scale > 0 &&
      img.scale <= 1 &&
      isAmount(img.width) &&
      isAmount(img.height) &&
      img.width >= 1 &&
      img.height >= 1 &&
      Math.max(img.width, img.height) <= MAX_IMAGE_EDGE,
  );
  return valid ? (images as UploadedImage[]) : null;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' });

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) return json(500, { error: 'Bordanalyse is nog niet ingesteld.' });

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, secretKey(), {
    auth: { persistSession: false },
  });
  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  const { data: auth } = token ? await admin.auth.getUser(token) : { data: { user: null } };
  const userId = auth.user?.id;
  if (!userId) return json(401, { error: 'Niet ingelogd.' });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: 'Ongeldig verzoek.' });
  }
  const sessionId = typeof body.session_id === 'string' ? body.session_id : '';
  const images = sessionId ? parseImages(body.images, sessionId) : null;
  if (!images) return json(400, { error: 'Ongeldig verzoek.' });

  const { data: session } = await admin
    .from('sessions')
    .select('id, game_templates(name, cover_key), session_participants(user_id)')
    .eq('id', sessionId)
    .maybeSingle();
  if (!session) return json(404, { error: 'Sessie niet gevonden.' });

  const participants = (session.session_participants ?? []) as { user_id: string }[];
  if (!participants.some((p) => p.user_id === userId)) {
    return json(403, { error: 'Alleen spelers van dit potje kunnen het bord analyseren.' });
  }
  const template = session.game_templates as unknown as {
    name: string;
    cover_key: string | null;
  } | null;
  if (!template || !isCatan(template)) {
    return json(400, { error: 'Bordanalyse werkt alleen voor Catan.' });
  }
  const layout: Layout = participants.length <= 4 ? 'standard' : 'extended';
  const paths = images.map((img) => img.path);

  const { data: previous } = await admin
    .from('board_scans')
    .select('image_paths')
    .eq('session_id', sessionId)
    .maybeSingle();

  const { data: claimed, error: claimError } = await admin.rpc('begin_board_scan', {
    p_session_id: sessionId,
    p_user_id: userId,
    p_layout: layout,
    p_image_paths: paths,
  });
  if (claimError) return json(500, { error: 'Analyse kon niet starten.' });
  const scan = (claimed as { attempts: number }[] | null)?.[0];
  if (!scan) {
    return json(429, {
      error: 'Dit bord wordt al geanalyseerd, of het maximum van 3 analyses is bereikt.',
    });
  }

  // A reading that fails isn't the player's doing, so it gives the attempt back.
  const fail = (error: string) =>
    admin
      .from('board_scans')
      .update({ status: 'failed', error, attempts: Math.max(0, scan.attempts - 1) })
      .eq('session_id', sessionId);

  const { data: signed, error: signError } = await admin.storage
    .from(BUCKET)
    .createSignedUrls(paths, SIGNED_URL_TTL_S);
  if (signError || !signed || signed.some((s) => !s.signedUrl)) {
    await fail('Foto’s niet gevonden.');
    return json(400, { error: 'Foto’s niet gevonden.' });
  }
  const [overview, ...crops] = images.map((img, i): BoardImage => ({
    source: { url: signed[i].signedUrl! },
    frame: { x0: img.x0, y0: img.y0, scale: img.scale, width: img.width, height: img.height },
  }));

  const run = async () => {
    try {
      const result = await analyzeBoard({ apiKey, layout, overview, crops });
      await admin
        .from('board_scans')
        .update({
          status: 'ready',
          detected_state: result.state,
          state: result.state,
          model: result.model,
          usage: result.usage,
          error: null,
        })
        .eq('session_id', sessionId);
    } catch (error) {
      console.error('analyze-board failed', error);
      await fail(String(error instanceof Error ? error.message : error).slice(0, 500));
    }

    const stale = ((previous?.image_paths ?? []) as string[]).filter((p) => !paths.includes(p));
    if (stale.length > 0) await admin.storage.from(BUCKET).remove(stale);
  };
  EdgeRuntime.waitUntil(run());

  return json(202, { status: 'analyzing', attempts: scan.attempts });
});
