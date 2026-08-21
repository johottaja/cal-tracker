import { Text, View } from 'react-native';

import { NumericField, SegmentedControl } from '@/components/ui';
import type { ActivityLevel, BiologicalSex } from '@/domain/tdee';
import { ACTIVITY_LEVELS } from '@/domain/tdee';
import { InlineNotice } from '@/features/shared/FeatureUI';
import { SelectableGoalCard } from '@/features/calculator/CalculatorUI';

const sexOptions = ['Male', 'Female'] as const;
type SexLabel = (typeof sexOptions)[number];

const sexFromLabel: Record<SexLabel, BiologicalSex> = {
  Male: 'male',
  Female: 'female',
};

const labelFromSex: Record<BiologicalSex, SexLabel> = {
  male: 'Male',
  female: 'Female',
};

export function BodyStatsStep({
  weightKg,
  heightCm,
  age,
  sex,
  activity,
  validationError,
  onWeightChange,
  onHeightChange,
  onAgeChange,
  onSexChange,
  onActivityChange,
}: {
  weightKg: string;
  heightCm: string;
  age: string;
  sex: BiologicalSex;
  activity: ActivityLevel | null;
  validationError: string | null;
  onWeightChange: (value: string) => void;
  onHeightChange: (value: string) => void;
  onAgeChange: (value: string) => void;
  onSexChange: (value: BiologicalSex) => void;
  onActivityChange: (value: ActivityLevel) => void;
}) {
  return (
    <View className="gap-4">
      <InlineNotice kind="info">
        This is only used to estimate your calories once. Weight, height, age, sex, and activity are
        not saved on this device or in the cloud.
      </InlineNotice>
      <View className="flex-row gap-3">
        <View className="flex-1">
          <NumericField label="Weight (kg)" value={weightKg} onChangeText={onWeightChange} />
        </View>
        <View className="flex-1">
          <NumericField label="Height (cm)" value={heightCm} onChangeText={onHeightChange} integer />
        </View>
      </View>
      <NumericField label="Age" value={age} onChangeText={onAgeChange} integer />
      <View className="gap-2">
        <Text className="text-sm font-bold leading-[18px] text-foreground">Sex (for formula)</Text>
        <Text className="text-[13px] leading-[18px] text-muted-foreground">
          The Mifflin-St Jeor equation uses biological sex for the estimate.
        </Text>
        <SegmentedControl
          values={sexOptions}
          value={labelFromSex[sex]}
          onChange={(label) => onSexChange(sexFromLabel[label])}
        />
      </View>
      <View className="gap-2">
        <Text className="text-sm font-bold leading-[18px] text-foreground">Activity level</Text>
        {ACTIVITY_LEVELS.map((level) => (
          <SelectableGoalCard
            key={level.id}
            title={level.label}
            description={level.description}
            selected={activity === level.id}
            onPress={() => onActivityChange(level.id)}
          />
        ))}
      </View>
      {validationError ? (
        <Text accessibilityRole="alert" className="text-[13px] leading-[18px] text-destructive">
          {validationError}
        </Text>
      ) : null}
    </View>
  );
}
