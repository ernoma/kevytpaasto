import { router, useTheme } from 'expo-router';
import { StyleSheet, Text } from 'react-native';

import { useServices } from '@/services/ServiceProvider';
import { setDefaultLimit } from '@/services/settings';
import { LimitForm } from '@/ui/LimitForm';
import { Screen } from '@/ui/Screen';
import { strings } from '@/ui/strings.fi';

const t = strings.onboarding;

/** Onboarding asks only for the calorie limit: no personal details or account (KAY-01). */
export default function OnboardingScreen() {
  const ctx = useServices();
  const { colors } = useTheme();

  return (
    <Screen>
      <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>
        {t.title}
      </Text>
      <Text style={[styles.body, { color: colors.text }]}>{t.intro}</Text>
      <LimitForm
        label={t.limitLabel}
        placeholder={t.limitPlaceholder}
        submitLabel={t.submit}
        autoFocus
        onSave={(limitKcal) => {
          setDefaultLimit(ctx, limitKcal);
          router.replace('/');
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 28,
    fontWeight: '600',
  },
  body: {
    fontSize: 17,
  },
});
