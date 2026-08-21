import { View } from 'react-native';

import { ChoiceActionCard } from '@/features/calculator/CalculatorUI';

export function ChoiceStep({
  onManual,
  onCalculate,
}: {
  onManual: () => void;
  onCalculate: () => void;
}) {
  return (
    <View className="gap-3">
      <ChoiceActionCard
        icon="calculator-outline"
        title="Calculate my macros"
        body="Estimate from your body, activity, and goal."
        onPress={onCalculate}
        highlighted
      />
      <ChoiceActionCard
        icon="create-outline"
        title="Enter my own macros"
        body="I already know my daily calories and macros."
        onPress={onManual}
      />
    </View>
  );
}
