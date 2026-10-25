import { useTheme } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { strings } from './strings.fi';
import { MIN_TOUCH_SIZE } from './theme';

export interface Choice<T extends string> {
  value: T;
  label: string;
  /** Defaults to the visible label. */
  accessibilityLabel?: string;
}

interface ChoiceChipsProps<T extends string> {
  label: string;
  choices: readonly Choice<T>[];
  selected: T | null;
  onSelect: (value: T) => void;
  testID?: string;
}

/**
 * A single choice shown as buttons that wrap on enlarged text (LAA-06). The selected one is
 * marked with a check mark and outline, not by colour alone.
 */
export function ChoiceChips<T extends string>({
  label,
  choices,
  selected,
  onSelect,
  testID,
}: ChoiceChipsProps<T>) {
  const { colors } = useTheme();
  return (
    <View style={styles.container} accessibilityRole="radiogroup" accessibilityLabel={label}>
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      <View style={styles.chips}>
        {choices.map((choice) => {
          const isSelected = choice.value === selected;
          return (
            <Pressable
              key={choice.value}
              accessibilityRole="radio"
              accessibilityLabel={choice.accessibilityLabel ?? choice.label}
              accessibilityState={{ selected: isSelected, checked: isSelected }}
              onPress={() => onSelect(choice.value)}
              testID={testID ? `${testID}-${choice.value}` : undefined}
              style={({ pressed }) => [
                styles.chip,
                {
                  borderColor: isSelected ? colors.primary : colors.border,
                  backgroundColor: isSelected ? colors.primary : colors.card,
                },
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.chipText, { color: isSelected ? '#ffffff' : colors.text }]}>
                {isSelected ? `✓ ${choice.label}` : choice.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

interface CheckboxProps {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  testID?: string;
}

/** An on/off choice with a visible box and check mark (LAA-06). */
export function Checkbox({ label, hint, checked, onChange, testID }: CheckboxProps) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={{ checked }}
      onPress={() => onChange(!checked)}
      testID={testID}
      style={({ pressed }) => [styles.checkbox, pressed && styles.pressed]}
    >
      <View
        style={[
          styles.box,
          {
            borderColor: colors.primary,
            backgroundColor: checked ? colors.primary : 'transparent',
          },
        ]}
      >
        <Text style={styles.boxMark}>{checked ? '✓' : ''}</Text>
      </View>
      <View style={styles.checkboxText}>
        <Text style={[styles.checkboxLabel, { color: colors.text }]}>
          {label}
          {checked ? `, ${strings.selected}` : ''}
        </Text>
        {hint ? <Text style={[styles.hint, { color: colors.text }]}>{hint}</Text> : null}
      </View>
    </Pressable>
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
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    minHeight: MIN_TOUCH_SIZE,
    minWidth: MIN_TOUCH_SIZE,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: {
    fontSize: 17,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.6,
  },
  checkbox: {
    minHeight: MIN_TOUCH_SIZE,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  box: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxMark: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  checkboxText: {
    flexShrink: 1,
    gap: 2,
  },
  checkboxLabel: {
    fontSize: 17,
    fontWeight: '600',
  },
  hint: {
    fontSize: 15,
    opacity: 0.8,
  },
});
