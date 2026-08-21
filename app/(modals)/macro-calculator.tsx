import { useState } from 'react';

import type { MacroValues } from '@/domain/models';
import { MacroCalculatorFlow } from '@/features/calculator/MacroCalculatorFlow';
import { closeModal } from '@/navigation/modals';
import { useApp } from '@/providers/AppProvider';

export function MacroCalculatorModal() {
  const { saveGoals } = useApp();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async (goals: MacroValues) => {
    setBusy(true);
    setError(null);
    try {
      await saveGoals(goals);
      closeModal();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Could not save goals.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <MacroCalculatorFlow
      mode="recalculate"
      busy={busy}
      error={error}
      onSaveGoals={handleSave}
      onClose={closeModal}
    />
  );
}

export { MacroCalculatorModal as default };
