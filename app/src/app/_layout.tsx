import { useMigrations } from 'drizzle-orm/expo-sqlite/migrator';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider, useTheme } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, useColorScheme, View } from 'react-native';

import { db, sqlite } from '@/db/client';
import { attachFineli } from '@/db/fineli';
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

/**
 * Runs the database migrations and attaches fineli.db before any screen reads data. If Fineli
 * cannot be attached, the app still starts and search says Fineli is unavailable.
 */
function MigrationGate() {
  const { colors } = useTheme();
  const { success, error } = useMigrations(db, migrations);
  const [fineliDone, setFineliDone] = useState(false);

  useEffect(() => {
    attachFineli(sqlite)
      .catch((e: unknown) => console.warn('Fineli could not be attached', e))
      .finally(() => setFineliDone(true));
  }, []);

  if (!success || !fineliDone) {
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
        <Stack.Screen name="add" options={{ title: strings.add.title }} />
        <Stack.Screen name="portion" options={{ title: strings.portion.title }} />
        <Stack.Screen name="foods" options={{ title: strings.foods.title }} />
        <Stack.Screen name="food-edit" options={{ title: strings.foodForm.newTitle }} />
        <Stack.Screen name="meal-edit" options={{ title: strings.mealForm.newTitle }} />
        <Stack.Screen name="day-limit" options={{ title: strings.dayLimit.title }} />
        <Stack.Screen name="settings" options={{ title: strings.settings.title }} />
        <Stack.Screen name="sources" options={{ title: strings.sources.title }} />
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
