import { useRef, useState } from 'react';

import { parseAmount } from '@/domain/amount';
import { formatAmountInput } from '@/domain/format';

import { Button } from './Button';
import { amountErrorMessage } from './hooks';
import { strings } from './strings.fi';
import { TextField } from './TextField';

const t = strings.entry;

export interface QuickEntryValues {
  kcal: number;
  name: string;
}

interface QuickEntryFormProps {
  initial?: { kcal: number; name: string | null };
  /** Saves the values; throwing shows a generic error and unlocks the form. */
  onSave: (values: QuickEntryValues) => void;
}

/**
 * Energy (required) and name (optional) of a quick entry (KIR-02, KIR-05). The save button is
 * locked while saving so that a double tap cannot save twice (KIR-07).
 */
export function QuickEntryForm({ initial, onSave }: QuickEntryFormProps) {
  const [kcalText, setKcalText] = useState(initial ? formatAmountInput(initial.kcal) : '');
  const [name, setName] = useState(initial?.name ?? '');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // The ref blocks a second tap before React has re-rendered the disabled button.
  const savingRef = useRef(false);

  const save = () => {
    if (savingRef.current) return;
    const result = parseAmount(kcalText);
    if (!result.ok) {
      setError(amountErrorMessage(result.error));
      return;
    }
    savingRef.current = true;
    setSaving(true);
    try {
      onSave({ kcal: result.value, name });
    } catch {
      setError(strings.saveFailed);
      savingRef.current = false;
      setSaving(false);
    }
  };

  return (
    <>
      <TextField
        label={t.kcalLabel}
        placeholder={t.kcalPlaceholder}
        kind="decimal"
        value={kcalText}
        onChangeText={(value) => {
          setKcalText(value);
          setError(null);
        }}
        error={error}
        autoFocus={!initial}
        testID="kcal-input"
      />
      <TextField
        label={t.nameLabel}
        placeholder={t.namePlaceholder}
        value={name}
        onChangeText={setName}
        onSubmitEditing={save}
        returnKeyType="done"
        testID="name-input"
      />
      <Button
        label={saving ? t.saving : t.save}
        onPress={save}
        disabled={saving}
        testID="save-entry"
      />
    </>
  );
}
