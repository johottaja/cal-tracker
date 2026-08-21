import { Text, View } from 'react-native';

import { AppIcon } from '@/components/AppIcon';

export function DisclaimerStep() {
  return (
    <View className="items-center gap-5 px-2">
      <View className="h-14 w-14 items-center justify-center rounded-full bg-primary-soft">
        <AppIcon name="heart-outline" size={28} className="text-primary" />
      </View>
      <Text className="text-center text-xl font-extrabold leading-7 text-foreground">
        Wellbeing comes first
      </Text>
      <View className="gap-4">
        <Text className="text-center text-base leading-[24px] text-muted-foreground">
          These numbers are a starting point, not a verdict. How you feel, your energy, and your
          mental health matter more than hitting a calorie target.
        </Text>
        <Text className="text-center text-base leading-[24px] text-muted-foreground">
          Tracking can help — take it with a grain of salt. There is more to a good life than the
          log.
        </Text>
      </View>
    </View>
  );
}
