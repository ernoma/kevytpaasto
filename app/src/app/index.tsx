import { Redirect, router, Stack, useTheme } from 'expo-router';
import { useCallback, useState } from 'react';
import { AccessibilityInfo, Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import type { DaySummary } from '@/domain/daySummary';
import { formatDateFi, formatKcal } from '@/domain/format';
import { deleteFastDay, getDayView, startFastDay, type FastDay } from '@/services/fastDays';
import { listFavorites, type Favorite } from '@/services/favorites';
import { deleteEntry, saveFoodEntry, saveMealEntry, type LogEntry } from '@/services/logEntries';
import { useServices } from '@/services/ServiceProvider';
import { getSettings } from '@/services/settings';
import { Button } from '@/ui/Button';
import { useServiceQuery, useToday } from '@/ui/hooks';
import { Screen } from '@/ui/Screen';
import { strings } from '@/ui/strings.fi';
import { MIN_TOUCH_SIZE } from '@/ui/theme';
import { UndoBanner } from '@/ui/UndoBanner';

const t = strings.today;

export default function TodayScreen() {
  const ctx = useServices();
  const today = useToday();
  const query = useCallback(
    () => ({
      settings: getSettings(ctx),
      view: getDayView(ctx, today),
      favorites: listFavorites(ctx),
    }),
    [ctx, today],
  );
  const { data, refresh } = useServiceQuery(query);
  const [undo, setUndo] = useState<{ entryId: string; name: string; kcal: number } | null>(null);

  if (!data.settings.onboardingDone) {
    return <Redirect href="/onboarding" />;
  }

  const { day, entries, summary } = data.view;

  /**
   * LAA-02, criterion 8: one tap adds a favourite's default portion with a new UUID; a food
   * without a serving opens the amount view instead. Repeated taps are intentional entries.
   */
  const addFavorite = (target: FastDay, favorite: Favorite) => {
    const openPortion = () =>
      router.push({
        pathname: '/portion',
        params:
          favorite.type === 'food'
            ? { fastDayId: target.id, foodId: favorite.id }
            : { fastDayId: target.id, mealId: favorite.id },
      });
    if (favorite.kcal === null || (favorite.type === 'food' && !favorite.defaultPortion)) {
      openPortion();
      return;
    }
    try {
      const entry =
        favorite.type === 'food'
          ? saveFoodEntry(ctx, {
              id: ctx.newId(),
              fastDayId: target.id,
              foodId: favorite.id,
              amount: 1,
              unit: 'serving',
            })
          : saveMealEntry(ctx, {
              id: ctx.newId(),
              fastDayId: target.id,
              mealId: favorite.id,
              fraction: 1,
            });
      setUndo({ entryId: entry.id, name: favorite.name, kcal: entry.kcal });
      refresh();
    } catch {
      openPortion();
    }
  };

  const confirmDeleteDay = (target: FastDay) => {
    // PAI-06: the day is removed only after confirmation, and its entries only after a second,
    // separate confirmation that states how many there are.
    Alert.alert(strings.deleteDay.title, strings.deleteDay.message, [
      { text: strings.cancel, style: 'cancel' },
      {
        text: strings.deleteDay.confirm,
        style: 'destructive',
        onPress: () => {
          const result = deleteFastDay(ctx, target.id);
          if (result.deleted) {
            refresh();
            return;
          }
          Alert.alert(
            strings.deleteDay.entriesTitle,
            strings.deleteDay.entriesMessage(result.entryCount),
            [
              { text: strings.cancel, style: 'cancel' },
              {
                text: strings.deleteDay.entriesConfirm,
                style: 'destructive',
                onPress: () => {
                  deleteFastDay(ctx, target.id, { deleteEntries: true });
                  refresh();
                },
              },
            ],
          );
        },
      },
    ]);
  };

  return (
    <Screen>
      <Stack.Screen
        options={{
          headerRight: () => (
            <HeaderButton
              label={t.settings}
              onPress={() => router.push('/settings')}
              testID="open-settings"
            />
          ),
        }}
      />
      {day && summary ? (
        <>
          <Summary date={today} summary={summary} />
          <Button
            label={t.addEntry}
            onPress={() => router.push({ pathname: '/add', params: { fastDayId: day.id } })}
            testID="add-entry"
          />
          <FavoriteButtons
            favorites={data.favorites}
            onPress={(favorite) => addFavorite(day, favorite)}
          />
          {undo ? (
            <UndoBanner
              offerKey={undo.entryId}
              message={t.added(undo.name, formatKcal(undo.kcal))}
              undoLabel={t.undo}
              undoAccessibilityLabel={t.undoLabel(undo.name)}
              onUndo={() => {
                deleteEntry(ctx, undo.entryId);
                setUndo(null);
                AccessibilityInfo.announceForAccessibility(t.undone);
                refresh();
              }}
              onTimeout={() => setUndo(null)}
            />
          ) : null}
          <EntryList entries={entries} />
          <View style={styles.actions}>
            <Button
              label={t.changeLimit}
              variant="secondary"
              onPress={() => router.push({ pathname: '/day-limit', params: { id: day.id } })}
            />
            <Button
              label={t.deleteDay}
              variant="destructive"
              onPress={() => confirmDeleteDay(day)}
            />
          </View>
        </>
      ) : (
        <OrdinaryDay
          date={today}
          onStart={() => {
            startFastDay(ctx, today);
            refresh();
          }}
        />
      )}
    </Screen>
  );
}

/** Date, limit, consumed and remaining or over, readable without scrolling (PAI-02, LAA-01). */
function Summary({ date, summary }: { date: string; summary: DaySummary }) {
  const { colors } = useTheme();
  const dateText = formatDateFi(date);
  const limit = formatKcal(summary.limitKcal);
  const consumed = formatKcal(summary.consumedKcal);
  // PAI-03, LAA-06, LAA-08: the overage is stated in words and numbers in a neutral tone.
  const status =
    summary.status === 'over'
      ? t.over(formatKcal(summary.overKcal))
      : t.remaining(formatKcal(summary.remainingKcal));
  return (
    <View
      accessible
      accessibilityLabel={t.summaryLabel(dateText, limit, consumed, status)}
      style={[styles.summary, { backgroundColor: colors.card, borderColor: colors.border }]}
    >
      <Text style={[styles.date, { color: colors.text }]}>{dateText}</Text>
      <View style={styles.figures}>
        <Figure label={t.limit} value={strings.kcal(limit)} />
        <Figure label={t.consumed} value={strings.kcal(consumed)} />
      </View>
      <Text testID="day-status" style={[styles.status, { color: colors.text }]}>
        {status}
      </Text>
    </View>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.figure}>
      <Text style={[styles.figureLabel, { color: colors.text }]}>{label}</Text>
      <Text style={[styles.figureValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

/** Favourites as quick buttons on the day view (LAA-02, OMA-03). */
function FavoriteButtons({
  favorites,
  onPress,
}: {
  favorites: Favorite[];
  onPress: (favorite: Favorite) => void;
}) {
  const { colors } = useTheme();
  if (favorites.length === 0) {
    return null;
  }
  return (
    <View style={styles.list}>
      <Text accessibilityRole="header" style={[styles.listTitle, { color: colors.text }]}>
        {t.favoritesTitle}
      </Text>
      <View style={styles.favorites}>
        {favorites.map((favorite) => {
          const oneTap =
            favorite.kcal !== null && (favorite.type === 'meal' || favorite.defaultPortion);
          const kcal = favorite.kcal === null ? null : formatKcal(favorite.kcal);
          return (
            <Pressable
              key={`${favorite.type}-${favorite.id}`}
              accessibilityRole="button"
              accessibilityLabel={
                oneTap && kcal !== null
                  ? t.favoriteAddLabel(favorite.name, kcal)
                  : t.favoriteOpenLabel(favorite.name)
              }
              onPress={() => onPress(favorite)}
              style={({ pressed }) => [
                styles.favorite,
                { borderColor: colors.primary, backgroundColor: colors.card },
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.favoriteName, { color: colors.text }]}>
                {oneTap ? '+ ' : ''}
                {favorite.name}
              </Text>
              <Text style={[styles.favoriteDetail, { color: colors.text }]}>
                {oneTap && kcal !== null ? t.favoriteKcal(kcal) : t.favoriteChooseAmount}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function EntryList({ entries }: { entries: LogEntry[] }) {
  const { colors } = useTheme();
  return (
    <View style={styles.list}>
      <Text accessibilityRole="header" style={[styles.listTitle, { color: colors.text }]}>
        {t.entriesTitle}
      </Text>
      {entries.length === 0 ? (
        <Text style={[styles.body, { color: colors.text }]}>{t.noEntries}</Text>
      ) : (
        entries.map((entry) => {
          const name = entry.name ?? t.unnamedEntry;
          const kcal = formatKcal(entry.kcal);
          return (
            <Pressable
              key={entry.id}
              accessibilityRole="button"
              accessibilityLabel={t.entryLabel(name, kcal)}
              onPress={() => router.push({ pathname: '/entry/[id]', params: { id: entry.id } })}
              style={({ pressed }) => [
                styles.entry,
                { borderColor: colors.border },
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.entryName, { color: colors.text }]}>{name}</Text>
              <Text style={[styles.entryKcal, { color: colors.text }]}>{strings.kcal(kcal)}</Text>
            </Pressable>
          );
        })
      )}
    </View>
  );
}

/** A non-fast day is simply an ordinary day: no prompts to log food (PAI-04, criterion 12). */
function OrdinaryDay({ date, onStart }: { date: string; onStart: () => void }) {
  const { colors } = useTheme();
  return (
    <View style={styles.ordinary}>
      <Text style={[styles.date, { color: colors.text }]}>{formatDateFi(date)}</Text>
      <Text accessibilityRole="header" style={[styles.ordinaryTitle, { color: colors.text }]}>
        {t.ordinaryDay}
      </Text>
      <Button label={t.startFastDay} onPress={onStart} testID="start-fast-day" />
    </View>
  );
}

function HeaderButton({
  label,
  onPress,
  testID,
}: {
  label: string;
  onPress: () => void;
  testID?: string;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      testID={testID}
      hitSlop={8}
      style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}
    >
      <Text style={[styles.headerButtonText, { color: colors.primary }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  summary: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  date: {
    fontSize: 17,
  },
  figures: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 24,
  },
  figure: {
    gap: 2,
  },
  figureLabel: {
    fontSize: 15,
  },
  figureValue: {
    fontSize: 22,
    fontWeight: '600',
  },
  status: {
    fontSize: 26,
    fontWeight: '700',
  },
  list: {
    gap: 8,
  },
  listTitle: {
    fontSize: 20,
    fontWeight: '600',
  },
  body: {
    fontSize: 17,
  },
  entry: {
    minHeight: MIN_TOUCH_SIZE,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
  },
  favorites: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  favorite: {
    minHeight: MIN_TOUCH_SIZE,
    minWidth: MIN_TOUCH_SIZE,
    flexShrink: 1,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 2,
    borderRadius: 10,
    justifyContent: 'center',
  },
  favoriteName: {
    fontSize: 17,
    fontWeight: '600',
  },
  favoriteDetail: {
    fontSize: 15,
  },
  entryName: {
    flexShrink: 1,
    fontSize: 17,
  },
  entryKcal: {
    fontSize: 17,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.6,
  },
  actions: {
    gap: 12,
    marginTop: 8,
  },
  ordinary: {
    gap: 16,
    paddingTop: 24,
  },
  ordinaryTitle: {
    fontSize: 26,
    fontWeight: '600',
  },
  headerButton: {
    minHeight: MIN_TOUCH_SIZE,
    minWidth: MIN_TOUCH_SIZE,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  headerButtonText: {
    fontSize: 17,
    fontWeight: '600',
  },
});
