import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { CreateGroupScreen } from '@/features/groups/screens/CreateGroupScreen';
import { GroupDashboardScreen } from '@/features/groups/screens/GroupDashboardScreen';
import { GroupListScreen } from '@/features/groups/screens/GroupListScreen';
import { GroupSettingsScreen } from '@/features/groups/screens/GroupSettingsScreen';
import { JoinGroupScreen } from '@/features/groups/screens/JoinGroupScreen';
import { ProfileScreen } from '@/features/profile/screens/ProfileScreen';
import { theme } from '@/lib/theme';
import type { AppStackParamList } from '@/navigation/types';

const Stack = createNativeStackNavigator<AppStackParamList>();

// Every screen except the group list opts back into the native header: they all need a back
// affordance, and the platform one already handles the swipe gesture and title truncation.
const HEADER_OPTIONS = {
  headerShown: true,
  headerBackTitle: 'Terug',
  headerStyle: { backgroundColor: theme.surface },
  headerShadowVisible: false,
  headerTintColor: theme.ink,
  headerTitleStyle: { fontFamily: 'Inter_600SemiBold', color: theme.ink },
} as const;

export function AppStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="GroupList" component={GroupListScreen} />
      {/* Create and join are pushed, not presented as modals: both replace themselves with the
          group dashboard on success, so "back" has to land on the group list rather than on a form
          that has already been submitted. */}
      <Stack.Screen
        name="CreateGroup"
        component={CreateGroupScreen}
        options={{ ...HEADER_OPTIONS, title: 'Nieuwe groep' }}
      />
      <Stack.Screen
        name="JoinGroup"
        component={JoinGroupScreen}
        options={{ ...HEADER_OPTIONS, title: 'Groep joinen' }}
      />
      {/* Title and the settings (gear) header button are both set by the screen itself once it has
          the group's name and id. */}
      <Stack.Screen
        name="GroupDashboard"
        component={GroupDashboardScreen}
        options={HEADER_OPTIONS}
      />
      <Stack.Screen
        name="GroupSettings"
        component={GroupSettingsScreen}
        options={{ ...HEADER_OPTIONS, title: 'Instellingen' }}
      />
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ ...HEADER_OPTIONS, title: 'Profiel' }}
      />
    </Stack.Navigator>
  );
}
