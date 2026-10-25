import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

import type { AmountError } from '@/domain/amount';
import type { LimitError } from '@/domain/limit';
import { toLocalDate, type LocalDate } from '@/domain/localDate';
import { useServices } from '@/services/ServiceProvider';

import { strings } from './strings.fi';

/**
 * Re-reads data whenever the screen gains focus or `refresh` is called. Services are synchronous,
 * so the result is up to date immediately after a change (LAA-03). Pass a stable `query`
 * (useCallback); a new one is read again at once.
 */
export function useServiceQuery<T>(query: () => T): { data: T; refresh: () => void } {
  const [data, setData] = useState(query);
  const refresh = useCallback(() => setData(query()), [query]);
  useFocusEffect(refresh);
  return { data, refresh };
}

/** The local calendar date (PAI-05), updated when the app returns to the foreground. */
export function useToday(): LocalDate {
  const ctx = useServices();
  const [today, setToday] = useState(() => toLocalDate(ctx.now()));
  const update = useCallback(() => setToday(toLocalDate(ctx.now())), [ctx]);
  useFocusEffect(update);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') update();
    });
    return () => subscription.remove();
  }, [update]);
  return today;
}

export function amountErrorMessage(error: AmountError | LimitError): string {
  return strings.amountError[error];
}
