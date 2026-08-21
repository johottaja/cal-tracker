import { Stack } from 'expo-router';
import { useColorScheme } from 'react-native';

export default function ModalsLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <Stack
      screenOptions={{
        headerBackTitle: 'Back',
        headerShadowVisible: false,
        headerStyle: { backgroundColor: isDark ? '#0f1413' : '#f3eee4' },
        headerTintColor: isDark ? '#f4f0e6' : '#182022',
        contentStyle: { backgroundColor: isDark ? '#0f1413' : '#f3eee4' },
        headerTitleStyle: { fontWeight: '700' },
      }}>
      <Stack.Screen name="capture-photo" options={{ title: 'Meal photo' }} />
      <Stack.Screen name="text-estimate" options={{ title: 'Text estimate' }} />
      <Stack.Screen
        name="review-entry"
        options={{ title: 'Review', gestureEnabled: false, fullScreenGestureEnabled: false }}
      />
      <Stack.Screen name="manual-entry" options={{ title: 'Entry' }} />
      <Stack.Screen name="preset-editor" options={{ title: 'Preset' }} />
    </Stack>
  );
}
