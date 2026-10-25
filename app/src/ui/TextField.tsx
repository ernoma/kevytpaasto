import { useTheme } from 'expo-router';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { MIN_TOUCH_SIZE } from './theme';

interface TextFieldProps extends Pick<
  TextInputProps,
  'value' | 'onChangeText' | 'onSubmitEditing' | 'placeholder' | 'autoFocus' | 'returnKeyType'
> {
  label: string;
  /** Shown as text below the field, never as colour alone (LAA-06). */
  error?: string | null;
  hint?: string;
  /** "decimal" shows a numeric keyboard with a decimal separator (LAS-05). */
  kind?: 'text' | 'decimal';
  testID?: string;
}

export function TextField({ label, error, hint, kind = 'text', testID, ...input }: TextFieldProps) {
  const { colors } = useTheme();
  const description = error ?? hint;
  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      <TextInput
        {...input}
        accessibilityLabel={label}
        accessibilityHint={description ?? undefined}
        keyboardType={kind === 'decimal' ? 'decimal-pad' : 'default'}
        autoCapitalize={kind === 'decimal' ? 'none' : 'sentences'}
        placeholderTextColor={colors.border}
        testID={testID}
        style={[
          styles.input,
          {
            color: colors.text,
            borderColor: error ? colors.notification : colors.border,
            backgroundColor: colors.card,
          },
        ]}
      />
      {error ? (
        <Text accessibilityLiveRegion="polite" style={[styles.error, { color: colors.text }]}>
          {'⚠ '}
          {error}
        </Text>
      ) : hint ? (
        <Text style={[styles.hint, { color: colors.text }]}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
  input: {
    minHeight: MIN_TOUCH_SIZE,
    borderWidth: 2,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 18,
  },
  error: {
    fontSize: 15,
    fontWeight: '600',
  },
  hint: {
    fontSize: 15,
    opacity: 0.8,
  },
});
