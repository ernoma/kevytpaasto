import { router, useLocalSearchParams, useTheme } from 'expo-router';
import { useCallback, useDeferredValue, useMemo, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { MIN_SEARCH_LENGTH, searchTerms } from '@/domain/fineli';
import { formatKcal } from '@/domain/format';
import { listFavorites } from '@/services/favorites';
import { fineliEnergy } from '@/services/fineli';
import { foodEnergy, listFoods } from '@/services/foods';
import { listMeals } from '@/services/meals';
import { searchFoods, type FoodSearchResults } from '@/services/search';
import { useServices } from '@/services/ServiceProvider';
import { Button } from '@/ui/Button';
import { useServiceQuery } from '@/ui/hooks';
import { energyText } from '@/ui/portionText';
import { Screen } from '@/ui/Screen';
import { strings } from '@/ui/strings.fi';
import { TextField } from '@/ui/TextField';
import { MIN_TOUCH_SIZE } from '@/ui/theme';

const t = strings.add;

/**
 * Ways to add an entry: quick entry, local search of own foods and Fineli, favourites and own
 * foods and meals (KIR-01, HAK-02, OMA-03).
 */
export default function AddScreen() {
  const ctx = useServices();
  const { colors } = useTheme();
  const { fastDayId } = useLocalSearchParams<{ fastDayId: string }>();
  const query = useCallback(
    () => ({ favorites: listFavorites(ctx), foods: listFoods(ctx), meals: listMeals(ctx) }),
    [ctx],
  );
  const { data } = useServiceQuery(query);
  const [searchText, setSearchText] = useState('');
  // Fineli is searched on every keystroke; deferring keeps typing responsive.
  const deferredSearch = useDeferredValue(searchText);
  const results = useMemo(() => searchFoods(ctx, deferredSearch), [ctx, deferredSearch]);
  const searching = searchTerms(searchText).join('').length >= MIN_SEARCH_LENGTH;

  const openFood = (foodId: string) =>
    router.push({ pathname: '/portion', params: { fastDayId, foodId } });
  const openMeal = (mealId: string) =>
    router.push({ pathname: '/portion', params: { fastDayId, mealId } });
  const openFineli = (fineliId: number) =>
    router.push({ pathname: '/portion', params: { fastDayId, fineliId: String(fineliId) } });
  const mealDetail = (kcal: number | null) =>
    kcal === null ? strings.noEnergy : strings.foods.mealKcal(formatKcal(kcal));

  return (
    <Screen>
      <Button
        label={t.quickEntry}
        onPress={() => router.push({ pathname: '/entry/new', params: { fastDayId } })}
        testID="quick-entry"
      />
      <TextField
        label={t.searchLabel}
        placeholder={t.searchPlaceholder}
        hint={t.searchHint}
        kind="search"
        value={searchText}
        onChangeText={setSearchText}
        returnKeyType="search"
        testID="food-search"
      />
      {searching ? (
        <SearchResults results={results} onOpenFood={openFood} onOpenFineli={openFineli} />
      ) : (
        <>
          <Section title={t.favoritesTitle} empty={t.noFavorites}>
            {data.favorites.map((favorite) =>
              favorite.type === 'food' ? (
                <Row
                  key={favorite.id}
                  name={favorite.name}
                  detail={energyText(foodEnergy(favorite.food))}
                  onPress={() => openFood(favorite.id)}
                />
              ) : (
                <Row
                  key={favorite.id}
                  name={favorite.name}
                  detail={mealDetail(favorite.kcal)}
                  onPress={() => openMeal(favorite.id)}
                />
              ),
            )}
          </Section>
          <Section title={t.foodsTitle} empty={t.noFoods}>
            {data.foods.map((food) => (
              <Row
                key={food.id}
                name={food.name}
                detail={energyText(foodEnergy(food))}
                onPress={() => openFood(food.id)}
              />
            ))}
          </Section>
          <Section title={t.mealsTitle} empty={t.noMeals}>
            {data.meals.map(({ meal, kcal }) => (
              <Row
                key={meal.id}
                name={meal.name}
                detail={mealDetail(kcal)}
                onPress={() => openMeal(meal.id)}
              />
            ))}
          </Section>
          <Button
            label={t.manageFoods}
            variant="secondary"
            onPress={() => router.push('/foods')}
            testID="manage-foods"
          />
        </>
      )}
      {searching && results.fineli.length > 0 ? (
        <Text style={[styles.attribution, { color: colors.text }]}>{t.fineliAttribution}</Text>
      ) : null}
    </Screen>
  );
}

/**
 * Own foods and Fineli foods matching the search. Each row shows the energy with its basis,
 * the source and Fineli's preparation method; missing energy is said in words (HAK-03, HAK-04,
 * LAS-06).
 */
function SearchResults({
  results,
  onOpenFood,
  onOpenFineli,
}: {
  results: FoodSearchResults;
  onOpenFood: (foodId: string) => void;
  onOpenFineli: (fineliId: number) => void;
}) {
  return (
    <>
      <Section title={t.ownResultsTitle} empty={t.noResults}>
        {results.own.map((food) => (
          <Row
            key={food.id}
            name={food.brand ? `${food.name} (${food.brand})` : food.name}
            detail={t.resultDetail(energyText(foodEnergy(food)), t.sourceOwn, null)}
            onPress={() => onOpenFood(food.id)}
          />
        ))}
      </Section>
      <Section
        title={t.fineliResultsTitle}
        empty={results.fineliAvailable ? t.noResults : t.fineliUnavailable}
      >
        {results.fineli.map((item) => (
          <Row
            key={item.id}
            name={item.name}
            detail={t.resultDetail(energyText(fineliEnergy(item)), t.sourceFineli, item.processFi)}
            onPress={() => onOpenFineli(item.id)}
            testID={`fineli-${item.id}`}
          />
        ))}
      </Section>
    </>
  );
}

function Section({
  title,
  empty,
  children,
}: {
  title: string;
  empty: string;
  children: ReactNode[];
}) {
  const { colors } = useTheme();
  return (
    <View style={styles.section}>
      <Text accessibilityRole="header" style={[styles.heading, { color: colors.text }]}>
        {title}
      </Text>
      {children.length === 0 ? (
        <Text style={[styles.body, { color: colors.text }]}>{empty}</Text>
      ) : (
        children
      )}
    </View>
  );
}

function Row({
  name,
  detail,
  onPress,
  testID,
}: {
  name: string;
  detail: string;
  onPress: () => void;
  testID?: string;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t.rowLabel(name, detail)}
      onPress={onPress}
      testID={testID}
      style={({ pressed }) => [
        styles.row,
        { borderColor: colors.border },
        pressed && styles.pressed,
      ]}
    >
      <Text style={[styles.rowName, { color: colors.text }]}>{name}</Text>
      <Text style={[styles.rowDetail, { color: colors.text }]}>{detail}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 4,
  },
  heading: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
  },
  body: {
    fontSize: 17,
  },
  row: {
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
  rowName: {
    flexShrink: 1,
    fontSize: 17,
    fontWeight: '600',
  },
  rowDetail: {
    fontSize: 16,
  },
  pressed: {
    opacity: 0.6,
  },
  attribution: {
    fontSize: 14,
    opacity: 0.8,
  },
});
