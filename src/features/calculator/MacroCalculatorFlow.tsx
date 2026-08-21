import { useCallback, useEffect, useMemo, useState } from 'react';
import { BackHandler, Text, View } from 'react-native';

import { AppButton, Heading, Screen } from '@/components/ui';
import type { MacroValues } from '@/domain/models';
import {
  calculateMacrosFromGoal,
  DEFAULT_MACRO_GOALS,
  validateBodyStats,
  type ActivityLevel,
  type BiologicalSex,
  type BodyStats,
  type NutritionGoal,
} from '@/domain/tdee';
import { StepDots } from '@/features/calculator/CalculatorUI';
import { BodyStatsStep } from '@/features/calculator/steps/BodyStatsStep';
import { ChoiceStep } from '@/features/calculator/steps/ChoiceStep';
import {
  ConfirmMacrosStep,
  macroFormFromValues,
  parseMacroForm,
} from '@/features/calculator/steps/ConfirmMacrosStep';
import { DisclaimerStep } from '@/features/calculator/steps/DisclaimerStep';
import { GoalStep } from '@/features/calculator/steps/GoalStep';

type WizardStep = 'choice' | 'body_stats' | 'goal' | 'confirm_macros' | 'disclaimer';
type CalculatorPath = 'manual' | 'calculator';

const STEP_TITLES: Record<WizardStep, { title: string; subtitle?: string }> = {
  choice: {
    title: 'Set your daily goals',
    subtitle: 'Calculate a starting point or enter your own macros.',
  },
  body_stats: {
    title: 'About you',
    subtitle: 'We use this to estimate how many calories you burn each day.',
  },
  goal: {
    title: 'Your goal',
    subtitle: 'Pick what you want to work toward.',
  },
  confirm_macros: {
    title: 'Your daily macros',
    subtitle: 'Review and adjust before you start.',
  },
  disclaimer: {
    title: 'One last thing',
    subtitle: 'A quick reminder before you begin.',
  },
};

function stepsForMode(mode: 'first_run' | 'recalculate'): WizardStep[] {
  if (mode === 'first_run') {
    return ['choice', 'body_stats', 'goal', 'confirm_macros', 'disclaimer'];
  }
  return ['body_stats', 'goal', 'confirm_macros', 'disclaimer'];
}

