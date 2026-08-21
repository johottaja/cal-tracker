import type { PropsWithChildren, ReactNode } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  type TextInputProps,
  useColorScheme,
  View,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAppTheme } from '@/constants/theme';
import { cn } from '@/lib/cn';

const macroTextClass = {
  calories: 'text-macro-calories',
  proteinG: 'text-macro-protein',
  carbsG: 'text-macro-carbs',
  fatG: 'text-macro-fat',
} as const;

const macroFillClass = {
  calories: 'bg-macro-calories',
  proteinG: 'bg-macro-protein',
  carbsG: 'bg-macro-carbs',
  fatG: 'bg-macro-fat',
} as const;

export type MacroTone = keyof typeof macroTextClass;

export function Screen({
  children,
  scroll = true,
  style,
}: PropsWithChildren<{ scroll?: boolean; style?: ViewStyle }>) {
  const content = scroll ? (
    <ScrollView
      className="flex-1"
      contentContainerClassName="gap-4 px-4 pb-12"
      contentContainerStyle={style}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}>
      {children}
    </ScrollView>
  ) : (
    <View className="flex-1 gap-4 px-4 pb-12" style={style}>
      {children}
    </View>
  );

  return (
    <View className="flex-1 bg-background">
      <SafeAreaView className="flex-1" edges={['bottom']}>
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          {content}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

export function Heading({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <View className="gap-1 pt-2">
      <Text className="text-[32px] font-extrabold leading-9 tracking-tight text-foreground">
        {title}
      </Text>
      {subtitle ? (
        <Text className="text-base leading-[22px] text-muted-foreground">{subtitle}</Text>
      ) : null}
    </View>
  );
}

export function Card({
  children,
  className,
}: PropsWithChildren<{ className?: string }>) {
  return (
    <View className={cn('overflow-hidden rounded-md border border-border bg-card p-4', className)}>
      {children}
    </View>
  );
}

export function HeroCard({
  children,
  className,
}: PropsWithChildren<{ className?: string }>) {
  return (
    <View className={cn('gap-2 rounded-lg bg-hero px-5 py-5', className)}>{children}</View>
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
  const colorScheme = useColorScheme();
  const inactive = disabled || loading;
  const onFilled = colorScheme === 'dark' ? '#0f1413' : '#ffffff';
  const spinnerColor =
    variant === 'secondary' ? theme.primary : variant === 'ghost' ? theme.text : onFilled;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={onPress}
      className={cn(
        'min-h-[48px] items-center justify-center rounded-full border px-6 active:opacity-70',
        variant === 'primary' && 'border-transparent bg-primary',
        variant === 'secondary' && 'border-transparent bg-primary-soft',
        variant === 'danger' && 'border-transparent bg-destructive',
        variant === 'ghost' && 'border-border bg-transparent',
        inactive && 'opacity-45',
      )}>
      {loading ? (
        <ActivityIndicator color={spinnerColor} />
      ) : (
        <Text
          className={cn(
            'text-base font-bold leading-5',
            variant === 'primary' && 'text-primary-foreground',
            variant === 'secondary' && 'text-primary',
            variant === 'danger' && 'text-destructive-foreground',
            variant === 'ghost' && 'text-foreground',
          )}>
          {label}
        </Text>
      )}
    </Pressable>
  );
}

export function Field({
  label,
  error,
  ...props
}: TextInputProps & { label: string; error?: string }) {
  const theme = useAppTheme();
  const errorId = `${label.replace(/\s+/g, '-').toLowerCase()}-error`;
  return (
    <View className="gap-2">
      <Text className="text-sm font-bold leading-[18px] text-foreground">{label}</Text>
      <TextInput
        {...props}
        accessibilityLabel={label}
        placeholderTextColor={theme.muted}
        className={cn(
          'min-h-[48px] rounded-sm border bg-elevated px-3 py-3 text-[17px] text-foreground placeholder:text-muted-foreground',
          error ? 'border-destructive' : 'border-border',
          props.multiline && 'min-h-[116px]',
        )}
        style={[props.multiline ? { textAlignVertical: 'top' } : null, props.style]}
      />
      {error ? (
        <Text nativeID={errorId} accessibilityRole="alert" className="text-[13px] text-destructive">
          {error}
        </Text>
      ) : null}
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
  return (
    <View className="gap-3">
      <View className="flex-row items-baseline justify-between">
        <Text className="text-xl font-extrabold leading-6 tracking-tight text-foreground">
          {title}
        </Text>
        {detail ? (
          <Text className="text-[13px] leading-[18px] text-muted-foreground">{detail}</Text>
        ) : null}
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
  return (
    <View className="flex-row rounded-sm bg-primary-soft p-[3px]">
      {values.map((item) => {
        const selected = item === value;
        return (
          <Pressable
            key={item}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => onChange(item)}
            className={cn(
              'min-h-[44px] flex-1 items-center justify-center rounded-sm px-2 active:opacity-70',
              selected && 'bg-card',
            )}>
            <Text
              className={cn(
                'text-center text-[13px] font-bold',
                selected ? 'text-foreground' : 'text-muted-foreground',
              )}>
              {item}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

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
  macro: MacroTone;
}) {
  const progress = goal > 0 ? Math.min(consumed / goal, 1) : 0;
  const remaining = goal - consumed;

  return (
    <Card className="gap-3">
      <View className="flex-row items-baseline justify-between gap-3">
        <Text className="text-[17px] font-extrabold text-foreground">{label}</Text>
        <Text className={cn('text-sm font-extrabold', macroTextClass[macro])}>
          {Math.round(consumed)} / {Math.round(goal)} {unit}
        </Text>
      </View>
      <View className="h-2 overflow-hidden rounded-full bg-primary-soft">
        <View
          className={cn('h-full rounded-full', macroFillClass[macro])}
          style={{ width: `${progress * 100}%` }}
        />
      </View>
      <Text
        className={cn(
          'text-[13px] leading-[18px]',
          remaining < 0 ? 'text-warning' : 'text-muted-foreground',
        )}>
        {remaining >= 0
          ? `${Math.round(remaining)} ${unit} remaining`
          : `${Math.abs(Math.round(remaining))} ${unit} over`}
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
  return (
    <Card className="items-start gap-2">
      <Text className="text-xl font-extrabold leading-6 tracking-tight text-foreground">
        {title}
      </Text>
      <Text className="text-[15px] leading-[22px] text-muted-foreground">{body}</Text>
      {action}
    </Card>
  );
}

export function LoadingView({ label = 'Loading…' }: { label?: string }) {
  return (
    <View className="min-h-[260px] flex-1 items-center justify-center gap-3 bg-background">
      <ActivityIndicator />
      <Text className="text-[15px] leading-[22px] text-muted-foreground">{label}</Text>
    </View>
  );
}
