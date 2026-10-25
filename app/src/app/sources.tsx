import { useTheme } from 'expo-router';
import { Linking, StyleSheet, Text, View } from 'react-native';

import { fineliRelease } from '@/db/fineli';
import { formatDecimal } from '@/domain/format';
import { Button } from '@/ui/Button';
import { Screen } from '@/ui/Screen';
import { strings } from '@/ui/strings.fi';

const t = strings.sources;

/**
 * Data sources, their licences and required attributions (TIE-03). The app is not presented
 * as a service of the source organisations.
 */
export default function SourcesScreen() {
  const { colors } = useTheme();
  const paragraph = (text: string, testID?: string) => (
    <Text testID={testID} style={[styles.body, { color: colors.text }]}>
      {text}
    </Text>
  );
  return (
    <Screen>
      <View style={styles.section}>
        <Text accessibilityRole="header" style={[styles.heading, { color: colors.text }]}>
          {t.fineliTitle}
        </Text>
        {paragraph(t.fineliCitation(fineliRelease.release, fineliRelease.year), 'fineli-citation')}
        {paragraph(t.fineliLicense)}
        {paragraph(t.fineliBundled(formatDecimal(fineliRelease.foodCount)))}
        {paragraph(t.fineliChanges)}
        {paragraph(t.fineliLogged)}
        {paragraph(t.fineliDisclaimer)}
        {paragraph(t.fineliNotEndorsed)}
        <Button
          label={t.openFineli}
          variant="secondary"
          onPress={() => void Linking.openURL(t.fineliUrl)}
        />
        <Button
          label={t.openLicense}
          variant="secondary"
          onPress={() => void Linking.openURL(t.licenseUrl)}
        />
      </View>
      <View style={styles.section}>
        <Text accessibilityRole="header" style={[styles.heading, { color: colors.text }]}>
          {t.appTitle}
        </Text>
        {paragraph(t.appLicense)}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 12,
  },
  heading: {
    fontSize: 20,
    fontWeight: '600',
  },
  body: {
    fontSize: 17,
  },
});
