import type { PropsWithChildren, ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { AppIcon, type AppIconName } from '@/components/AppIcon';
import { Card } from '@/components/ui';
import type { FoodEntrySource, MacroKey, MacroValues } from '@/domain/models';
import { cn } from '@/lib/cn';

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

const macroValueClass: Record<MacroKey, string> = {
  calories: 'text-macro-calories',
  proteinG: 'text-macro-protein',
  carbsG: 'text-macro-carbs',
  fatG: 'text-macro-fat',
};

export function ActionCard({
  icon,
  title,
  body,
  onPress,
  trailing,
  accessibilityHint,
}: {
  icon: AppIconName;
  title: string;
  body: string;
  onPress: () => void;
  trailing?: ReactNode;
  accessibilityHint?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={accessibilityHint ?? body}
      onPress={onPress}
      className="min-h-[82px] flex-row items-center gap-3 overflow-hidden rounded-md border border-border bg-card p-3 active:opacity-70">
      <View className="h-12 w-12 items-center justify-center rounded-md bg-primary-soft">
        <AppIcon name={icon} size={22} className="text-primary" />
      </View>
      <View className="flex-1 gap-0.5">
        <Text className="text-[17px] font-extrabold leading-[21px] text-foreground">{title}</Text>
        <Text className="text-sm leading-5 text-muted-foreground">{body}</Text>
      </View>
      {trailing ?? <AppIcon name="chevron-forward" size={18} className="text-muted-foreground" />}
    </Pressable>
  );
}

export function InlineNotice({
  kind = 'info',
  children,
  action,
}: PropsWithChildren<{ kind?: 'info' | 'error' | 'offline' | 'success'; action?: ReactNode }>) {
  return (
    <View
      accessibilityRole="alert"
      className={cn(
        'flex-row items-center gap-3 rounded-sm border bg-card p-3',
        kind === 'error' && 'border-destructive',
        kind === 'success' && 'border-success',
        kind === 'offline' && 'border-warning',
        kind === 'info' && 'border-primary',
      )}>
      <Text className="flex-1 text-sm leading-5 text-foreground">{children}</Text>
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
  const keys: MacroKey[] = ['calories', 'proteinG', 'carbsG', 'fatG'];
  return (
    <View
      accessibilityLabel={keys
        .map((key) => `${macroMeta[key].label} ${values[key]} ${macroMeta[key].unit}`)
        .join(', ')}
      className={cn('flex-row justify-between gap-2', compact && 'mt-1')}>
      {keys.map((key) => (
        <View key={key} className="flex-1 gap-0.5">
          <Text className={cn('text-[15px] font-extrabold leading-[19px]', macroValueClass[key])}>
            {values[key]}
            {key === 'calories' ? '' : 'g'}
          </Text>
          <Text className="text-[11px] font-semibold leading-[15px] text-muted-foreground">
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
  return (
    <View
      className={cn(
        'self-start rounded-full border px-2 py-1',
        tone === 'positive' && 'border-success',
        tone === 'warning' && 'border-warning',
        tone === 'neutral' && 'border-muted-foreground',
      )}>
      <Text
        className={cn(
          'text-xs font-bold leading-[15px]',
          tone === 'positive' && 'text-success',
          tone === 'warning' && 'text-warning',
          tone === 'neutral' && 'text-muted-foreground',
        )}>
        {label}
      </Text>
    </View>
  );
}

export function MiniCard({
  children,
  className,
}: PropsWithChildren<{ className?: string }>) {
  return <Card className={cn('p-3', className)}>{children}</Card>;
}
