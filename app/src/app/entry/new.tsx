import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { saveQuickEntry } from '@/services/logEntries';
import { useServices } from '@/services/ServiceProvider';
import { QuickEntryForm } from '@/ui/QuickEntryForm';
import { Screen } from '@/ui/Screen';

/** Quick entry: energy only, name optional (KIR-02). */
export default function NewEntryScreen() {
  const ctx = useServices();
  const { fastDayId } = useLocalSearchParams<{ fastDayId: string }>();
  // KIR-07: the entry's UUID is created when the form opens, so repeating the save cannot add
  // a second row.
  const [id] = useState(() => ctx.newId());

  return (
    <Screen>
      <QuickEntryForm
        onSave={({ kcal, name }) => {
          saveQuickEntry(ctx, { id, fastDayId, kcal, name });
          router.back();
        }}
      />
    </Screen>
  );
}
