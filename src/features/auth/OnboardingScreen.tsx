import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import {
  AppButton,
  Card,
  Field,
  Heading,
  NumericField,
  Screen,
  SegmentedControl,
} from '@/components/ui';
import { spacing, useAppTheme } from '@/constants/theme';

export type GoalInput = {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
};

const defaults = {
  calories: '2000',
  proteinG: '120',
  carbsG: '230',
  fatG: '70',
};

const authModes = ['Sign in', 'Create account'] as const;
type AuthMode = (typeof authModes)[number];
type EmailSignUpStatus = 'signed_in' | 'confirmation_required';

export function OnboardingScreen({
  signedIn,
  busy,
  error,
  onEmailSignIn,
  onEmailSignUp,
  onSaveGoals,
}: {
  signedIn: boolean;
  busy: boolean;
  error: string | null;
  onEmailSignIn: (email: string, password: string) => Promise<void>;
  onEmailSignUp: (
    email: string,
    password: string,
  ) => Promise<EmailSignUpStatus | undefined>;
  onSaveGoals: (goals: GoalInput) => Promise<void>;
}) {
  const theme = useAppTheme();
  const [values, setValues] = useState(defaults);
  const [authMode, setAuthMode] = useState<AuthMode>('Sign in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [authNotice, setAuthNotice] = useState<string | null>(null);

  const submitGoals = async () => {
    const parsed = {
      calories: Number(values.calories),
      proteinG: Number(values.proteinG),
      carbsG: Number(values.carbsG),
      fatG: Number(values.fatG),
    };
    if (Object.values(parsed).some((value) => !Number.isFinite(value) || value < 0)) return;
    await onSaveGoals(parsed);
  };

  const submitEmail = async () => {
    const normalizedEmail = email.trim();
    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      setValidationError('Enter a valid email address.');
      return;
    }
    if (!password) {
      setValidationError('Enter your password.');
      return;
    }
    setAuthNotice(null);
    setValidationError(null);
    if (authMode === 'Sign in') {
      await onEmailSignIn(normalizedEmail, password);
      return;
    }
    const status = await onEmailSignUp(normalizedEmail, password);
    if (status === 'confirmation_required') {
      setAuthNotice(`Check ${normalizedEmail} to confirm your account, then sign in.`);
    }
  };

  return (
    <Screen style={styles.screen}>
      <View style={styles.brand}>
        <View style={[styles.mark, { backgroundColor: theme.primary }]}>
          <Text style={styles.markText}>C</Text>
        </View>
        <Heading
          title={signedIn ? 'Set your daily goals' : 'Eat with clarity'}
          subtitle={
            signedIn
              ? 'You can change these anytime in Settings.'
              : 'Private, offline-friendly calorie and macro tracking with quick AI estimates.'
          }
        />
      </View>

      {signedIn ? (
        <Card style={styles.form}>
          <NumericField
            label="Calories (kcal)"
            value={values.calories}
            onChangeText={(calories) => setValues({ ...values, calories })}
            integer
          />
          <NumericField
            label="Protein (g)"
            value={values.proteinG}
            onChangeText={(proteinG) => setValues({ ...values, proteinG })}
          />
          <NumericField
            label="Carbohydrates (g)"
            value={values.carbsG}
            onChangeText={(carbsG) => setValues({ ...values, carbsG })}
          />
          <NumericField
            label="Fat (g)"
            value={values.fatG}
            onChangeText={(fatG) => setValues({ ...values, fatG })}
          />
          <AppButton label="Start tracking" onPress={() => void submitGoals()} loading={busy} />
        </Card>
      ) : (
        <Card style={styles.signInCard}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Your data follows you</Text>
          <Text style={[styles.body, { color: theme.muted }]}>
            Sign in to keep your private nutrition history in Supabase and restore it after
            reinstalling.
          </Text>
          <SegmentedControl
            values={authModes}
            value={authMode}
            onChange={(mode) => {
              setAuthMode(mode);
              setValidationError(null);
              setAuthNotice(null);
            }}
          />
          <Field
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            textContentType="username"
            editable={!busy}
          />
          <Field
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder={authMode === 'Sign in' ? 'Your password' : 'Choose a password'}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete={authMode === 'Sign in' ? 'current-password' : 'new-password'}
            textContentType={authMode === 'Sign in' ? 'password' : 'newPassword'}
            onSubmitEditing={() => void submitEmail()}
            editable={!busy}
          />
          {validationError ? (
            <Text style={[styles.inlineMessage, { color: theme.error }]}>{validationError}</Text>
          ) : null}
          {authNotice ? (
            <Text style={[styles.inlineMessage, { color: theme.success }]}>{authNotice}</Text>
          ) : null}
          <AppButton
            label={authMode}
            onPress={() => void submitEmail()}
            loading={busy}
            disabled={busy}
          />
          <Text style={[styles.note, { color: theme.muted }]}>
            After your first sync, logging and history remain available offline.
          </Text>
        </Card>
      )}

      {error ? <Text style={[styles.error, { color: theme.error }]}>{error}</Text> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: { justifyContent: 'center', paddingTop: spacing.huge },
  brand: { gap: spacing.xl },
  mark: { width: 64, height: 64, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  markText: { color: '#FFFFFF', fontSize: 30, fontWeight: '900' },
  form: { gap: spacing.lg },
  signInCard: { gap: spacing.lg },
  cardTitle: { fontSize: 20, fontWeight: '800' },
  body: { fontSize: 16, lineHeight: 23 },
  note: { fontSize: 13, lineHeight: 18, textAlign: 'center' },
  inlineMessage: { fontSize: 13, lineHeight: 18 },
  error: { fontSize: 14, lineHeight: 20, textAlign: 'center' },
});
