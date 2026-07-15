import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton, Card, Heading, NumericField, Screen, Section } from '@/components/ui';
import { spacing, useAppTheme } from '@/constants/theme';
import type { MacroValues } from '@/domain/models';
import { InlineNotice, StatusPill } from '@/features/shared/FeatureUI';
import { useApp } from '@/providers/AppProvider';

type GoalForm = Record<keyof MacroValues, string>;

function formatUsd(micros: number): string {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(micros / 1_000_000);
}

export function SettingsScreen() {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
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

  return (
    <Screen style={{ paddingTop: insets.top + spacing.sm }}>
      <Heading title="Settings" subtitle="Goals, account recovery, sync, and privacy." />
      {!online ? <InlineNotice kind="offline">You’re offline. Local settings still work.</InlineNotice> : null}
      {message ? <InlineNotice>{message}</InlineNotice> : null}

      <Section title="Daily goals" detail="Applied to all comparisons">
        <Card style={styles.form}>
          <NumericField
            label="Calories (kcal)"
            value={form.calories}
            onChangeText={updateGoal('calories')}
            integer
          />
          <View style={styles.goalRow}>
            <View style={styles.flex}>
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
            <View style={styles.flex}>
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
        <Card style={styles.card}>
          <View style={styles.rowBetween}>
            <View style={styles.flex}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>
                {user?.email ?? 'Signed-in account'}
              </Text>
              <Text style={[styles.body, { color: theme.muted }]}>
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
        <Card style={styles.card}>
          <View style={styles.rowBetween}>
            <View style={styles.flex}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>Private cloud backup</Text>
              <Text style={[styles.body, { color: theme.muted }]}>
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
          <Text style={[styles.note, { color: theme.muted }]}>
            Entries, presets, and goals are cached on this device first, then backed up to your
            owner-only Supabase account.
          </Text>
        </Card>
      </Section>

      <Section title="Estimated OpenAI API cost">
        <Card style={styles.costCard}>
          <View style={styles.costItem}>
            <Text style={[styles.costLabel, { color: theme.muted }]}>This month</Text>
            <Text style={[styles.costValue, { color: theme.text }]}>
              {costSummary ? formatUsd(costSummary.monthCostMicrosUsd) : 'Unavailable'}
            </Text>
          </View>
          <View style={[styles.divider, { backgroundColor: theme.border }]} />
          <View style={styles.costItem}>
            <Text style={[styles.costLabel, { color: theme.muted }]}>This year</Text>
            <Text style={[styles.costValue, { color: theme.text }]}>
              {costSummary ? formatUsd(costSummary.yearCostMicrosUsd) : 'Unavailable'}
            </Text>
          </View>
          <Text style={[styles.note, { color: theme.muted }]}>
            {costSummary
              ? `Last refreshed ${new Intl.DateTimeFormat(undefined, {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                }).format(new Date(costSummary.refreshedAt))}. `
              : ''}
            This attributable estimate is not a billing invoice and excludes taxes and account
            adjustments.
          </Text>
        </Card>
      </Section>

      <Section title="Appearance">
        <Card>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Follows iPhone settings</Text>
          <Text style={[styles.body, { color: theme.muted }]}>
            Cal Tracker automatically uses your system light or dark appearance.
          </Text>
        </Card>
      </Section>

      <Section title="Privacy">
        <Card style={styles.card}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Your nutrition data is private</Text>
          <Text style={[styles.body, { color: theme.muted }]}>
            Supabase stores your cloud copy with owner-only access controls. Your device keeps an
            offline cache tied to the signed-in account.
          </Text>
          <Text style={[styles.body, { color: theme.muted }]}>
            Meal photos are resized and sent to OpenAI only after you tap Analyze. Cal Tracker does
            not retain the original image, encoded image, or raw AI response after review.
          </Text>
        </Card>
      </Section>
    </Screen>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.lg },
  card: { gap: spacing.lg },
  goalRow: { flexDirection: 'row', gap: spacing.md },
  flex: { flex: 1, gap: spacing.md },
  rowBetween: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  cardTitle: { fontSize: 17, lineHeight: 22, fontWeight: '800' },
  body: { fontSize: 14, lineHeight: 21 },
  note: { fontSize: 12, lineHeight: 18 },
  costCard: { gap: spacing.lg },
  costItem: { gap: spacing.xs },
  costLabel: { fontSize: 13, fontWeight: '700' },
  costValue: { fontSize: 28, lineHeight: 34, fontWeight: '900', letterSpacing: -0.5 },
  divider: { height: StyleSheet.hairlineWidth },
});
