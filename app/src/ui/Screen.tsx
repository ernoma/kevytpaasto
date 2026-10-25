import { useTheme } from 'expo-router';
import type { ReactNode } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { spacing } from './theme';

/** Scrollable screen body, so layouts survive enlarged text (LAA-06). */
export function Screen({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.screen,
    gap: spacing.gap,
  },
});
