import { router, useLocalSearchParams, useTheme } from 'expo-router';
import { useCallback } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { formatDateFi } from '@/domain/format';
import type { PortionUnit } from '@/domain/portion';
import { listFastDays } from '@/services/fastDays';
import {
  deleteEntry,
  entryEnergy,
  getEntry,
  moveEntry,
  updateFoodEntry,
  updateMealEntry,
  updateQuickEntry,
  type LogEntry,
} from '@/services/logEntries';
import { useServices } from '@/services/ServiceProvider';
import { Button } from '@/ui/Button';
import { useServiceQuery } from '@/ui/hooks';
import { PortionForm } from '@/ui/PortionForm';
import { QuickEntryForm } from '@/ui/QuickEntryForm';
import { Screen } from '@/ui/Screen';
import { strings } from '@/ui/strings.fi';

const t = strings.entry;

/** Correct, delete or move an entry (KIR-05). */
export default function EditEntryScreen() {
  const ctx = useServices();
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useCallback(
    () => ({ entry: getEntry(ctx, id), days: listFastDays(ctx) }),
    [ctx, id],
  );
  const { data } = useServiceQuery(query);
  const { entry } = data;

  if (!entry) {
    return (
      <Screen>
        <Text style={[styles.body, { color: colors.text }]}>{t.notFound}</Text>
      </Screen>
    );
  }

  const otherDays = data.days.filter((day) => day.id !== entry.fastDayId);

  const confirmDelete = () => {
    Alert.alert(t.deleteTitle, undefined, [
      { text: strings.cancel, style: 'cancel' },
      {
        text: t.deleteConfirm,
        style: 'destructive',
        onPress: () => {
          deleteEntry(ctx, entry.id);
          router.back();
        },
      },
    ]);
  };

  return (
    <Screen>
      <EntryForm entry={entry} />
      <Button label={t.delete} variant="destructive" onPress={confirmDelete} />
      <View style={styles.section}>
        <Text accessibilityRole="header" style={[styles.heading, { color: colors.text }]}>
          {t.moveTitle}
        </Text>
        {otherDays.length === 0 ? (
          <Text style={[styles.body, { color: colors.text }]}>{t.noOtherDays}</Text>
        ) : (
          otherDays.map((day) => (
            <Button
              key={day.id}
              label={t.moveTo(formatDateFi(day.date))}
              variant="secondary"
              onPress={() => {
                moveEntry(ctx, entry.id, day.id);
                router.back();
              }}
            />
          ))
        )}
      </View>
    </Screen>
  );
}

/**
 * The correction form for the entry's kind (KIR-05). Food and meal entries are recomputed from
 * their own snapshot, never from the current food or meal (KIR-08).
 */
function EntryForm({ entry }: { entry: LogEntry }) {
  const ctx = useServices();
  if (entry.originType === 'food') {
    return (
      <PortionForm
        kind="food"
        energy={entryEnergy(entry)}
        sourceText={t.snapshotSource}
        initial={{ unit: entry.unit as PortionUnit, amount: entry.amount, name: entry.name ?? '' }}
        editName
        saveLabel={strings.portion.saveChanges}
        onSave={({ amount, unit, name }) => {
          updateFoodEntry(ctx, entry.id, { amount, unit, name });
          router.back();
        }}
      />
    );
  }
  if (entry.originType === 'meal') {
    return (
      <PortionForm
        kind="meal"
        energy={{ energyKcal: entry.energyKcalPerBasis, basis: 'per_serving' }}
        sourceText={t.snapshotSource}
        initial={{
          unit: 'serving',
          amount: entry.mealFraction ?? entry.amount,
          name: entry.name ?? '',
        }}
        editName
        saveLabel={strings.portion.saveChanges}
        onSave={({ amount, name }) => {
          updateMealEntry(ctx, entry.id, { fraction: amount, name });
          router.back();
        }}
      />
    );
  }
  return (
    <QuickEntryForm
      initial={entry}
      onSave={({ kcal, name }) => {
        updateQuickEntry(ctx, entry.id, { kcal, name });
        router.back();
      }}
    />
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 12,
    marginTop: 8,
  },
  heading: {
    fontSize: 20,
    fontWeight: '600',
  },
  body: {
    fontSize: 17,
  },
});
