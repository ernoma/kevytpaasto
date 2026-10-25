import { eq } from 'drizzle-orm';

import { settings } from '@/db/schema';
import { isValidLimit } from '@/domain/limit';

import type { ServiceContext } from './context';
import { ServiceError } from './errors';

const SETTINGS_ID = 1;

export interface Settings {
  /** Null until the user has set a limit in onboarding (KAY-01). */
  defaultLimitKcal: number | null;
  onboardingDone: boolean;
}

export function getSettings(ctx: ServiceContext): Settings {
  const row = ctx.db.select().from(settings).where(eq(settings.id, SETTINGS_ID)).get();
  return {
    defaultLimitKcal: row?.defaultLimitKcal ?? null,
    onboardingDone: row?.onboardingDone ?? false,
  };
}

/**
 * Sets the default limit for new fast days and completes onboarding (KAY-01).
 * Existing fast days keep their own limit snapshot (KAY-03).
 */
export function setDefaultLimit(ctx: ServiceContext, limitKcal: number): Settings {
  if (!isValidLimit(limitKcal)) {
    throw new ServiceError('invalid_limit', `Invalid limit: ${limitKcal}`);
  }
  ctx.db
    .insert(settings)
    .values({ id: SETTINGS_ID, defaultLimitKcal: limitKcal, onboardingDone: true })
    .onConflictDoUpdate({
      target: settings.id,
      set: { defaultLimitKcal: limitKcal, onboardingDone: true },
    })
    .run();
  return getSettings(ctx);
}
