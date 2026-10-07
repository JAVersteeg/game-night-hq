import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { Text } from '@/components/Text';
import { EXPECTED_ANALYSIS_MS } from '@/features/boardScan/useBoardScan';

/** The bar's share for uploading the photo; the reading itself fills the rest. */
const UPLOAD_SHARE = 0.2;

/** A thin bar like the score bars, filled `fraction` (0..1). */
function ProgressBar({ fraction }: { fraction: number }) {
  return (
    <View className="h-2 w-full overflow-hidden rounded-full bg-surface-sunken">
      <View
        className="h-full rounded-full bg-accent"
        style={{ width: `${Math.round(Math.min(1, Math.max(0, fraction)) * 100)}%` }}
      />
    </View>
  );
}

/** Uploading the photo: real progress, one step per image sent. */
export function UploadProgress({ done, total }: { done: number; total: number }) {
  return (
    <View className="gap-2">
      <ProgressBar fraction={(UPLOAD_SHARE * done) / Math.max(1, total)} />
      <Text className="text-sm text-ink-muted">Foto wordt voorbereid en verstuurd…</Text>
    </View>
  );
}

/**
 * Reading the board: the model reports no progress, so the bar runs on time — straight to 90% at
 * the expected duration, then creeping on towards (never reaching) the end, so a slow run never
 * looks finished. Starts where the upload left off.
 */
export function AnalysisProgress({ startedAt }: { startedAt: string }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, []);

  // `startedAt` is the server's clock; a phone a few seconds off only shifts the bar a little.
  const elapsed = Math.max(0, now - new Date(startedAt).getTime());
  const t = elapsed / EXPECTED_ANALYSIS_MS;
  const reading = t < 1 ? 0.9 * t : 0.9 + 0.09 * (1 - Math.exp(-(t - 1)));
  const remaining = Math.ceil((EXPECTED_ANALYSIS_MS - elapsed) / 1000);

  return (
    <View className="w-full gap-2">
      <ProgressBar fraction={UPLOAD_SHARE + (1 - UPLOAD_SHARE) * reading} />
      <Text className="text-center text-sm text-ink-muted">
        {remaining > 0 ? `Nog ongeveer ${remaining} seconden` : 'Bijna klaar…'}
      </Text>
    </View>
  );
}
