import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider, useTheme } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, useColorScheme, View } from 'react-native';

import { db } from '@/db/client';
import migrations from '@/db/migrations/migrations';
import { ServiceProvider } from '@/services/ServiceProvider';
import { strings } from '@/ui/strings.fi';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <MigrationGate />
    </ThemeProvider>
  );
}

/** Runs the database migrations before any screen reads data. */
function MigrationGate() {
  const { colors } = useTheme();
  const { success, error } = useMigrations(db, migrations);

  if (!success) {
    return (
      <View style={[styles.center, { backgroundColor: colors.background }]}>
        {error ? null : <ActivityIndicator color={colors.primary} />}
        <Text accessibilityLiveRegion="polite" style={[styles.status, { color: colors.text }]}>
          {error ? `${strings.startup.dbError} ${error.message}` : strings.startup.migrating}
        </Text>
      </View>
    );
  }

  return (
    <ServiceProvider>
      <Stack>
        <Stack.Screen name="index" options={{ title: strings.today.title }} />
        <Stack.Screen
          name="onboarding"
          options={{ title: strings.appName, headerBackVisible: false, gestureEnabled: false }}
        />
        <Stack.Screen
          name="entry/new"
          options={{ title: strings.entry.newTitle, presentation: 'modal' }}
        />
        <Stack.Screen name="entry/[id]" options={{ title: strings.entry.editTitle }} />
        <Stack.Screen name="day-limit" options={{ title: strings.dayLimit.title }} />
        <Stack.Screen name="settings" options={{ title: strings.settings.title }} />
      </Stack>
    </ServiceProvider>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 16,
  },
  status: {
    fontSize: 17,
    textAlign: 'center',
  },
});
