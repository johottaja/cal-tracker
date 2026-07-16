import { LinearGradient } from 'expo-linear-gradient';
import { Tabs } from 'expo-router';
import { StyleSheet, Text } from 'react-native';

import { useAppTheme } from '@/constants/theme';

const icons = {
  index: '⌂',
  log: '＋',
  history: '⌁',
  settings: '⚙',
} as const;

export default function TabsLayout() {
  const theme = useAppTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.muted,
        tabBarStyle: {
          borderTopColor: theme.border,
          height: 84,
          paddingTop: 7,
          backgroundColor: 'transparent',
        },
        tabBarBackground: () => (
          <LinearGradient
            colors={theme.gradients.tabBar}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
        ),
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
      }}>
      {Object.entries(icons).map(([name, icon]) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title: name === 'index' ? 'Home' : `${name[0]?.toUpperCase()}${name.slice(1)}`,
            tabBarAccessibilityLabel: `${name === 'index' ? 'Home' : name} tab`,
            tabBarIcon: ({ color, focused }) => (
              <Text style={[styles.icon, { color }, focused && styles.focused]}>{icon}</Text>
            ),
          }}
        />
      ))}
    </Tabs>
  );
}

const styles = StyleSheet.create({
  icon: { fontSize: 22, lineHeight: 25, fontWeight: '700' },
  focused: { transform: [{ scale: 1.05 }] },
});