export function MacroCalculatorFlow({
  mode,
  busy,
  error,
  onSaveGoals,
  onClose,
}: {
  mode: 'first_run' | 'recalculate';
  busy: boolean;
  error?: string | null;
  onSaveGoals: (goals: MacroValues) => Promise<void>;
  onClose?: () => void;
}) {
  const stepOrder = useMemo(() => stepsForMode(mode), [mode]);
  const [stepIndex, setStepIndex] = useState(0);
  const currentStep: WizardStep = stepOrder[stepIndex] ?? stepOrder[0] ?? 'choice';

  const [path, setPath] = useState<CalculatorPath | null>(null);
  const [weightKg, setWeightKg] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [age, setAge] = useState('');
  const [sex, setSex] = useState<BiologicalSex>('male');
  const [activity, setActivity] = useState<ActivityLevel | null>(null);
  const [goal, setGoal] = useState<NutritionGoal | null>(null);
  const [macroForm, setMacroForm] = useState(() => macroFormFromValues(DEFAULT_MACRO_GOALS));
  const [validationError, setValidationError] = useState<string | null>(null);

  const bodyStats = useMemo((): BodyStats | null => {
    const parsed = {
      weightKg: Number(weightKg),
      heightCm: Number(heightCm),
      age: Number(age),
    };
    if (validateBodyStats(parsed) || !activity) return null;
    return { ...parsed, sex, activity };
  }, [activity, age, heightCm, sex, weightKg]);

  const goToStep = useCallback(
    (step: WizardStep) => {
      const index = stepOrder.indexOf(step);
      if (index >= 0) setStepIndex(index);
    },
    [stepOrder],
  );

  const goBack = useCallback(() => {
    if (stepIndex > 0) {
      setStepIndex((current) => current - 1);
      setValidationError(null);
      return;
    }
    onClose?.();
  }, [onClose, stepIndex]);

  useEffect(() => {
    if (!onClose) return undefined;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      goBack();
      return true;
    });
    return () => subscription.remove();
  }, [goBack, onClose]);

  const updateMacroForm = (key: keyof MacroValues, value: string) => {
    setMacroForm((current) => ({ ...current, [key]: value }));
    setValidationError(null);
  };

  const handleManualChoice = () => {
    setPath('manual');
    setMacroForm(macroFormFromValues(DEFAULT_MACRO_GOALS));
    goToStep('confirm_macros');
  };

  const handleCalculateChoice = () => {
    setPath('calculator');
    goToStep('body_stats');
  };

  const handleBodyStatsContinue = () => {
    const parsed = {
      weightKg: Number(weightKg),
      heightCm: Number(heightCm),
      age: Number(age),
    };
    const statsError = validateBodyStats(parsed);
    if (statsError) {
      setValidationError(statsError);
      return;
    }
    if (!activity) {
      setValidationError('Select your activity level.');
      return;
    }
    setValidationError(null);
    setStepIndex((current) => current + 1);
  };

  const handleGoalContinue = () => {
    if (!goal || !bodyStats) {
      setValidationError('Select a goal to continue.');
      return;
    }
    setMacroForm(macroFormFromValues(calculateMacrosFromGoal(bodyStats, goal)));
    setValidationError(null);
    setStepIndex((current) => current + 1);
  };

  const handleConfirmContinue = () => {
    const parsed = parseMacroForm(macroForm);
    if (!parsed) {
      setValidationError('Goals must be non-negative numbers.');
      return;
    }
    setValidationError(null);
    setStepIndex((current) => current + 1);
  };

  const handleSave = async () => {
    const parsed = parseMacroForm(macroForm);
    if (!parsed) {
      setValidationError('Goals must be non-negative numbers.');
      return;
    }
    await onSaveGoals(parsed);
  };

  const continueLabel =
    currentStep === 'disclaimer'
      ? mode === 'first_run'
        ? 'Start tracking'
        : 'Save goals'
      : 'Continue';

  const handleContinue = () => {
    switch (currentStep) {
      case 'body_stats':
        handleBodyStatsContinue();
        break;
      case 'goal':
        handleGoalContinue();
        break;
      case 'confirm_macros':
        handleConfirmContinue();
        break;
      case 'disclaimer':
        void handleSave();
        break;
      default:
        break;
    }
  };

  const showBack = stepIndex > 0 || Boolean(onClose);
  const stepMeta = STEP_TITLES[currentStep];
  const isDisclaimer = currentStep === 'disclaimer';

  if (isDisclaimer) {
    return (
      <Screen scroll={false} style={{ paddingTop: mode === 'first_run' ? 24 : 8, flex: 1 }}>
        <StepDots total={stepOrder.length} current={stepIndex} />
        <View className="flex-1 justify-center">
          <View className="items-center gap-6">
            <Heading
              title={stepMeta.title}
              centered
              {...(stepMeta.subtitle ? { subtitle: stepMeta.subtitle } : {})}
            />
            <DisclaimerStep />
          </View>
        </View>
        <View className="gap-3 pb-4">
          <AppButton
            label={continueLabel}
            onPress={handleContinue}
            loading={busy}
            disabled={busy}
          />
          {showBack ? (
            <AppButton label="Back" variant="ghost" onPress={goBack} disabled={busy} />
          ) : null}
        </View>
        {error ? (
          <Text accessibilityRole="alert" className="text-center text-sm leading-5 text-destructive">
            {error}
          </Text>
        ) : null}
      </Screen>
    );
  }

  return (
    <Screen style={{ paddingTop: mode === 'first_run' ? 24 : 8 }}>
      <StepDots total={stepOrder.length} current={stepIndex} />
      <Heading
        title={stepMeta.title}
        {...(stepMeta.subtitle ? { subtitle: stepMeta.subtitle } : {})}
      />

      {currentStep === 'choice' ? (
        <ChoiceStep onManual={handleManualChoice} onCalculate={handleCalculateChoice} />
      ) : null}

      {currentStep === 'body_stats' ? (
        <BodyStatsStep
          weightKg={weightKg}
          heightCm={heightCm}
          age={age}
          sex={sex}
          activity={activity}
          validationError={validationError}
          onWeightChange={setWeightKg}
          onHeightChange={setHeightCm}
          onAgeChange={setAge}
          onSexChange={setSex}
          onActivityChange={setActivity}
        />
      ) : null}

      {currentStep === 'goal' && bodyStats ? (
        <GoalStep bodyStats={bodyStats} goal={goal} onGoalChange={setGoal} />
      ) : null}

      {currentStep === 'confirm_macros' ? (
        <ConfirmMacrosStep
          values={macroForm}
          onChange={updateMacroForm}
          validationError={validationError}
          fromCalculator={path === 'calculator'}
        />
      ) : null}

      {currentStep === 'goal' && validationError ? (
        <Text accessibilityRole="alert" className="text-[13px] leading-[18px] text-destructive">
          {validationError}
        </Text>
      ) : null}

      <View className="gap-3 pt-2">
        {currentStep !== 'choice' ? (
          <AppButton
            label={continueLabel}
            onPress={handleContinue}
            loading={busy}
            disabled={busy}
          />
        ) : null}
        {showBack ? (
          <AppButton
            label="Back"
            variant="ghost"
            onPress={goBack}
            disabled={busy}
          />
        ) : null}
      </View>

      {error ? (
        <Text accessibilityRole="alert" className="text-center text-sm leading-5 text-destructive">
          {error}
        </Text>
      ) : null}
    </Screen>
  );
}
