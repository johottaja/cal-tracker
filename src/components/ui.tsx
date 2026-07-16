import { LinearGradient } from 'expo-linear-gradient';
import type { PropsWithChildren, ReactNode } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { macroColors, macroGradients, radii, spacing, useAppTheme } from '@/constants/theme';

export function Screen({
  children,
  scroll = true,
  style,
}: PropsWithChildren<{ scroll?: boolean; style?: ViewStyle }>) {
  const theme = useAppTheme();
  const content = scroll ? (
    <ScrollView
      contentContainerStyle={[styles.screenContent, style]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}>
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.screenContent, styles.flex, style]}>{children}</View>
  );

  return (
    <LinearGradient
      colors={theme.gradients.screen}
      start={{ x: 0, y: 0 }}
      end={{ x: 0.4, y: 1 }}
      style={styles.flex}>
      <SafeAreaView style={styles.flex} edges={['bottom']}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          {content}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

export function Heading({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  const theme = useAppTheme();
  return (
    <View style={styles.heading}>
      <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
      {subtitle ? <Text style={[styles.subtitle, { color: theme.muted }]}>{subtitle}</Text> : null}
    </View>
  );
}

export function Card({
  children,
  style,
}: PropsWithChildren<{ style?: ViewStyle }>) {
  const theme = useAppTheme();
  return (
    <View
      style={[
        styles.card,
        {
          borderColor: theme.border,
          shadowColor: theme.shadow,
        },
        style,
      ]}>
      <LinearGradient
        colors={theme.gradients.card}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.cardGradient}
      />
      {children}
    </View>
  );
}

export function HeroCard({
  children,
  style,
}: PropsWithChildren<{ style?: ViewStyle }>) {
  const theme = useAppTheme();
  return (
    <View style={[styles.heroWrap, { shadowColor: theme.shadow }, style]}>
      <LinearGradient
        colors={theme.gradients.hero}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}>
        {children}
      </LinearGradient>
    </View>
  );
}

export function AppButton({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  accessibilityHint,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  disabled?: boolean;
  loading?: boolean;
  accessibilityHint?: string;
}) {
  const theme = useAppTheme();
  const background =
    variant === 'danger'
      ? theme.error
      : variant === 'secondary'
        ? theme.primarySoft
        : variant === 'ghost'
          ? 'transparent'
          : undefined;
  const color =
    variant === 'primary' || variant === 'danger'
      ? '#FFFFFF'
      : variant === 'secondary'
        ? theme.primary
        : theme.text;
  const borderColor =
    variant === 'ghost' ? theme.border : variant === 'primary' ? 'transparent' : background;

  const content = loading ? (
    <ActivityIndicator color={color} />
  ) : (
    <Text style={[styles.buttonText, { color }]}>{label}</Text>
  );

  if (variant === 'primary') {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityHint={accessibilityHint}
        disabled={disabled || loading}
        onPress={onPress}
        style={({ pressed }) => [
          styles.buttonWrap,
          (disabled || loading) && styles.disabled,
          pressed && styles.pressed,
        ]}>
        <LinearGradient
          colors={theme.gradients.primary}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.button}>
          {content}
        </LinearGradient>
      </Pressable>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint={accessibilityHint}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: background, borderColor },
        (disabled || loading) && styles.disabled,
        pressed && styles.pressed,
      ]}>
      {content}
    </Pressable>
  );
}

export function Field({
  label,
  error,
  ...props
}: TextInputProps & { label: string; error?: string }) {
  const theme = useAppTheme();
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
      <TextInput
        {...props}
        placeholderTextColor={theme.muted}
        style={[
          styles.input,
          props.multiline && styles.multiline,
          { backgroundColor: theme.elevated, borderColor: error ? theme.error : theme.border, color: theme.text },
          props.style,
        ]}
      />
      {error ? <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text> : null}
    </View>
  );
}

export function NumericField({
  label,
  value,
  onChangeText,
  integer = false,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  integer?: boolean;
}) {
  return (
    <Field
      label={label}
      value={value}
      onChangeText={(next) =>
        onChangeText(next.replace(integer ? /[^0-9]/g : /[^0-9.]/g, ''))
      }
      keyboardType={integer ? 'number-pad' : 'decimal-pad'}
      inputMode={integer ? 'numeric' : 'decimal'}
      accessibilityLabel={label}
    />
  );
}

export function Section({
  title,
  detail,
  children,
}: PropsWithChildren<{ title: string; detail?: string }>) {
  const theme = useAppTheme();
  return (
    <View style={styles.section}>
      <View style={styles.sectionTitleRow}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>{title}</Text>
        {detail ? <Text style={[styles.caption, { color: theme.muted }]}>{detail}</Text> : null}
      </View>
      {children}
    </View>
  );
}

