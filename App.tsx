import 'react-native-gesture-handler';
import './global.css';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { useFonts } from 'expo-font';
import { DarkTheme, NavigationContainer } from '@react-navigation/native';
import { QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import { Text, TextInput, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { enableScreens } from 'react-native-screens';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from '@/features/auth/context/AuthContext';
import { installGlobalErrorLogger } from '@/lib/logError';
import { queryClient } from '@/lib/queryClient';
import { theme } from '@/lib/theme';
import { RootNavigator } from '@/navigation/RootNavigator';

// React Navigation paints this behind every screen during transitions and on any native surface
// (like the stack header) a screen doesn't otherwise cover — has to match --surface or a light
// flash shows through on push/pop.
const navigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: theme.surface,
    card: theme.surface,
    border: theme.line,
    text: theme.ink,
    primary: theme.ink,
  },
};

enableScreens();

installGlobalErrorLogger();

// Set Inter as the global default font for every Text/TextInput.
const TextAny = Text as unknown as { defaultProps?: { style?: unknown } };
TextAny.defaultProps = TextAny.defaultProps ?? {};
TextAny.defaultProps.style = [{ fontFamily: 'Inter_500Medium' }, TextAny.defaultProps.style];

const TextInputAny = TextInput as unknown as { defaultProps?: { style?: unknown } };
TextInputAny.defaultProps = TextInputAny.defaultProps ?? {};
TextInputAny.defaultProps.style = [
  { fontFamily: 'Inter_500Medium' },
  TextInputAny.defaultProps.style,
];

export default function App() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  if (!fontsLoaded) {
    return <View className="flex-1 bg-surface" />;
  }

  return (
    // Every `GestureDetector` needs this as an ancestor.
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        {/* Android draws edge-to-edge, so both system bars overlay the app and the keyboard
            height has to be measured against them. */}
        <KeyboardProvider statusBarTranslucent navigationBarTranslucent>
          <NavigationContainer theme={navigationTheme}>
            {/* QueryClientProvider wraps AuthProvider: RootNavigator reads the profile via React
                Query to decide whether onboarding is done, so the cache has to exist first. */}
            <QueryClientProvider client={queryClient}>
              <AuthProvider>
                <RootNavigator />
                <StatusBar style="light" />
              </AuthProvider>
            </QueryClientProvider>
          </NavigationContainer>
        </KeyboardProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
