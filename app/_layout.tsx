import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppButton, LoadingView } from '@/components/ui';
import { useAppTheme } from '@/constants/theme';
import { OnboardingScreen } from '@/features/auth/OnboardingScreen';
import { AppProvider, useApp } from '@/providers/AppProvider';

function RootNavigator() {
  const theme = useAppTheme();
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
      <View
        style={{
          flex: 1,
          padding: 24,
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          backgroundColor: theme.background,
        }}>
        <Text accessibilityRole="alert" style={{ color: theme.error, fontSize: 16, textAlign: 'center' }}>
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

  return (
    <>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerBackTitle: 'Back',
          headerShadowVisible: false,
          headerStyle: { backgroundColor: theme.background },
          headerTintColor: theme.text,
          contentStyle: { backgroundColor: theme.background },
          headerTitleStyle: { fontWeight: '700' },
        }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="capture-photo" options={{ title: 'Meal photo', presentation: 'modal' }} />
        <Stack.Screen name="text-estimate" options={{ title: 'Text estimate', presentation: 'modal' }} />
        <Stack.Screen name="review-entry" options={{ title: 'Review', presentation: 'modal', gestureEnabled: false }} />
        <Stack.Screen name="manual-entry" options={{ title: 'Entry', presentation: 'modal' }} />
        <Stack.Screen name="entry-detail" options={{ title: 'Entry detail' }} />
        <Stack.Screen name="presets" options={{ title: 'Presets' }} />
        <Stack.Screen name="preset-editor" options={{ title: 'Preset', presentation: 'modal' }} />
        <Stack.Screen name="day-detail" options={{ title: 'Day detail' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <RootNavigator />
      </AppProvider>
    </SafeAreaProvider>
  );
}
