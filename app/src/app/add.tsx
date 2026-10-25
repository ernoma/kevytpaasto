import { router, useLocalSearchParams, useTheme } from 'expo-router';
import { useCallback, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatKcal } from '@/domain/format';
import { listFavorites } from '@/services/favorites';
import { foodEnergy, listFoods } from '@/services/foods';
import { listMeals } from '@/services/meals';
import { useServices } from '@/services/ServiceProvider';
import { Button } from '@/ui/Button';
import { useServiceQuery } from '@/ui/hooks';
import { energyText } from '@/ui/portionText';
import { Screen } from '@/ui/Screen';
import { strings } from '@/ui/strings.fi';
import { MIN_TOUCH_SIZE } from '@/ui/theme';

const t = strings.add;

/** Ways to add an entry: quick entry, favourites and own foods and meals (KIR-01, OMA-03). */
export default function AddScreen() {
  const ctx = useServices();
  const { fastDayId } = useLocalSearchParams<{ fastDayId: string }>();
  const query = useCallback(
    () => ({ favorites: listFavorites(ctx), foods: listFoods(ctx), meals: listMeals(ctx) }),
    [ctx],
  );
  const { data } = useServiceQuery(query);

  const openFood = (foodId: string) =>
    router.push({ pathname: '/portion', params: { fastDayId, foodId } });
  const openMeal = (mealId: string) =>
    router.push({ pathname: '/portion', params: { fastDayId, mealId } });
  const mealDetail = (kcal: number | null) =>
    kcal === null ? strings.noEnergy : strings.foods.mealKcal(formatKcal(kcal));

  return (
    <Screen>
      <Button
        label={t.quickEntry}
        onPress={() => router.push({ pathname: '/entry/new', params: { fastDayId } })}
        testID="quick-entry"
      />
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
    </Screen>
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

function Row({ name, detail, onPress }: { name: string; detail: string; onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t.rowLabel(name, detail)}
      onPress={onPress}
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
});
