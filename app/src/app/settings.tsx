import { router, useTheme } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Keyboard, StyleSheet, Text, View } from 'react-native';

import { formatKcal } from '@/domain/format';
import { getFastDay, setFastDayLimit } from '@/services/fastDays';
import { useServices } from '@/services/ServiceProvider';
import { getSettings, setDefaultLimit } from '@/services/settings';
import { Button } from '@/ui/Button';
import { useServiceQuery, useToday } from '@/ui/hooks';
import { LimitForm } from '@/ui/LimitForm';
import { Notice } from '@/ui/Notice';
import { Screen } from '@/ui/Screen';
import { strings } from '@/ui/strings.fi';

const t = strings.settings;

export default function SettingsScreen() {
  const ctx = useServices();
  const { colors } = useTheme();
  const query = useCallback(() => getSettings(ctx), [ctx]);
  const { data: settings, refresh } = useServiceQuery(query);
  const today = useToday();
  const [savedMessage, setSavedMessage] = useState<string | null>(null);

  const save = (limitKcal: number) => {
    setDefaultLimit(ctx, limitKcal);
    refresh();
    Keyboard.dismiss();
    setSavedMessage(t.saved(formatKcal(limitKcal)));
    // KAY-03: the default applies to new fast days. Today's fast day changes only if the user
    // chooses so; earlier days are never changed (criterion 10).
    const day = getFastDay(ctx, today);
    if (!day || day.limitKcal === limitKcal) return;
    Alert.alert(
      t.todayLimitTitle,
      t.todayLimitMessage(formatKcal(day.limitKcal), formatKcal(limitKcal)),
      [
        { text: t.todayLimitKeep, style: 'cancel' },
        {
          text: t.todayLimitUpdate,
          onPress: () => {
            setFastDayLimit(ctx, day.id, limitKcal);
            setSavedMessage(t.savedWithToday(formatKcal(limitKcal)));
          },
        },
      ],
    );
  };

  return (
    <Screen>
      <LimitForm
        label={t.defaultLimitLabel}
        hint={t.defaultLimitHint}
        submitLabel={t.save}
        initial={settings.defaultLimitKcal}
        onSave={save}
        onEdit={() => setSavedMessage(null)}
      />
      {savedMessage ? <Notice message={savedMessage} testID="settings-saved" /> : null}
      <Button label={t.foodsLink} variant="secondary" onPress={() => router.push('/foods')} />
      <Button
        label={t.sourcesLink}
        variant="secondary"
        onPress={() => router.push('/sources')}
        testID="sources-link"
      />
      {__DEV__ ? (
        <View style={styles.dev}>
          <Text accessibilityRole="header" style={[styles.heading, { color: colors.text }]}>
            {t.devTitle}
          </Text>
          <Button
            label={t.barcodeExperimentLink}
            variant="secondary"
            onPress={() => router.push('/kokeilu-viivakoodi')}
          />
          <Button
            label={t.ftsExperimentLink}
            variant="secondary"
            onPress={() => router.push('/kokeilu-fts')}
          />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {
    fontSize: 17,
  },
  dev: {
    gap: 12,
    marginTop: 24,
  },
  heading: {
    fontSize: 20,
    fontWeight: '600',
  },
});
