import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { Button } from '@/components/Button';
import { SectionLabel } from '@/components/SectionLabel';
import { Text } from '@/components/Text';
import { AnalysisProgress } from '@/features/boardScan/components/AnalysisProgress';
import { BoardView } from '@/features/boardScan/components/BoardView';
import { boardAsShown, recordedScores } from '@/features/boardScan/catan';
import { useBoardScan } from '@/features/boardScan/useBoardScan';
import { useSessionParticipants } from '@/features/sessions/hooks/useSessionParticipants';
import { useSessionScores } from '@/features/sessions/hooks/useSessionScores';
import type { AppStackParamList } from '@/navigation/types';

/**
 * A finished Catan session's digital board, on the session screen. Once analysed the board itself
 * is shown — exactly as on the board screen, which a tap opens; before that, a way in.
 */
export function BoardScanSection({ sessionId }: { sessionId: string }) {
  const navigation = useNavigation<NavigationProp<AppStackParamList>>();
  const { data: scan } = useBoardScan(sessionId);
  const { data: participantIds } = useSessionParticipants(sessionId);
  const { data: scoresByUser } = useSessionScores(sessionId);
  const [width, setWidth] = useState(0);
  const open = () => navigation.navigate('BoardScan', { sessionId });

  const shown = useMemo(() => {
    if (scan?.status !== 'ready' || !scan.state) return null;
    const recorded = recordedScores(participantIds ?? [], scoresByUser ?? {});
    return boardAsShown(scan.layout, scan.state, scan.color_players, recorded).shown;
  }, [scan, participantIds, scoresByUser]);

  if (scan && shown) {
    return (
      <View>
        {/* The same text chevron as the group list rows: the header opens the board screen too. */}
        <Pressable
          onPress={open}
          accessibilityRole="button"
          accessibilityLabel="Bord bekijken"
          className="flex-row items-center gap-1.5 self-start active:opacity-70"
        >
          <SectionLabel>Bord</SectionLabel>
          <Text className="text-base leading-none text-ink-subtle">›</Text>
        </Pressable>
        <Pressable
          onPress={open}
          onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
          accessibilityRole="button"
          accessibilityLabel="Bord bekijken"
          className="mt-2 overflow-hidden rounded-2xl active:opacity-80"
          testID="session-board-scan"
        >
          {width > 0 ? <BoardView layout={scan.layout} state={shown} width={width} /> : null}
        </Pressable>
      </View>
    );
  }

  const status = !scan
    ? 'Maak het eindbord digitaal met een foto.'
    : scan.status === 'analyzing'
      ? 'Het bord wordt geanalyseerd…'
      : 'De analyse is mislukt.';

  return (
    <View>
      <SectionLabel>Bord</SectionLabel>
      <View className="mt-2 gap-3">
        <Text className="text-sm text-ink-muted">{status}</Text>
        {scan?.status === 'analyzing' ? <AnalysisProgress startedAt={scan.updated_at} /> : null}
        <Button
          label={scan ? 'Open' : 'Analyseer bord'}
          variant="secondary"
          onPress={open}
          testID="session-board-scan"
        />
      </View>
    </View>
  );
}
