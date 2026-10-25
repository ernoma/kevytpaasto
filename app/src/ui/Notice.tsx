import { useTheme } from 'expo-router';
import { useEffect } from 'react';
import { AccessibilityInfo, StyleSheet, Text, View } from 'react-native';

/**
 * A clearly visible confirmation that stays on screen. The check mark and wording carry the
 * meaning, not colour alone (LAA-06), and screen readers announce it.
 */
export function Notice({ message, testID }: { message: string; testID?: string }) {
  const { colors } = useTheme();
  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(message);
  }, [message]);
  return (
    <View
      accessible
      accessibilityLiveRegion="polite"
      accessibilityLabel={message}
      testID={testID}
      style={[styles.notice, { borderColor: colors.primary, backgroundColor: colors.card }]}
    >
      <Text style={[styles.icon, { color: colors.primary }]}>✓</Text>
      <Text style={[styles.text, { color: colors.text }]}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderWidth: 2,
    borderRadius: 10,
    padding: 14,
  },
  icon: {
    fontSize: 22,
    fontWeight: '700',
  },
  text: {
    flexShrink: 1,
    fontSize: 17,
    fontWeight: '600',
  },
});
