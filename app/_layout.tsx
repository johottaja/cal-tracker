import '../global.css';

import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState, type PropsWithChildren } from 'react';
import { Text, useColorScheme, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppButton, LoadingView } from '@/components/ui';
import { OnboardingScreen } from '@/features/auth/OnboardingScreen';
import { cn } from '@/lib/cn';
import { AppProvider, useApp } from '@/providers/AppProvider';
import { ThemePreferenceProvider } from '@/providers/ThemePreferenceProvider';

function RootNavigator() {
  const colorScheme = useColorScheme();
  const {
    ready,
    error,
    user,
    goals,
    signInWithEmail,
    signUpWithEmail,
    saveGoals,
    refresh,
  } = useApp();
  const [gateBusy, setGateBusy] = useState(false);
  const [gateError, setGateError] = useState<string | null>(null);

  const runGateAction = async <T,>(action: () => Promise<T>): Promise<T | undefined> => {
    setGateBusy(true);
    setGateError(null);
    try {
      return await action();
    } catch (caught) {
      setGateError(caught instanceof Error ? caught.message : 'Please try again.');
      return undefined;
    } finally {
      setGateBusy(false);
    }
  };

  if (!ready) {
    return <LoadingView label="Preparing your private food log…" />;
  }

  if (error) {
    return (
      <View className="flex-1 items-center justify-center gap-4 bg-background px-6">
        <Text accessibilityRole="alert" className="text-center text-base text-destructive">
          {error}
        </Text>
        <AppButton label="Try again" onPress={() => void refresh()} />
      </View>
    );
  }

  if (!user || !goals) {
    return (
      <OnboardingScreen
        signedIn={Boolean(user)}
        busy={gateBusy}
        error={gateError}
        onEmailSignIn={(email, password) =>
          runGateAction(() => signInWithEmail(email, password))
        }
        onEmailSignUp={(email, password) =>
          runGateAction(() => signUpWithEmail(email, password))
        }
        onSaveGoals={(next) => runGateAction(() => saveGoals(next))}
      />
    );
  }

  const isDark = colorScheme === 'dark';

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerBackTitle: 'Back',
          headerShadowVisible: false,
          headerStyle: { backgroundColor: isDark ? '#0f1413' : '#f3eee4' },
          headerTintColor: isDark ? '#f4f0e6' : '#182022',
          contentStyle: { backgroundColor: isDark ? '#0f1413' : '#f3eee4' },
          headerTitleStyle: { fontWeight: '700' },
        }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="(modals)"
          options={{ presentation: 'modal', headerShown: false, animation: 'slide_from_bottom' }}
        />
        <Stack.Screen name="entry-detail" options={{ title: 'Entry detail' }} />
        <Stack.Screen name="presets" options={{ title: 'Presets' }} />
        <Stack.Screen name="day-detail" options={{ title: 'Day detail' }} />
      </Stack>
    </>
  );
}

function ThemedRoot({ children }: PropsWithChildren) {
  const isDark = useColorScheme() === 'dark';
  return <View className={cn('flex-1 bg-background', isDark && 'dark')}>{children}</View>;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemePreferenceProvider>
        <AppProvider>
          <ThemedRoot>
            <RootNavigator />
          </ThemedRoot>
        </AppProvider>
      </ThemePreferenceProvider>
    </SafeAreaProvider>
  );
}
