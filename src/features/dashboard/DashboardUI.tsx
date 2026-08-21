import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { AppIcon, type AppIconName } from '@/components/AppIcon';
import type { FoodEntry } from '@/domain/models';
import { MacroSummary, sourceLabels } from '@/features/shared/FeatureUI';
import { cn } from '@/lib/cn';

const continuousBorder = { borderCurve: 'continuous' as const };
const photoIconWell = { backgroundColor: 'rgba(255,255,255,0.18)' };
const photoSubtitle = { opacity: 0.82 };

const timeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: 'numeric',
  minute: '2-digit',
});

const journalMacros = ['proteinG', 'carbsG', 'fatG'] as const;

const shortcuts = [
  {
    icon: 'chatbubble-ellipses-outline' as const,
    label: 'Describe',
    href: '/text-estimate' as const,
    hint: 'Estimate from a text description',
  },
  {
    icon: 'create-outline' as const,
    label: 'Manual',
    href: '/manual-entry' as const,
    hint: 'Enter calories and macros',
  },
  {
    icon: 'star-outline' as const,
    label: 'Presets',
    href: '/presets' as const,
    hint: 'Quick add favorite meals',
  },
];

function ShortcutTile({
  icon,
  label,
  href,
  hint,
}: {
  icon: AppIconName;
  label: string;
  href: (typeof shortcuts)[number]['href'];
  hint: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      onPress={() => router.push(href)}
      style={continuousBorder}
      className="min-h-[76px] min-w-0 flex-1 items-center justify-center gap-2 rounded-lg border border-border bg-card px-2 py-3 active:opacity-70">
      <View className="h-11 w-11 items-center justify-center rounded-full bg-primary-soft">
        <AppIcon name={icon} size={20} className="text-primary" />
      </View>
      <Text className="text-center text-[13px] font-bold text-foreground">{label}</Text>
    </Pressable>
  );
}

export function QuickLogGrid() {
  return (
    <View className="gap-2">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Meal photo"
        accessibilityHint="Opens camera and photo selection"
        onPress={() => router.push('/capture-photo')}
        style={continuousBorder}
        className="min-h-[64px] flex-row items-center gap-3 rounded-lg bg-primary px-4 py-3 active:opacity-70">
        <View className="h-11 w-11 items-center justify-center rounded-full" style={photoIconWell}>
          <AppIcon name="camera-outline" size={22} className="text-primary-foreground" />
        </View>
        <View className="flex-1 gap-0.5">
          <Text className="text-[17px] font-extrabold text-primary-foreground">Meal photo</Text>
          <Text className="text-sm font-semibold text-primary-foreground" style={photoSubtitle}>
            Snap or pick a picture
          </Text>
        </View>
      </Pressable>
      <View className="flex-row gap-2">
        {shortcuts.map((item) => (
          <ShortcutTile key={item.href} {...item} />
        ))}
      </View>
    </View>
  );
}

export function EntryRow({
  entry,
  showDivider,
}: {
  entry: FoodEntry;
  showDivider: boolean;
}) {
  const time = timeFormatter.format(new Date(entry.loggedAt));
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${entry.name}, ${entry.calories} calories, ${sourceLabels[entry.source]}`}
      accessibilityHint="Opens entry details"
      onPress={() => router.push({ pathname: '/entry-detail', params: { id: entry.id } })}
      className={cn('gap-3 px-4 py-3.5 active:opacity-70', showDivider && 'border-b border-border')}>
      <View className="flex-row items-start justify-between gap-3">
        <View className="min-w-0 flex-1 gap-0.5">
          <Text className="text-[17px] font-extrabold leading-[21px] text-foreground" numberOfLines={2}>
            {entry.name}
          </Text>
          <Text className="text-xs font-semibold leading-4 text-muted-foreground">
            {time} · {sourceLabels[entry.source]}
          </Text>
        </View>
        <Text className="text-[15px] font-extrabold text-macro-calories">{entry.calories} kcal</Text>
      </View>
      <MacroSummary values={entry} keys={journalMacros} />
    </Pressable>
  );
}

export function JournalCard({ entries }: { entries: FoodEntry[] }) {
  return (
    <View
      style={continuousBorder}
      className="overflow-hidden rounded-lg border border-border bg-card">
      {entries.map((entry, index) => (
        <EntryRow key={entry.id} entry={entry} showDivider={index < entries.length - 1} />
      ))}
    </View>
  );
}

export function JournalEmpty() {
  return (
    <View
      style={continuousBorder}
      className="items-center gap-1 rounded-lg border border-border bg-card px-5 py-8">
      <Text className="text-center text-[17px] font-extrabold text-foreground">
        Nothing logged yet
      </Text>
      <Text className="text-center text-sm leading-5 text-muted-foreground">
        Use a shortcut above to add your first meal.
      </Text>
    </View>
  );
}
