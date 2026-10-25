import { router, useLocalSearchParams, useTheme } from 'expo-router';
import { useCallback } from 'react';
import { StyleSheet, Text } from 'react-native';

import { getFastDayById, setFastDayLimit } from '@/services/fastDays';
import { useServices } from '@/services/ServiceProvider';
import { useServiceQuery } from '@/ui/hooks';
import { LimitForm } from '@/ui/LimitForm';
import { Screen } from '@/ui/Screen';
import { strings } from '@/ui/strings.fi';

const t = strings.dayLimit;

/** Changes the limit of one fast day only; the default limit stays as it is (KAY-03). */
export default function DayLimitScreen() {
  const ctx = useServices();
  const { colors } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useCallback(() => getFastDayById(ctx, id), [ctx, id]);
  const { data: day } = useServiceQuery(query);

  if (!day) {
    return null;
  }

  return (
    <Screen>
      <Text style={[styles.body, { color: colors.text }]}>{t.hint}</Text>
      <LimitForm
        label={t.label}
        submitLabel={t.save}
        initial={day.limitKcal}
        onSave={(limitKcal) => {
          setFastDayLimit(ctx, day.id, limitKcal);
          router.back();
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {
    fontSize: 17,
  },
});
