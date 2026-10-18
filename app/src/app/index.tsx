import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { Link, useTheme } from 'expo-router';
import { ScrollView, StyleSheet, Text } from 'react-native';

import { db } from '@/db/client';
import migrations from '@/db/migrations/migrations';
import { strings } from '@/ui/strings.fi';

export default function HomeScreen() {
  const { colors } = useTheme();
  const { success, error } = useMigrations(db, migrations);

  const status = error
    ? `${strings.home.dbError} ${error.message}`
    : success
      ? strings.home.dbReady
      : strings.home.dbMigrating;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text accessibilityRole="header" style={[styles.title, { color: colors.text }]}>
        {strings.home.title}
      </Text>
      <Text style={[styles.body, { color: colors.text }]}>{strings.home.placeholder}</Text>
      <Text accessibilityLiveRegion="polite" style={[styles.body, { color: colors.text }]}>
        {status}
      </Text>
      {__DEV__ ? (
        <>
          <Link href="/kokeilu-viivakoodi" style={[styles.body, { color: colors.primary }]}>
            {strings.home.barcodeExperimentLink}
          </Link>
          <Link href="/kokeilu-fts" style={[styles.body, { color: colors.primary }]}>
            {strings.home.ftsExperimentLink}
          </Link>
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    gap: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
  },
  body: {
    fontSize: 17,
  },
});
