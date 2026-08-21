import { useEffect, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  AppButton,
  Card,
  Heading,
  NumericField,
  Screen,
  Section,
  SegmentedControl,
} from '@/components/ui';
import type { MacroValues } from '@/domain/models';
import { ActionCard, InlineNotice, StatusPill } from '@/features/shared/FeatureUI';
import { useApp } from '@/providers/AppProvider';
import {
  useThemePreference,
  type ThemePreference,
} from '@/providers/ThemePreferenceProvider';
import { getUsdToEurRate, usdMicrosToEur } from '@/services/cost/usdToEur';

type GoalForm = Record<keyof MacroValues, string>;

const APPEARANCE_OPTIONS = ['System', 'Light', 'Dark'] as const;
type AppearanceLabel = (typeof APPEARANCE_OPTIONS)[number];

const preferenceFromLabel: Record<AppearanceLabel, ThemePreference> = {
  System: 'system',
  Light: 'light',
  Dark: 'dark',
};

const labelFromPreference: Record<ThemePreference, AppearanceLabel> = {
  system: 'System',
  light: 'Light',
  dark: 'Dark',
};

function formatEur(amount: number): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(amount);
}

export function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { preference, setPreference } = useThemePreference();
  const {
    user,
    goals,
    online,
    syncStatus,
    costSummary,
    saveGoals,
    signOut,
    restoreSession,
    retrySync,
  } = useApp();
  const [form, setForm] = useState<GoalForm>(() => ({
    calories: goals ? String(goals.calories) : '',
    proteinG: goals ? String(goals.proteinG) : '',
    carbsG: goals ? String(goals.carbsG) : '',
    fatG: goals ? String(goals.fatG) : '',
  }));
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [usdToEur, setUsdToEur] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const rate = await getUsdToEurRate();
        if (!cancelled) setUsdToEur(rate);
      } catch {
        if (!cancelled) setUsdToEur(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [costSummary?.refreshedAt]);

  const updateGoal = (key: keyof GoalForm) => (value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  const submitGoals = async () => {
    const parsed: MacroValues = {
      calories: Number(form.calories),
      proteinG: Number(form.proteinG),
      carbsG: Number(form.carbsG),
      fatG: Number(form.fatG),
    };
    if (Object.values(parsed).some((value) => !Number.isFinite(value) || value < 0)) {
      setMessage('Goals must be non-negative numbers.');
      return;
    }
    setBusy('goals');
    try {
      await saveGoals(parsed);
      setMessage('Daily goals saved.');
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : 'Could not save goals.');
    } finally {
      setBusy(null);
    }
  };

  const restore = async () => {
    setBusy('restore');
    try {
      await restoreSession();
      setMessage('Account session restored.');
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : 'Could not restore your session.');
    } finally {
      setBusy(null);
    }
  };

  const sync = async () => {
    setBusy('sync');
    try {
      await retrySync();
      setMessage('Sync completed.');
    } catch (caught) {
      setMessage(caught instanceof Error ? caught.message : 'Sync could not complete.');
    } finally {
      setBusy(null);
    }
  };

  const confirmSignOut = () =>
    Alert.alert(
      'Sign out on this device?',
      'The local cache will be removed. Your private Supabase data remains available after signing in again.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign out',
          style: 'destructive',
          onPress: () => void signOut(),
        },
      ],
    );

  const syncTime = syncStatus.lastSuccessfulSyncAt
    ? new Intl.DateTimeFormat(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(syncStatus.lastSuccessfulSyncAt))
    : 'Not yet synced';

  const monthCost =
    costSummary && usdToEur !== null
      ? formatEur(usdMicrosToEur(costSummary.monthCostMicrosUsd, usdToEur))
      : costSummary
        ? '…'
        : 'Unavailable';
  const yearCost =
    costSummary && usdToEur !== null
      ? formatEur(usdMicrosToEur(costSummary.yearCostMicrosUsd, usdToEur))
      : costSummary
        ? '…'
        : 'Unavailable';

  return (
    <Screen style={{ paddingTop: insets.top + 8 }}>
      <Heading title="Settings" subtitle="Goals, account recovery, sync, and privacy." />
      {!online ? <InlineNotice kind="offline">You’re offline. Local settings still work.</InlineNotice> : null}
      {message ? <InlineNotice>{message}</InlineNotice> : null}

      <Section title="Daily goals" detail="Applied to all comparisons">
        <ActionCard
          icon="calculator-outline"
          title="Recalculate macros"
          body="Run the calculator again from your body stats and goals."
          onPress={() => router.push('/(modals)/macro-calculator')}
        />
        <Card className="gap-4">
          <NumericField
            label="Calories (kcal)"
            value={form.calories}
            onChangeText={updateGoal('calories')}
            integer
          />
          <View className="flex-row gap-3">
            <View className="flex-1 gap-3">
              <NumericField
                label="Protein (g)"
                value={form.proteinG}
                onChangeText={updateGoal('proteinG')}
              />
              <NumericField
                label="Carbohydrates (g)"
                value={form.carbsG}
                onChangeText={updateGoal('carbsG')}
              />
            </View>
            <View className="flex-1 gap-3">
              <NumericField label="Fat (g)" value={form.fatG} onChangeText={updateGoal('fatG')} />
            </View>
          </View>
          <AppButton
            label="Save goals"
            onPress={() => void submitGoals()}
            loading={busy === 'goals'}
          />
        </Card>
      </Section>

      <Section title="Account">
        <Card className="gap-4">
          <View className="flex-row items-start gap-3">
            <View className="flex-1 gap-3">
              <Text className="text-[17px] font-extrabold leading-[22px] text-foreground">
                {user?.email ?? 'Signed-in account'}
              </Text>
              <Text className="text-sm leading-[21px] text-muted-foreground">
                Your identity restores private cloud-backed data after reinstalling.
              </Text>
            </View>
            <StatusPill
              label={user ? 'Signed in' : 'Session needed'}
              tone={user ? 'positive' : 'warning'}
            />
          </View>
          <AppButton
            label="Restore session"
            variant="secondary"
            onPress={() => void restore()}
            loading={busy === 'restore'}
            disabled={!online}
          />
          <AppButton label="Sign out" variant="ghost" onPress={confirmSignOut} />
        </Card>
      </Section>

      <Section title="Sync" detail={`${syncStatus.pendingCount} pending`}>
        <Card className="gap-4">
          <View className="flex-row items-start gap-3">
            <View className="flex-1 gap-3">
              <Text className="text-[17px] font-extrabold leading-[22px] text-foreground">
                Private cloud backup
              </Text>
              <Text className="text-sm leading-[21px] text-muted-foreground">
                Last successful sync: {syncTime}
              </Text>
            </View>
            <StatusPill
              label={syncStatus.phase}
              tone={
                syncStatus.phase === 'idle'
                  ? 'positive'
                  : syncStatus.phase === 'error' || syncStatus.phase === 'offline'
                    ? 'warning'
                    : 'neutral'
              }
            />
          </View>
          {syncStatus.lastError ? (
            <InlineNotice kind="error">{syncStatus.lastError}</InlineNotice>
          ) : null}
          <AppButton
            label="Retry sync"
            variant="secondary"
            onPress={() => void sync()}
            loading={busy === 'sync'}
            disabled={!online}
          />
          <Text className="text-xs leading-[18px] text-muted-foreground">
            Entries, presets, and goals are cached on this device first, then backed up to your
            owner-only Supabase account.
          </Text>
        </Card>
      </Section>

      <Section title="Estimated OpenAI API cost">
        <Card className="gap-4">
          <View className="gap-1">
            <Text className="text-[13px] font-bold text-muted-foreground">This month</Text>
            <Text className="text-[28px] font-black leading-[34px] tracking-tight text-foreground">
              {monthCost}
            </Text>
          </View>
          <View className="h-px bg-border" />
          <View className="gap-1">
            <Text className="text-[13px] font-bold text-muted-foreground">This year</Text>
            <Text className="text-[28px] font-black leading-[34px] tracking-tight text-foreground">
              {yearCost}
            </Text>
          </View>
          <Text className="text-xs leading-[18px] text-muted-foreground">
            {costSummary
              ? `Last refreshed ${new Intl.DateTimeFormat(undefined, {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                }).format(new Date(costSummary.refreshedAt))}. `
              : ''}
            {usdToEur !== null
              ? `Shown in euros using the ECB USD→EUR rate (${usdToEur.toFixed(4)}). `
              : 'Euro conversion needs a network connection. '}
            This attributable estimate is not a billing invoice and excludes taxes and account
            adjustments.
          </Text>
        </Card>
      </Section>

      <Section title="Appearance">
        <Card className="gap-4">
          <Text className="text-[17px] font-extrabold leading-[22px] text-foreground">Color mode</Text>
          <Text className="text-sm leading-[21px] text-muted-foreground">
            Choose light, dark, or match your iPhone settings.
          </Text>
          <SegmentedControl
            values={APPEARANCE_OPTIONS}
            value={labelFromPreference[preference]}
            onChange={(label) => {
              void setPreference(preferenceFromLabel[label]);
            }}
          />
        </Card>
      </Section>

      <Section title="Privacy">
        <Card className="gap-4">
          <Text className="text-[17px] font-extrabold leading-[22px] text-foreground">
            Your nutrition data is private
          </Text>
          <Text className="text-sm leading-[21px] text-muted-foreground">
            Supabase stores your cloud copy with owner-only access controls. Your device keeps an
            offline cache tied to the signed-in account.
          </Text>
          <Text className="text-sm leading-[21px] text-muted-foreground">
            Meal photos are resized and sent to OpenAI only after you tap Analyze. Cal Tracker does
            not retain the original image, encoded image, or raw AI response after review.
          </Text>
        </Card>
      </Section>
    </Screen>
  );
}
