import { beforeEach, describe, expect, it } from 'vitest';

import type { ServiceContext } from '@/services/context';
import { ServiceError } from '@/services/errors';
import { getFastDay, setFastDayLimit, startFastDay } from '@/services/fastDays';
import { getSettings, setDefaultLimit } from '@/services/settings';

import { createTestContext } from '../helpers/db';

describe('settings service (KAY-01, KAY-03)', () => {
  let ctx: ServiceContext;

  beforeEach(() => {
    ({ ctx } = createTestContext());
  });

  it('KAY-01: a new install has no limit and onboarding is not done', () => {
    expect(getSettings(ctx)).toEqual({ defaultLimitKcal: null, onboardingDone: false });
  });

  it('KAY-01: setting the limit is enough to complete onboarding', () => {
    expect(setDefaultLimit(ctx, 600)).toEqual({ defaultLimitKcal: 600, onboardingDone: true });
    expect(getSettings(ctx)).toEqual({ defaultLimitKcal: 600, onboardingDone: true });
  });

  it('KAY-01: rejects a zero, negative or non-finite limit', () => {
    for (const value of [0, -600, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => setDefaultLimit(ctx, value)).toThrow(ServiceError);
    }
    expect(getSettings(ctx).defaultLimitKcal).toBeNull();
  });

  it('KAY-03: changing the default limit applies to new fast days only', () => {
    setDefaultLimit(ctx, 600);
    const oldDay = startFastDay(ctx, '2026-10-20');

    setDefaultLimit(ctx, 500);
    const newDay = startFastDay(ctx, '2026-10-22');

    expect(getFastDay(ctx, '2026-10-20')?.limitKcal).toBe(600);
    expect(oldDay.limitKcal).toBe(600);
    expect(newDay.limitKcal).toBe(500);
  });

  it('KAY-03: an existing day limit can be changed separately without touching the default', () => {
    setDefaultLimit(ctx, 600);
    const day = startFastDay(ctx, '2026-10-20');
    const other = startFastDay(ctx, '2026-10-22');

    expect(setFastDayLimit(ctx, day.id, 650).limitKcal).toBe(650);

    expect(getSettings(ctx).defaultLimitKcal).toBe(600);
    expect(getFastDay(ctx, other.date)?.limitKcal).toBe(600);
  });
});
