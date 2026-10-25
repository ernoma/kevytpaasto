import { router, Stack, useLocalSearchParams, useTheme } from 'expo-router';
import { useRef, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { normalizeText } from '@/domain/food';
import { formatAmountInput, formatKcal } from '@/domain/format';
import { allowedUnits, type PortionUnit } from '@/domain/portion';
import { evaluatePortion, initialPortion } from '@/domain/portionForm';
import { foodEnergy, listFoods, type Food } from '@/services/foods';
import { createMeal, deleteMeal, getMeal, updateMeal } from '@/services/meals';
import { useServices } from '@/services/ServiceProvider';
import { Button } from '@/ui/Button';
import { Checkbox, ChoiceChips } from '@/ui/ChoiceChips';
import { energyText, portionErrorMessage, unitLabel } from '@/ui/portionText';
import { Screen } from '@/ui/Screen';
import { strings } from '@/ui/strings.fi';
import { TextField } from '@/ui/TextField';

const t = strings.mealForm;

interface ItemState {
  key: string;
  food: Food;
  amountText: string;
  unit: PortionUnit;
}

function evaluateItem(item: ItemState) {
  return evaluatePortion(foodEnergy(item.food), item.amountText, item.unit);
}

/**
 * Build a named meal from own foods; its energy is always computed from the items (OMA-04).
 * Editing or deleting it does not change earlier entries (OMA-06, KIR-08).
 */
export default function MealEditScreen() {
  const ctx = useServices();
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [existing] = useState(() => (id ? getMeal(ctx, id) : null));
  const [foods] = useState(() => listFoods(ctx));
  const [newId] = useState(() => ctx.newId());
  const [name, setName] = useState(existing?.meal.name ?? '');
  const [isFavorite, setIsFavorite] = useState(existing?.meal.isFavorite ?? true);
  const [items, setItems] = useState<ItemState[]>(
    () =>
      existing?.items.map((item) => ({
        key: item.id,
        food: item.food,
        amountText: formatAmountInput(item.amount),
        unit: item.unit as PortionUnit,
      })) ?? [],
  );
  const [picking, setPicking] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);

  if (id && (!existing || existing.meal.deletedAt !== null)) {
    return (
      <Screen>
        <Text style={[styles.body, { color: colors.text }]}>{t.notFound}</Text>
      </Screen>
    );
  }

  const results = items.map(evaluateItem);
  const total = results.every((r) => r.ok)
    ? results.reduce((sum, r) => sum + (r.ok ? r.kcal : 0), 0)
    : null;
  const nameError = normalizeText(name) === null ? t.errors.name : null;
  const itemsError = items.length === 0 ? t.errors.items : null;

  const updateItem = (key: string, changes: Partial<ItemState>) =>
    setItems((current) =>
      current.map((item) => (item.key === key ? { ...item, ...changes } : item)),
    );

  const addItem = (food: Food) => {
    const initial = initialPortion(foodEnergy(food));
    if (!initial) return;
    setItems((current) => [
      ...current,
      {
        key: ctx.newId(),
        food,
        amountText: initial.amount === null ? '' : formatAmountInput(initial.amount),
        unit: initial.unit,
      },
    ]);
    setPicking(false);
  };

  const save = () => {
    if (savingRef.current) return;
    setShowErrors(true);
    if (nameError || itemsError || total === null) return;
    const input = {
      name,
      isFavorite,
      items: items.map((item, index) => {
        const result = results[index]!;
        return { foodId: item.food.id, amount: result.ok ? result.amount : 0, unit: item.unit };
      }),
    };
    savingRef.current = true;
    setSaving(true);
    try {
      if (existing) {
        updateMeal(ctx, existing.meal.id, input);
      } else {
        createMeal(ctx, { ...input, id: newId });
      }
      router.back();
    } catch {
      setSaveError(strings.saveFailed);
      savingRef.current = false;
      setSaving(false);
    }
  };

  const confirmDelete = () => {
    if (!existing) return;
    Alert.alert(t.deleteTitle, t.deleteMessage, [
      { text: strings.cancel, style: 'cancel' },
      {
        text: t.deleteConfirm,
        style: 'destructive',
        onPress: () => {
          deleteMeal(ctx, existing.meal.id);
          router.back();
        },
      },
    ]);
  };

  const pickable = foods.filter((food) => initialPortion(foodEnergy(food)) !== null);

  return (
    <Screen>
      <Stack.Screen options={{ title: existing ? t.editTitle : t.newTitle }} />
      <TextField
        label={t.nameLabel}
        placeholder={t.namePlaceholder}
        value={name}
        onChangeText={setName}
        error={showErrors ? nameError : null}
        testID="meal-name-input"
      />
      <View style={styles.section}>
        <Text accessibilityRole="header" style={[styles.heading, { color: colors.text }]}>
          {t.itemsTitle}
        </Text>
        {items.length === 0 ? (
          <Text style={[styles.body, { color: colors.text }]}>
            {showErrors ? `⚠ ${t.noItems}` : t.noItems}
          </Text>
        ) : null}
        {items.map((item, index) => {
          const energy = foodEnergy(item.food);
          const result = results[index]!;
          const itemName =
            item.food.deletedAt === null
              ? item.food.name
              : `${item.food.name} ${strings.foods.deletedFood}`;
          const showError = !result.ok && (showErrors || item.amountText.trim() !== '');
          return (
            <View
              key={item.key}
              style={[styles.item, { borderColor: colors.border, backgroundColor: colors.card }]}
            >
              <Text style={[styles.itemName, { color: colors.text }]}>{itemName}</Text>
              <Text style={[styles.hint, { color: colors.text }]}>{energyText(energy)}</Text>
              <ChoiceChips
                label={strings.portion.unitLabel}
                choices={allowedUnits(energy).map((value) => ({
                  value,
                  label: unitLabel(value, energy.serving),
                }))}
                selected={item.unit}
                onSelect={(unit) => updateItem(item.key, { unit })}
                testID={`item-${index}-unit`}
              />
              <TextField
                label={t.itemAmountLabel(item.food.name)}
                kind="decimal"
                value={item.amountText}
                onChangeText={(amountText) => updateItem(item.key, { amountText })}
                error={showError && !result.ok ? portionErrorMessage(result.error) : null}
                testID={`item-${index}-amount`}
              />
              <Text style={[styles.itemKcal, { color: colors.text }]}>
                {result.ok ? t.itemKcal(formatKcal(result.kcal)) : strings.portion.totalUnknown}
              </Text>
              <Button
                label={t.removeItem}
                accessibilityLabel={t.removeItemLabel(item.food.name)}
                variant="destructive"
                onPress={() => setItems((current) => current.filter((i) => i.key !== item.key))}
              />
            </View>
          );
        })}
        {picking ? (
          <View style={styles.section}>
            <Text accessibilityRole="header" style={[styles.subheading, { color: colors.text }]}>
              {t.pickTitle}
            </Text>
            {pickable.length === 0 ? (
              <Text style={[styles.body, { color: colors.text }]}>{t.noFoodsToPick}</Text>
            ) : (
              pickable.map((food) => (
                <Button
                  key={food.id}
                  label={food.name}
                  accessibilityLabel={t.pickLabel(food.name)}
                  variant="secondary"
                  onPress={() => addItem(food)}
                  testID={`pick-${food.name}`}
                />
              ))
            )}
            <Button label={t.closePicker} variant="secondary" onPress={() => setPicking(false)} />
          </View>
        ) : (
          <Button
            label={t.addItem}
            variant="secondary"
            onPress={() => setPicking(true)}
            testID="add-meal-item"
          />
        )}
      </View>
      <Text
        accessibilityLiveRegion="polite"
        testID="meal-total"
        style={[styles.total, { color: colors.text }]}
      >
        {total === null || items.length === 0 ? t.totalUnknown : t.total(formatKcal(total))}
      </Text>
      <Checkbox
        label={t.favoriteLabel}
        hint={t.favoriteHint}
        checked={isFavorite}
        onChange={setIsFavorite}
        testID="meal-favorite"
      />
      {saveError || (showErrors && total === null && items.length > 0) ? (
        <Text accessibilityLiveRegion="polite" style={[styles.error, { color: colors.text }]}>
          {'⚠ '}
          {saveError ?? t.errors.item}
        </Text>
      ) : null}
      <Button
        label={saving ? strings.entry.saving : t.save}
        onPress={save}
        disabled={saving}
        testID="save-meal"
      />
      {existing ? <Button label={t.delete} variant="destructive" onPress={confirmDelete} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 12,
  },
  heading: {
    fontSize: 20,
    fontWeight: '600',
  },
  subheading: {
    fontSize: 18,
    fontWeight: '600',
  },
  body: {
    fontSize: 17,
  },
  hint: {
    fontSize: 15,
    opacity: 0.8,
  },
  item: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  itemName: {
    fontSize: 18,
    fontWeight: '600',
  },
  itemKcal: {
    fontSize: 17,
    fontWeight: '600',
  },
  total: {
    fontSize: 22,
    fontWeight: '700',
  },
  error: {
    fontSize: 15,
    fontWeight: '600',
  },
});
