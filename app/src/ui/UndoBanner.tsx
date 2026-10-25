import { useTheme } from 'expo-router';
import { useEffect } from 'react';
import { AccessibilityInfo, StyleSheet, Text, View } from 'react-native';

import { Button } from './Button';

/** How long the undo offer stays visible (LAA-02: a short-lived notice). */
export const UNDO_TIMEOUT_MS = 8000;

interface UndoBannerProps {
  /** Changes for every new offer so that the timer starts again. */
  offerKey: string;
  message: string;
  undoLabel: string;
  undoAccessibilityLabel: string;
  onUndo: () => void;
  onTimeout: () => void;
}

/**
 * A short-lived notice of what was just added, with a way to undo it (LAA-02). The meaning is
 * carried by text, and screen readers announce it.
 */
export function UndoBanner({
  offerKey,
  message,
  undoLabel,
  undoAccessibilityLabel,
  onUndo,
  onTimeout,
}: UndoBannerProps) {
  const { colors } = useTheme();
  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(message);
    const timer = setTimeout(onTimeout, UNDO_TIMEOUT_MS);
    return () => clearTimeout(timer);
    // The timer restarts only for a new offer, not when the callbacks change identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offerKey]);
  return (
    <View
      accessibilityLiveRegion="polite"
      testID="undo-banner"
      style={[styles.banner, { borderColor: colors.primary, backgroundColor: colors.card }]}
    >
      <Text style={[styles.text, { color: colors.text }]}>
        {'✓ '}
        {message}
      </Text>
      <Button
        label={undoLabel}
        accessibilityLabel={undoAccessibilityLabel}
        variant="secondary"
        onPress={onUndo}
        testID="undo"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    borderWidth: 2,
    borderRadius: 10,
    padding: 12,
  },
  text: {
    flexShrink: 1,
    flexGrow: 1,
    flexBasis: 160,
    fontSize: 17,
    fontWeight: '600',
  },
});
