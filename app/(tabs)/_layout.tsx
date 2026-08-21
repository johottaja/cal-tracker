import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useColorScheme } from 'react-native';

const screens = [
  { name: 'index', title: 'Home', icon: 'home-outline', iconFocused: 'home' },
  { name: 'log', title: 'Log', icon: 'add-circle-outline', iconFocused: 'add-circle' },
  { name: 'history', title: 'History', icon: 'stats-chart-outline', iconFocused: 'stats-chart' },
  { name: 'settings', title: 'Settings', icon: 'settings-outline', iconFocused: 'settings' },
] as const;

export default function TabsLayout() {
  const isDark = useColorScheme() === 'dark';
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: isDark ? '#7fbe9b' : '#2f6b4f',
        tabBarInactiveTintColor: isDark ? '#c5ceca' : '#4a5557',
        tabBarStyle: {
          borderTopColor: isDark ? '#3a4743' : '#d5d0c4',
          backgroundColor: isDark ? '#141b19' : '#fffaf2',
          height: 84,
          paddingTop: 6,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
      }}>
      {screens.map((screen) => (
        <Tabs.Screen
          key={screen.name}
          name={screen.name}
          options={{
            title: screen.title,
            tabBarAccessibilityLabel: `${screen.title} tab`,
            tabBarIcon: ({ color, focused, size }) => (
              <Ionicons
                name={focused ? screen.iconFocused : screen.icon}
                color={color}
                size={size}
              />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
