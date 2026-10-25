import { useTheme } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';

import { MIN_TOUCH_SIZE } from './theme';

export type ButtonVariant = 'primary' | 'secondary' | 'destructive';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  /** Defaults to the visible label. */
  accessibilityLabel?: string;
  accessibilityHint?: string;
  testID?: string;
}

/**
 * A button with at least a 48 × 48 dp touch area (LAA-06). Destructive actions are told apart
 * by their wording and outline, not by colour alone.
 */
export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  accessibilityLabel,
  accessibilityHint,
  testID,
}: ButtonProps) {
  const { colors } = useTheme();
  const filled = variant === 'primary';
  const color = variant === 'destructive' ? colors.notification : colors.primary;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [
        styles.button,
        { borderColor: color, backgroundColor: filled ? color : 'transparent' },
        (pressed || disabled) && styles.dimmed,
      ]}
    >
      <Text style={[styles.label, { color: filled ? '#ffffff' : color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: MIN_TOUCH_SIZE,
    minWidth: MIN_TOUCH_SIZE,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dimmed: {
    opacity: 0.6,
  },
  label: {
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
  },
});