export function SegmentedControl<T extends string>({
  values,
  value,
  onChange,
}: {
  values: readonly T[];
  value: T;
  onChange: (value: T) => void;
}) {
  const theme = useAppTheme();
  return (
    <View style={[styles.segmented, { backgroundColor: theme.primarySoft }]}>
      {values.map((item) => {
        const selected = item === value;
        return (
          <Pressable
            key={item}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onChange(item)}
            style={[styles.segment, selected && styles.segmentSelected]}>
            {selected ? (
              <LinearGradient
                colors={theme.gradients.segment}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={styles.segmentGradient}>
                <Text style={[styles.segmentText, { color: theme.text }]}>{item}</Text>
              </LinearGradient>
            ) : (
              <Text style={[styles.segmentText, { color: theme.muted }]}>{item}</Text>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

type MacroKey = keyof typeof macroColors;

export function MacroProgress({
  label,
  consumed,
  goal,
  unit,
  macro,
}: {
  label: string;
  consumed: number;
  goal: number;
  unit: string;
  macro: MacroKey;
}) {
  const theme = useAppTheme();
  const progress = goal > 0 ? Math.min(consumed / goal, 1) : 0;
  const remaining = goal - consumed;
  const color = macroColors[macro];
  const gradient = macroGradients[macro];

  return (
    <Card style={styles.macroCard}>
      <View style={styles.rowBetween}>
        <Text style={[styles.macroLabel, { color: theme.text }]}>{label}</Text>
        <Text style={[styles.macroValue, { color }]}>
          {Math.round(consumed)} / {Math.round(goal)} {unit}
        </Text>
      </View>
      <View style={[styles.progressTrack, { backgroundColor: theme.primarySoft }]}>
        <LinearGradient
          colors={gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.progressFill, { width: `${progress * 100}%` }]}
        />
      </View>
      <Text style={[styles.caption, { color: remaining < 0 ? theme.warning : theme.muted }]}>
        {remaining >= 0 ? `${Math.round(remaining)} ${unit} remaining` : `${Math.abs(Math.round(remaining))} ${unit} over`}
      </Text>
    </Card>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  const theme = useAppTheme();
  return (
    <Card style={styles.empty}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>{title}</Text>
      <Text style={[styles.body, { color: theme.muted }]}>{body}</Text>
      {action}
    </Card>
  );
}

export function LoadingView({ label = 'Loading…' }: { label?: string }) {
  const theme = useAppTheme();
  return (
    <LinearGradient
      colors={theme.gradients.screen}
      start={{ x: 0, y: 0 }}
      end={{ x: 0.4, y: 1 }}
      style={styles.loading}>
      <ActivityIndicator color={theme.primary} />
      <Text style={[styles.body, { color: theme.muted }]}>{label}</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screenContent: { padding: spacing.lg, paddingBottom: spacing.huge, gap: spacing.lg },
  heading: { gap: spacing.xs, paddingTop: spacing.sm },
  title: { fontSize: 34, lineHeight: 39, fontWeight: '800', letterSpacing: -1.1 },
  subtitle: { fontSize: 16, lineHeight: 23 },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    padding: spacing.lg,
    shadowOpacity: 0.05,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    overflow: 'hidden',
  },
  cardGradient: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: radii.md,
  },
  heroWrap: {
    borderRadius: radii.lg,
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    overflow: 'hidden',
  },
  hero: {
    borderRadius: radii.lg,
    padding: spacing.xl,
    gap: spacing.sm,
  },
  buttonWrap: { borderRadius: radii.pill, overflow: 'hidden' },
  button: {
    minHeight: 50,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: 'transparent',
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { fontSize: 16, lineHeight: 21, fontWeight: '700' },
  disabled: { opacity: 0.45 },
  pressed: { opacity: 0.72, transform: [{ scale: 0.99 }] },
  field: { gap: spacing.sm },
  label: { fontSize: 14, lineHeight: 18, fontWeight: '700' },
  input: {
    minHeight: 50,
    borderWidth: 1,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 17,
  },
  multiline: { minHeight: 116, textAlignVertical: 'top' },
  errorText: { fontSize: 13 },
  section: { gap: spacing.md },
  sectionTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  sectionTitle: { fontSize: 20, lineHeight: 25, fontWeight: '800', letterSpacing: -0.25 },
  caption: { fontSize: 13, lineHeight: 18 },
  body: { fontSize: 15, lineHeight: 22 },
  segmented: { flexDirection: 'row', borderRadius: radii.sm, padding: 3 },
  segment: { flex: 1, borderRadius: 8, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  segmentSelected: { shadowOpacity: 0.08, shadowRadius: 6, shadowOffset: { width: 0, height: 2 } },
  segmentGradient: {
    paddingVertical: 9,
    paddingHorizontal: spacing.sm,
    borderRadius: 8,
    alignItems: 'center',
  },
  segmentText: { fontSize: 13, fontWeight: '700', textAlign: 'center', paddingVertical: 9, paddingHorizontal: spacing.sm },
  macroCard: { gap: spacing.md },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md, alignItems: 'baseline' },
  macroLabel: { fontSize: 17, fontWeight: '800' },
  macroValue: { fontSize: 14, fontWeight: '800' },
  progressTrack: { height: 8, borderRadius: radii.pill, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: radii.pill },
  empty: { gap: spacing.sm, alignItems: 'flex-start' },
  loading: { flex: 1, minHeight: 260, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
});
