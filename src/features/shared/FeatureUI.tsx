import type { PropsWithChildren, ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { Card } from '@/components/ui';
import { macroColors, radii, spacing, useAppTheme } from '@/constants/theme';
import type { FoodEntrySource, MacroKey, MacroValues } from '@/domain/models';

export const macroMeta: Record<
  MacroKey,
  { label: string; shortLabel: string; unit: string }
> = {
  calories: { label: 'Calories', shortLabel: 'Kcal', unit: 'kcal' },
  proteinG: { label: 'Protein', shortLabel: 'Protein', unit: 'g' },
  carbsG: { label: 'Carbohydrates', shortLabel: 'Carbs', unit: 'g' },
  fatG: { label: 'Fat', shortLabel: 'Fat', unit: 'g' },
};

export const sourceLabels: Record<FoodEntrySource, string> = {
  manual: 'Manual',
  preset: 'Preset',
  ai_text: 'Text estimate',
  ai_photo: 'Photo estimate',
};

export function ActionCard({
  icon,
  title,
  body,
  onPress,
  trailing,
  accessibilityHint,
}: {
  icon: string;
  title: string;
  body: string;
  onPress: () => void;
  trailing?: ReactNode;
  accessibilityHint?: string;
}) {
  const theme = useAppTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={accessibilityHint ?? body}
      onPress={onPress}
      style={({ pressed }) => [
        styles.action,
        { backgroundColor: theme.surface, borderColor: theme.border },
        pressed && styles.pressed,
      ]}>
      <View style={[styles.icon, { backgroundColor: theme.primarySoft }]}>
        <Text style={styles.iconText} importantForAccessibility="no">
          {icon}
        </Text>
      </View>
      <View style={styles.actionCopy}>
        <Text style={[styles.actionTitle, { color: theme.text }]}>{title}</Text>
        <Text style={[styles.body, { color: theme.muted }]}>{body}</Text>
      </View>
      {trailing ?? <Text style={[styles.chevron, { color: theme.muted }]}>›</Text>}
    </Pressable>
  );
}

export function InlineNotice({
  kind = 'info',
  children,
  action,
}: PropsWithChildren<{ kind?: 'info' | 'error' | 'offline' | 'success'; action?: ReactNode }>) {
  const theme = useAppTheme();
  const accent =
    kind === 'error'
      ? theme.error
      : kind === 'success'
        ? theme.success
        : kind === 'offline'
          ? theme.warning
          : theme.primary;
  return (
    <View
      accessibilityRole="alert"
      style={[styles.notice, { backgroundColor: theme.surface, borderColor: accent }]}>
      <Text style={[styles.body, styles.noticeText, { color: theme.text }]}>{children}</Text>
      {action}
    </View>
  );
}

export function MacroSummary({
  values,
  compact = false,
}: {
  values: MacroValues;
  compact?: boolean;
}) {
  const theme = useAppTheme();
  const keys: MacroKey[] = ['calories', 'proteinG', 'carbsG', 'fatG'];
  return (
    <View
      accessibilityLabel={keys
        .map((key) => `${macroMeta[key].label} ${values[key]} ${macroMeta[key].unit}`)
        .join(', ')}
      style={[styles.macroRow, compact && styles.macroRowCompact]}>
      {keys.map((key) => (
        <View key={key} style={styles.macroItem}>
          <Text style={[styles.macroValue, { color: macroColors[key] }]}>
            {values[key]}
            {key === 'calories' ? '' : 'g'}
          </Text>
          <Text style={[styles.caption, { color: theme.muted }]}>
            {macroMeta[key].shortLabel}
          </Text>
        </View>
      ))}
    </View>
  );
}

export function StatusPill({
  label,
  tone = 'neutral',
}: {
  label: string;
  tone?: 'neutral' | 'positive' | 'warning';
}) {
  const theme = useAppTheme();
  const color =
    tone === 'positive' ? theme.success : tone === 'warning' ? theme.warning : theme.muted;
  return (
    <View style={[styles.pill, { borderColor: color }]}>
      <Text style={[styles.pillText, { color }]}>{label}</Text>
    </View>
  );
}

export function MiniCard({
  children,
  style,
}: PropsWithChildren<{ style?: ViewStyle }>) {
  return <Card style={style ? { ...styles.miniCard, ...style } : styles.miniCard}>{children}</Card>;
}

const styles = StyleSheet.create({
  action: {
    minHeight: 82,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radii.md,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  pressed: { opacity: 0.7, transform: [{ scale: 0.99 }] },
  icon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: { fontSize: 23 },
  actionCopy: { flex: 1, gap: 3 },
  actionTitle: { fontSize: 17, lineHeight: 21, fontWeight: '800' },
  body: { fontSize: 14, lineHeight: 20 },
  chevron: { fontSize: 28, lineHeight: 30 },
  notice: {
    borderWidth: 1,
    borderRadius: radii.sm,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  noticeText: { flex: 1 },
  macroRow: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  macroRowCompact: { marginTop: spacing.xs },
  macroItem: { flex: 1, gap: 2 },
  macroValue: { fontSize: 15, lineHeight: 19, fontWeight: '800' },
  caption: { fontSize: 11, lineHeight: 15, fontWeight: '600' },
  pill: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  pillText: { fontSize: 12, lineHeight: 15, fontWeight: '700' },
  miniCard: { padding: spacing.md },
});
