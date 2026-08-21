import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { AppIcon, type AppIconName } from '@/components/AppIcon';
import { cn } from '@/lib/cn';

export function GradientHero({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <View className={cn('overflow-hidden rounded-lg', className)}>
      <LinearGradient
        colors={['#2f6b4f', '#3d8a68']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ paddingHorizontal: 20, paddingVertical: 20 }}>
        {children}
      </LinearGradient>
    </View>
  );
}

export function ChoiceActionCard({
  icon,
  title,
  body,
  onPress,
  highlighted = false,
}: {
  icon: AppIconName;
  title: string;
  body: string;
  onPress: () => void;
  highlighted?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={body}
      onPress={onPress}
      className={cn(
        'min-h-[88px] flex-row items-center gap-3 overflow-hidden rounded-md border p-3 active:opacity-70',
        highlighted ? 'border-primary bg-primary-soft' : 'border-border bg-card',
      )}>
      <LinearGradient
        colors={highlighted ? ['#2f6b4f', '#4a9a72'] : ['#d7e8dd', '#c5ddd0']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          width: 48,
          height: 48,
          borderRadius: 10,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
        <AppIcon
          name={icon}
          size={22}
          className={highlighted ? 'text-primary-foreground' : 'text-primary'}
        />
      </LinearGradient>
      <View className="flex-1 gap-0.5">
        <Text className="text-[17px] font-extrabold leading-[21px] text-foreground">{title}</Text>
        <Text className="text-sm leading-5 text-muted-foreground">{body}</Text>
      </View>
      <AppIcon name="chevron-forward" size={18} className="text-muted-foreground" />
    </Pressable>
  );
}

export function SelectableGoalCard({
  title,
  description,
  selected,
  onPress,
  trailing,
}: {
  title: string;
  description: string;
  selected: boolean;
  onPress: () => void;
  trailing?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={title}
      accessibilityHint={description}
      onPress={onPress}
      className={cn(
        'min-h-[72px] gap-1 rounded-md border p-3 active:opacity-70',
        selected ? 'border-primary bg-primary-soft' : 'border-border bg-card',
      )}>
      <View className="flex-row items-start justify-between gap-2">
        <Text className="flex-1 text-[16px] font-extrabold leading-5 text-foreground">{title}</Text>
        {trailing ? (
          <Text className="text-[13px] font-bold text-primary">{trailing}</Text>
        ) : null}
      </View>
      <Text className="text-sm leading-5 text-muted-foreground">{description}</Text>
    </Pressable>
  );
}

export function StepDots({
  total,
  current,
}: {
  total: number;
  current: number;
}) {
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: total - 1, now: current }}
      className="flex-row items-center justify-center gap-2 py-1">
      {Array.from({ length: total }, (_, index) => (
        <View
          key={index}
          className={cn(
            'h-2 rounded-full',
            index === current ? 'w-6 bg-primary' : 'w-2 bg-border',
          )}
        />
      ))}
    </View>
  );
}
