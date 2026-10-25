import { router, Stack, useLocalSearchParams, useTheme } from 'expo-router';
import { useRef, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { parseAmount } from '@/domain/amount';
import { validateFood, type FoodError, type FoodInput } from '@/domain/food';
import { formatAmountInput } from '@/domain/format';
import type { EnergyBasis, ServingUnit } from '@/domain/portion';
import { parseOptionalAmount } from '@/domain/portionForm';
import { createFood, deleteFood, getFood, setFoodFavorite, updateFood } from '@/services/foods';
import { useServices } from '@/services/ServiceProvider';
import { Button } from '@/ui/Button';
import { Checkbox, ChoiceChips } from '@/ui/ChoiceChips';
import { Screen } from '@/ui/Screen';
import { strings } from '@/ui/strings.fi';
import { TextField } from '@/ui/TextField';

const t = strings.foodForm;

const BASES: readonly EnergyBasis[] = ['per_100g', 'per_100ml', 'per_serving'];
const SERVING_UNITS: readonly ServingUnit[] = ['g', 'ml'];

/** The serving unit implied by the energy basis; only a per-serving basis lets the user pick. */
function servingUnitFor(basis: EnergyBasis, picked: ServingUnit | null): ServingUnit | null {
  if (basis === 'per_100g') return 'g';
  if (basis === 'per_100ml') return 'ml';
  return picked;
}

function errorText(errors: FoodError[], field: FoodError['field']): string | null {
  const error = errors.find((e) => e.field === field);
  if (!error) return null;
  switch (error.field) {
    case 'servingAmount':
      return error.error === 'missing' ? t.errors.servingAmountMissing : t.errors.servingAmount;
    case 'servingUnit':
      return error.error === 'missing'
        ? t.errors.servingUnitMissing
        : t.errors.servingUnitIncompatible;
    default:
      return t.errors[error.field];
  }
}

/** Add or edit an own food with energy, basis and a default serving (OMA-01, OMA-02, OMA-06). */
export default function FoodEditScreen() {
  const ctx = useServices();
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const [existing] = useState(() => (id ? getFood(ctx, id) : null));
  // A new food gets its UUID when the form opens, like entries (KIR-07).
  const [newId] = useState(() => ctx.newId());
  const [name, setName] = useState(existing?.name ?? '');
  const [brand, setBrand] = useState(existing?.brand ?? '');
  const [energy, setEnergy] = useState(
    existing?.energyKcal != null ? formatAmountInput(existing.energyKcal) : '',
  );
  const [basis, setBasis] = useState<EnergyBasis>(existing?.energyBasis ?? 'per_100g');
  const [servingAmount, setServingAmount] = useState(
    existing?.servingAmount != null ? formatAmountInput(existing.servingAmount) : '',
  );
  const [pickedUnit, setPickedUnit] = useState<ServingUnit | null>(existing?.servingUnit ?? null);
  const [servingLabel, setServingLabel] = useState(existing?.servingLabel ?? '');
  const [isFavorite, setIsFavorite] = useState(existing?.isFavorite ?? false);
  const [errors, setErrors] = useState<FoodError[]>([]);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);

  if (id && (!existing || existing.deletedAt !== null || existing.source !== 'user')) {
    return (
      <Screen>
        <Text style={[styles.body, { color: colors.text }]}>{t.notFound}</Text>
      </Screen>
    );
  }

  const save = () => {
    if (savingRef.current) return;
    const energyResult = parseAmount(energy);
    const servingResult = parseOptionalAmount(servingAmount);
    const servingValue = servingResult.ok ? servingResult.value : null;
    const input: FoodInput = {
      name,
      brand,
      energyKcal: energyResult.ok ? energyResult.value : NaN,
      basis,
      servingAmount: servingValue,
      // A unit without a size is meaningless, so it is dropped instead of reported (OMA-02).
      servingUnit: servingValue === null ? null : servingUnitFor(basis, pickedUnit),
      servingLabel,
    };
    const found = validateFood(input);
    if (!servingResult.ok) {
      found.push({ field: 'servingAmount', error: 'invalid' });
    }
    setErrors(found);
    if (found.length > 0) return;
    savingRef.current = true;
    setSaving(true);
    try {
      if (existing) {
        updateFood(ctx, existing.id, input);
        if (existing.isFavorite !== isFavorite) setFoodFavorite(ctx, existing.id, isFavorite);
      } else {
        createFood(ctx, { ...input, id: newId });
        if (isFavorite) setFoodFavorite(ctx, newId, true);
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
          deleteFood(ctx, existing.id);
          router.back();
        },
      },
    ]);
  };

  const fixedUnit = basis === 'per_serving' ? null : servingUnitFor(basis, null);

  return (
    <Screen>
      <Stack.Screen options={{ title: existing ? t.editTitle : t.newTitle }} />
      <TextField
        label={t.nameLabel}
        placeholder={t.namePlaceholder}
        value={name}
        onChangeText={setName}
        error={errorText(errors, 'name')}
        testID="food-name-input"
      />
      <TextField
        label={t.brandLabel}
        value={brand}
        onChangeText={setBrand}
        testID="food-brand-input"
      />
      <TextField
        label={t.energyLabel}
        placeholder={t.energyPlaceholder}
        kind="decimal"
        value={energy}
        onChangeText={setEnergy}
        error={errorText(errors, 'energyKcal')}
        testID="food-energy-input"
      />
      <ChoiceChips
        label={t.basisLabel}
        choices={BASES.map((value) => ({ value, label: t.basisOptions[value] }))}
        selected={basis}
        onSelect={setBasis}
        testID="basis"
      />
      <View style={styles.section}>
        <Text accessibilityRole="header" style={[styles.heading, { color: colors.text }]}>
          {t.servingTitle}
        </Text>
        <Text style={[styles.hint, { color: colors.text }]}>{t.servingHint}</Text>
        <TextField
          label={t.servingLabelLabel}
          placeholder={t.servingLabelPlaceholder}
          value={servingLabel}
          onChangeText={setServingLabel}
          testID="serving-label-input"
        />
        <TextField
          label={t.servingAmountLabel(fixedUnit ? strings.units[fixedUnit] : null)}
          placeholder={t.servingAmountPlaceholder}
          kind="decimal"
          value={servingAmount}
          onChangeText={setServingAmount}
          error={errorText(errors, 'servingAmount')}
          testID="serving-amount-input"
        />
        {basis === 'per_serving' ? (
          <ChoiceChips
            label={t.servingUnitLabel}
            choices={SERVING_UNITS.map((value) => ({ value, label: strings.units[value] }))}
            selected={pickedUnit}
            onSelect={setPickedUnit}
            testID="serving-unit"
          />
        ) : null}
        {errorText(errors, 'servingUnit') ? (
          <Text accessibilityLiveRegion="polite" style={[styles.error, { color: colors.text }]}>
            {'⚠ '}
            {errorText(errors, 'servingUnit')}
          </Text>
        ) : null}
      </View>
      <Checkbox
        label={t.favoriteLabel}
        hint={t.favoriteHint}
        checked={isFavorite}
        onChange={setIsFavorite}
        testID="food-favorite"
      />
      {saveError ? (
        <Text accessibilityLiveRegion="polite" style={[styles.error, { color: colors.text }]}>
          {'⚠ '}
          {saveError}
        </Text>
      ) : null}
      <Button
        label={saving ? strings.entry.saving : t.save}
        onPress={save}
        disabled={saving}
        testID="save-food"
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
  hint: {
    fontSize: 15,
    opacity: 0.8,
  },
  body: {
    fontSize: 17,
  },
  error: {
    fontSize: 15,
    fontWeight: '600',
  },
});
