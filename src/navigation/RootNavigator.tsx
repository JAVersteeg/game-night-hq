import { ActivityIndicator, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { useAuth } from '@/features/auth/context/AuthContext';
import { useProfile } from '@/features/auth/hooks/useProfile';
import { DisplayNameScreen } from '@/features/auth/screens/DisplayNameScreen';
import { AppStack } from '@/navigation/AppStack';

function FullScreenLoader() {
  return (
    <View className="flex-1 items-center justify-center bg-surface">
      <ActivityIndicator />
    </View>
  );
}

/**
 * There is no signed-out branch. Anonymous sign-in happens automatically in AuthProvider, so the
 * only three states are: still bootstrapping, signed in but not yet named, and ready.
 */
export function RootNavigator() {
  const { session, isLoading, error, retry } = useAuth();
  const { data: profile, isPending: isProfilePending, isError: isProfileError } = useProfile();

  // Sign-in is the one failure the user cannot route around — without an identity there is no app,
  // so it gets a real retry rather than an empty screen.
  //
  // The copy deliberately does not blame the network: a rejected sign-in is just as likely to be a
  // server-side configuration problem (anonymous auth switched off, say) as a lost connection, and
  // telling someone to check their wifi when the wifi is fine sends them down the wrong path. The
  // underlying message is shown verbatim underneath so the real cause is never hidden.
  if (error) {
    return (
      <SafeAreaView className="flex-1 bg-surface" edges={['top', 'bottom']}>
        <View className="flex-1 justify-center gap-4 px-6">
          <Text className="text-2xl font-bold text-ink">Opstarten mislukt</Text>
          <Text className="text-base text-ink-muted">
            Er ging iets mis bij het instellen van je profiel. Ben je offline? Maak opnieuw
            verbinding en probeer het nogmaals.
          </Text>
          {/* Deliberately untranslated: this comes back from Supabase in English. Mistranslating a
              server error would make it unsearchable and harder to diagnose. */}
          {error.message ? (
            <Text className="text-sm text-ink-subtle" selectable>
              {error.message}
            </Text>
          ) : null}
          <Button label="Opnieuw proberen" onPress={retry} />
        </View>
      </SafeAreaView>
    );
  }

  if (isLoading || !session) return <FullScreenLoader />;

  // A failed profile read is treated as "not named yet": the display-name screen upserts, so a
  // user who does have a profile simply re-confirms it rather than being stuck behind an error.
  if (isProfilePending) return <FullScreenLoader />;
  if (isProfileError || !profile) return <DisplayNameScreen />;

  return <AppStack />;
}
