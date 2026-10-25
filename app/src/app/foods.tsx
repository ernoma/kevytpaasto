import { router, useTheme } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatKcal } from '@/domain/format';
import { foodEnergy, listFoods, setFoodFavorite } from '@/services/foods';
import { listMeals, setMealFavorite } from '@/services/meals';
import { useServices } from '@/services/ServiceProvider';
import { Button } from '@/ui/Button';
import { useServiceQuery } from '@/ui/hooks';
import { energyText } from '@/ui/portionText';
import { Screen } from '@/ui/Screen';
import { strings } from '@/ui/strings.fi';
import { MIN_TOUCH_SIZE } from '@/ui/theme';

const t = strings.foods;

/** Own foods and meals: list, add, edit and mark as favourite (OMA-01…06). */
export default function FoodsScreen() {
  const ctx = useServices();
  const { colors } = useTheme();
  const query = useCallback(() => ({ foods: listFoods(ctx), meals: listMeals(ctx) }), [ctx]);
  const { data, refresh } = useServiceQuery(query);

  return (
    <Screen>
      <View style={styles.actions}>
        <Button label={t.newFood} onPress={() => router.push('/food-edit')} testID="new-food" />
        <Button
          label={t.newMeal}
          variant="secondary"
          onPress={() => router.push('/meal-edit')}
          testID="new-meal"
        />
      </View>
      <View style={styles.section}>
        <Text accessibilityRole="header" style={[styles.heading, { color: colors.text }]}>
          {t.foodsTitle}
        </Text>
        {data.foods.length === 0 ? (
          <Text style={[styles.body, { color: colors.text }]}>{t.noFoods}</Text>
        ) : (
          data.foods.map((food) => (
            <ItemRow
              key={food.id}
              name={food.name}
              detail={energyText(foodEnergy(food))}
              isFavorite={food.isFavorite}
              onEdit={() => router.push({ pathname: '/food-edit', params: { id: food.id } })}
              onToggleFavorite={() => {
                setFoodFavorite(ctx, food.id, !food.isFavorite);
                refresh();
              }}
            />
          ))
        )}
      </View>
      <View style={styles.section}>
        <Text accessibilityRole="header" style={[styles.heading, { color: colors.text }]}>
          {t.mealsTitle}
        </Text>
        {data.meals.length === 0 ? (
          <Text style={[styles.body, { color: colors.text }]}>{t.noMeals}</Text>
        ) : (
          data.meals.map(({ meal, kcal }) => (
            <ItemRow
              key={meal.id}
              name={meal.name}
              detail={kcal === null ? strings.noEnergy : t.mealKcal(formatKcal(kcal))}
              isFavorite={meal.isFavorite}
              onEdit={() => router.push({ pathname: '/meal-edit', params: { id: meal.id } })}
              onToggleFavorite={() => {
                setMealFavorite(ctx, meal.id, !meal.isFavorite);
                refresh();
              }}
            />
          ))
        )}
      </View>
    </Screen>
  );
}

/** A row that opens the editor, with a separate favourite toggle (OMA-03). */
function ItemRow({
  name,
  detail,
  isFavorite,
  onEdit,
  onToggleFavorite,
}: {
  name: string;
  detail: string;
  isFavorite: boolean;
  onEdit: () => void;
  onToggleFavorite: () => void;
}) {
  const { colors } = useTheme();
  return (
    <View style={[styles.row, { borderColor: colors.border }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t.editLabel(name, detail)}
        onPress={onEdit}
        style={({ pressed }) => [styles.rowMain, pressed && styles.pressed]}
      >
        <Text style={[styles.rowName, { color: colors.text }]}>{name}</Text>
        <Text style={[styles.rowDetail, { color: colors.text }]}>{detail}</Text>
      </Pressable>
      <Pressable
        accessibilityRole="switch"
        accessibilityLabel={isFavorite ? t.unmarkFavorite(name) : t.markFavorite(name)}
        accessibilityState={{ checked: isFavorite }}
        onPress={onToggleFavorite}
        style={({ pressed }) => [
          styles.favorite,
          {
            borderColor: colors.primary,
            backgroundColor: isFavorite ? colors.primary : 'transparent',
          },
          pressed && styles.pressed,
        ]}
      >
        <Text style={[styles.favoriteText, { color: isFavorite ? '#ffffff' : colors.primary }]}>
          {isFavorite ? t.favorite : t.notFavorite}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
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
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    borderBottomWidth: 1,
  },
  rowMain: {
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 180,
    minHeight: MIN_TOUCH_SIZE,
    justifyContent: 'center',
    paddingHorizontal: 4,
    gap: 2,
  },
  rowName: {
    fontSize: 17,
    fontWeight: '600',
  },
  rowDetail: {
    fontSize: 16,
  },
  favorite: {
    minHeight: MIN_TOUCH_SIZE,
    minWidth: MIN_TOUCH_SIZE,
    paddingHorizontal: 12,
    borderWidth: 2,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  favoriteText: {
    fontSize: 16,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.6,
  },
});
