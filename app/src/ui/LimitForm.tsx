import { useState } from 'react';

import { formatAmountInput } from '@/domain/format';
import { parseLimit } from '@/domain/limit';

import { Button } from './Button';
import { amountErrorMessage } from './hooks';
import { TextField } from './TextField';

interface LimitFormProps {
  label: string;
  submitLabel: string;
  initial?: number | null;
  placeholder?: string;
  hint?: string;
  autoFocus?: boolean;
  onSave: (limitKcal: number) => void;
  /** Called when the user edits the value, e.g. to hide an earlier confirmation. */
  onEdit?: () => void;
}

/** A calorie limit field that accepts a decimal comma (KAY-01, KAY-03, LAS-05). */
export function LimitForm({
  initial,
  label,
  submitLabel,
  onSave,
  onEdit,
  ...field
}: LimitFormProps) {
  const [text, setText] = useState(initial == null ? '' : formatAmountInput(initial));
  const [error, setError] = useState<string | null>(null);

  const submit = () => {
    const result = parseLimit(text);
    if (!result.ok) {
      setError(amountErrorMessage(result.error));
      return;
    }
    onSave(result.value);
  };

  return (
    <>
      <TextField
        {...field}
        label={label}
        kind="decimal"
        value={text}
        onChangeText={(value) => {
          setText(value);
          setError(null);
          onEdit?.();
        }}
        onSubmitEditing={submit}
        returnKeyType="done"
        error={error}
        testID="limit-input"
      />
      <Button label={submitLabel} onPress={submit} testID="limit-submit" />
    </>
  );
}
