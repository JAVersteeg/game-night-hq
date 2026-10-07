import { useNavigation, type NavigationProp } from '@react-navigation/native';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

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

const PRESS_DELAY_MS = 100;
const PRESS_IN_MS = 120;
const PRESS_OUT_MS = 200;

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
  // 0 = at rest, 1 = fully pressed: the board eases down a touch rather than snapping to a dimmer
  // colour, which also keeps any brief press (a tap or a cancelled swipe) from reading as a flash.
  const pressed = useSharedValue(0);
  const pressStyle = useAnimatedStyle(() => ({
    opacity: 1 - 0.15 * pressed.value,
    transform: [{ scale: 1 - 0.02 * pressed.value }],
  }));
  const open =() => navigation.navigate('BoardScan', { sessionId });

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
          onPressIn={() => {
            pressed.value = withTiming(1, { duration: PRESS_IN_MS });
          }}
          onPressOut={() => {
            pressed.value = withTiming(0, { duration: PRESS_OUT_MS });
          }}
          onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
          accessibilityRole="button"
          accessibilityLabel="Bord bekijken"
          // A swipe on the board is meant to scroll the page: the press only registers once the
          // finger has rested this long, so a swipe is handed to the scroll view first and never
          // flashes the feedback. A quicker tap still gets it, at release.
          unstable_pressDelay={PRESS_DELAY_MS}
          className="mt-2 overflow-hidden rounded-2xl"
          testID="session-board-scan"
        >
          <Animated.View style={pressStyle}>
            {width > 0 ? <BoardView layout={scan.layout} state={shown} width={width} /> : null}
          </Animated.View>
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
