import { useTheme } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { normalizeText } from '@/domain/food';
import { formatAmountInput, formatKcal } from '@/domain/format';
import { allowedUnits, type EnergyData, type PortionUnit } from '@/domain/portion';
import { evaluatePortion } from '@/domain/portionForm';

import { Button } from './Button';
import { ChoiceChips } from './ChoiceChips';
import { energyText, portionErrorMessage, unitLabel } from './portionText';
import { strings } from './strings.fi';
import { TextField } from './TextField';

const t = strings.portion;

export interface PortionValues {
  amount: number;
  unit: PortionUnit;
  /** Only when the name can be edited (KIR-05). */
  name?: string;
}

interface PortionFormProps {
  /** A food is logged by amount and unit, a meal by its share (OMA-05). */
  kind: 'food' | 'meal';
  /** For a meal: the whole meal's energy per serving. */
  energy: EnergyData;
  sourceText: string;
  initial: { unit: PortionUnit; amount: number | null; name?: string };
  /** Shows a name field when an existing entry is corrected (KIR-05). */
  editName?: boolean;
  saveLabel: string;
  /** Saves the values; throwing shows a generic error and unlocks the form. */
  onSave: (values: PortionValues) => void;
}

/**
 * Amount, unit and the computed energy before saving (KIR-03, KIR-04). Units come from the
 * energy basis, so g and ml are never mixed (LAS-02). The save button is locked while saving
 * so that a double tap cannot save twice (KIR-07).
 */
export function PortionForm({
  kind,
  energy,
  sourceText,
  initial,
  editName = false,
  saveLabel,
  onSave,
}: PortionFormProps) {
  const { colors } = useTheme();
  const units = kind === 'meal' ? (['serving'] as PortionUnit[]) : allowedUnits(energy);
  const [unit, setUnit] = useState<PortionUnit>(initial.unit);
  const [amountText, setAmountText] = useState(
    initial.amount === null ? '' : formatAmountInput(initial.amount),
  );
  const [name, setName] = useState(initial.name ?? '');
  const [showErrors, setShowErrors] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // The ref blocks a second tap before React has re-rendered the disabled button.
  const savingRef = useRef(false);

  const result = evaluatePortion(energy, amountText, unit);
  const nameError = editName && normalizeText(name) === null ? strings.entry.nameRequired : null;
  // An empty amount is not an error until saving is tried; a wrong one is shown at once.
  const amountError =
    !result.ok && (showErrors || amountText.trim() !== '')
      ? portionErrorMessage(result.error)
      : null;

  const save = () => {
    if (savingRef.current) return;
    setShowErrors(true);
    if (!result.ok || nameError) return;
    savingRef.current = true;
    setSaving(true);
    try {
      onSave({ amount: result.amount, unit, ...(editName ? { name } : {}) });
    } catch {
      setSaveError(strings.saveFailed);
      savingRef.current = false;
      setSaving(false);
    }
  };

  const energySummary =
    kind === 'meal' && energy.energyKcal !== null
      ? t.wholeMeal(formatKcal(energy.energyKcal))
      : energyText(energy);

  return (
    <>
      {editName ? (
        <TextField
          label={strings.entry.entryNameLabel}
          value={name}
          onChangeText={setName}
          error={showErrors ? nameError : null}
          testID="entry-name-input"
        />
      ) : null}
      <View
        accessible
        accessibilityLabel={`${t.energyTitle}: ${energySummary}. ${sourceText}`}
        style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      >
        <Text style={[styles.cardTitle, { color: colors.text }]}>{t.energyTitle}</Text>
        <Text testID="portion-basis" style={[styles.cardValue, { color: colors.text }]}>
          {energySummary}
        </Text>
        <Text style={[styles.source, { color: colors.text }]}>{sourceText}</Text>
      </View>
      {kind === 'food' && units.length > 0 ? (
        <ChoiceChips
          label={t.unitLabel}
          choices={units.map((value) => ({ value, label: unitLabel(value, energy.serving) }))}
          selected={unit}
          onSelect={setUnit}
          testID="unit"
        />
      ) : null}
      <TextField
        label={kind === 'meal' ? t.shareLabel : t.amountLabel}
        placeholder={kind === 'meal' ? undefined : t.amountPlaceholder}
        hint={kind === 'meal' ? t.shareHint : undefined}
        kind="decimal"
        value={amountText}
        onChangeText={(value) => {
          setAmountText(value);
          setSaveError(null);
        }}
        error={amountError}
        onSubmitEditing={save}
        returnKeyType="done"
        testID="amount-input"
      />
      {kind === 'meal' ? (
        <View style={styles.presets}>
          {t.sharePresets.map((preset) => (
            <Button
              key={preset.value}
              label={preset.label}
              variant="secondary"
              onPress={() => setAmountText(formatAmountInput(preset.value))}
              testID={`share-${preset.value}`}
            />
          ))}
        </View>
      ) : null}
      <Text
        accessibilityLiveRegion="polite"
        testID="portion-total"
        style={[styles.total, { color: colors.text }]}
      >
        {result.ok ? t.total(formatKcal(result.kcal)) : t.totalUnknown}
      </Text>
      {saveError ? (
        <Text accessibilityLiveRegion="polite" style={[styles.error, { color: colors.text }]}>
          {'⚠ '}
          {saveError}
        </Text>
      ) : null}
      <Button
        label={saving ? strings.entry.saving : saveLabel}
        onPress={save}
        disabled={saving}
        testID="save-portion"
      />
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    gap: 4,
  },
  cardTitle: {
    fontSize: 15,
  },
  cardValue: {
    fontSize: 20,
    fontWeight: '600',
  },
  source: {
    fontSize: 15,
    opacity: 0.8,
  },
  presets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  total: {
    fontSize: 24,
    fontWeight: '700',
  },
  error: {
    fontSize: 15,
    fontWeight: '600',
  },
});
