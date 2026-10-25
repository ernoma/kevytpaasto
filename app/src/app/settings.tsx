import { router, useTheme } from 'expo-router';
import { useCallback, useState } from 'react';
import { Keyboard, StyleSheet, Text, View } from 'react-native';

import { useServices } from '@/services/ServiceProvider';
import { getSettings, setDefaultLimit } from '@/services/settings';
import { Button } from '@/ui/Button';
import { useServiceQuery } from '@/ui/hooks';
import { LimitForm } from '@/ui/LimitForm';
import { Screen } from '@/ui/Screen';
import { strings } from '@/ui/strings.fi';

const t = strings.settings;

export default function SettingsScreen() {
  const ctx = useServices();
  const { colors } = useTheme();
  const query = useCallback(() => getSettings(ctx), [ctx]);
  const { data: settings, refresh } = useServiceQuery(query);
  const [saved, setSaved] = useState(false);

  return (
    <Screen>
      {/* KAY-03: the default applies to new fast days; existing days keep their snapshot. */}
      <LimitForm
        label={t.defaultLimitLabel}
        hint={t.defaultLimitHint}
        submitLabel={t.save}
        initial={settings.defaultLimitKcal}
        onSave={(limitKcal) => {
          setDefaultLimit(ctx, limitKcal);
          refresh();
          Keyboard.dismiss();
          setSaved(true);
        }}
      />
      {saved ? (
        <Text accessibilityLiveRegion="polite" style={[styles.body, { color: colors.text }]}>
          {t.saved}
        </Text>
      ) : null}
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
