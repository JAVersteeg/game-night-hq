import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { GroupListScreen } from '@/features/groups/screens/GroupListScreen';
import { ProfileScreen } from '@/features/profile/screens/ProfileScreen';
import type { AppStackParamList } from '@/navigation/types';

const Stack = createNativeStackNavigator<AppStackParamList>();

export function AppStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="GroupList" component={GroupListScreen} />
      {/* Profile opts back into the native header: it needs a back affordance, and the platform
          one already handles the swipe gesture and title truncation correctly. */}
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          headerShown: true,
          title: 'Profiel',
          headerBackTitle: 'Terug',
          headerTitleStyle: { fontFamily: 'Inter_600SemiBold' },
        }}
      />
    </Stack.Navigator>
  );
}
