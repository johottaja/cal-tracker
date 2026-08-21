import { Text, View } from 'react-native';

import {
  calculateCalorieTarget,
  NUTRITION_GOALS,
  type BodyStats,
  type NutritionGoal,
} from '@/domain/tdee';
import { GradientHero, SelectableGoalCard } from '@/features/calculator/CalculatorUI';
import { InlineNotice } from '@/features/shared/FeatureUI';

export function GoalStep({
  bodyStats,
  goal,
  onGoalChange,
}: {
  bodyStats: BodyStats;
  goal: NutritionGoal | null;
  onGoalChange: (value: NutritionGoal) => void;
}) {
  const { tdee, bmr } = calculateCalorieTarget(bodyStats, 'maintenance');

  return (
    <View className="gap-4">
      <GradientHero>
        <Text className="text-sm font-bold text-hero-muted">Your estimated TDEE</Text>
        <Text className="text-[40px] font-black leading-[46px] tracking-tight text-hero-foreground">
          {tdee}
          <Text className="text-xl font-extrabold"> kcal</Text>
        </Text>
        <Text className="text-sm leading-5 text-hero-muted">
          Total daily energy — about what you burn each day at your current activity level.
        </Text>
      </GradientHero>
      <View className="gap-2">
        <Text className="text-sm font-bold leading-[18px] text-foreground">Your goal</Text>
        {NUTRITION_GOALS.map((item) => {
          const target = calculateCalorieTarget(bodyStats, item.id);
          const trailing =
            item.calorieOffset === 0
              ? `${target.targetCalories} kcal`
              : item.calorieOffset > 0
                ? `+${item.calorieOffset} kcal`
                : `${item.calorieOffset} kcal`;
          return (
            <SelectableGoalCard
              key={item.id}
              title={item.label}
              description={item.description}
              selected={goal === item.id}
              onPress={() => onGoalChange(item.id)}
              trailing={goal === item.id ? `${target.targetCalories} kcal` : trailing}
            />
          );
        })}
      </View>
      {goal ? (
        (() => {
          const target = calculateCalorieTarget(bodyStats, goal);
          return target.clampedToBmr ? (
            <InlineNotice kind="info">
              Your target was adjusted to at least your resting burn ({bmr} kcal) so the estimate
              stays within a safe range.
            </InlineNotice>
          ) : null;
        })()
      ) : null}
    </View>
  );
}
