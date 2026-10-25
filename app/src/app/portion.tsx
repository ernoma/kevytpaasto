import { router, useLocalSearchParams, useTheme } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text } from 'react-native';

import { defaultFineliServing } from '@/domain/fineli';
import { initialPortion } from '@/domain/portionForm';
import { fineliEnergy, getFineliFood, isFineliAvailable } from '@/services/fineli';
import { foodEnergy, getFood } from '@/services/foods';
import { saveFineliEntry, saveFoodEntry, saveMealEntry } from '@/services/logEntries';
import { getMeal } from '@/services/meals';
import { useServices } from '@/services/ServiceProvider';
import { useServiceQuery } from '@/ui/hooks';
import { PortionForm } from '@/ui/PortionForm';
import { Screen } from '@/ui/Screen';
import { strings } from '@/ui/strings.fi';

const t = strings.portion;

/**
 * Amount of a food or share of a meal, with the computed energy shown before saving
 * (KIR-03, KIR-04, OMA-05).
 */
export default function PortionScreen() {
  const ctx = useServices();
  const { colors } = useTheme();
  const { fastDayId, foodId, mealId, fineliId } = useLocalSearchParams<{
    fastDayId: string;
    foodId?: string;
    mealId?: string;
    fineliId?: string;
  }>();
  // KIR-07: the entry's UUID is created when the form opens, so repeating the save cannot add
  // a second row.
  const [id] = useState(() => ctx.newId());
  const query = useCallback(
    () => ({
      food: foodId ? getFood(ctx, foodId) : null,
      meal: mealId ? getMeal(ctx, mealId) : null,
      fineli: fineliId && isFineliAvailable(ctx) ? getFineliFood(ctx, Number(fineliId)) : null,
    }),
    [ctx, foodId, mealId, fineliId],
  );
  const { data } = useServiceQuery(query);

  const message = (text: string) => (
    <Screen>
      <Text style={[styles.body, { color: colors.text }]}>{text}</Text>
    </Screen>
  );
  // Back to the day view, also when the amount view was opened from the add view.
  const done = () => router.dismissTo('/');

  if (data.food) {
    const food = data.food;
    if (food.deletedAt !== null) return message(t.deleted);
    const energy = foodEnergy(food);
    const initial = initialPortion(energy);
    if (!initial || food.energyKcal === null) return message(t.cannotLog);
    return (
      <Screen>
        <Text accessibilityRole="header" style={[styles.heading, { color: colors.text }]}>
          {food.name}
        </Text>
        <PortionForm
          kind="food"
          energy={energy}
          sourceText={t.sourceFood}
          initial={initial}
          saveLabel={t.save}
          onSave={({ amount, unit }) => {
            saveFoodEntry(ctx, { id, fastDayId, foodId: food.id, amount, unit });
            done();
          }}
        />
      </Screen>
    );
  }

  if (data.fineli) {
    const item = data.fineli;
    if (item.energyKcal === null) return message(t.cannotLog);
    // Household units in grams; the medium portion is preselected and copied with the food.
    const servingChoices = item.servings.map((s) => ({
      key: s.unit,
      serving: { amount: s.massG, unit: 'g' as const, label: strings.fineliUnits[s.unit] },
    }));
    const defaultServing = defaultFineliServing(item.servings);
    const defaultChoice = servingChoices.find((s) => s.key === defaultServing?.unit) ?? null;
    return (
      <Screen>
        <Text accessibilityRole="header" style={[styles.heading, { color: colors.text }]}>
          {item.name}
        </Text>
        <PortionForm
          kind="food"
          energy={fineliEnergy(item)}
          servingChoices={servingChoices}
          sourceText={t.sourceFineli(item.processFi)}
          initial={
            defaultChoice
              ? { unit: 'serving', amount: 1, servingKey: defaultChoice.key }
              : { unit: 'g', amount: null }
          }
          saveLabel={t.save}
          onSave={({ amount, unit, serving }) => {
            saveFineliEntry(ctx, {
              id,
              fastDayId,
              fineliId: item.id,
              amount,
              unit: unit === 'serving' ? 'serving' : 'g',
              serving: serving ?? null,
              defaultServing: defaultChoice?.serving ?? null,
            });
            done();
          }}
        />
      </Screen>
    );
  }

  if (data.meal) {
    const { meal, kcal } = data.meal;
    if (meal.deletedAt !== null) return message(t.deleted);
    if (kcal === null) return message(t.cannotLog);
    return (
      <Screen>
        <Text accessibilityRole="header" style={[styles.heading, { color: colors.text }]}>
          {meal.name}
        </Text>
        <PortionForm
          kind="meal"
          energy={{ energyKcal: kcal, basis: 'per_serving' }}
          sourceText={t.sourceMeal}
          initial={{ unit: 'serving', amount: 1 }}
          saveLabel={t.save}
          onSave={({ amount }) => {
            saveMealEntry(ctx, { id, fastDayId, mealId: meal.id, fraction: amount });
            done();
          }}
        />
      </Screen>
    );
  }

  return message(t.notFound);
}

const styles = StyleSheet.create({
  heading: {
    fontSize: 24,
    fontWeight: '700',
  },
  body: {
    fontSize: 17,
  },
});
