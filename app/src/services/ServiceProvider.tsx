import { randomUUID } from 'expo-crypto';
import { createContext, use, type ReactNode } from 'react';

import { db } from '@/db/client';

import type { ServiceContext } from './context';

// The app's real dependencies. expo-crypto is needed because Hermes has no global crypto.
const appContext: ServiceContext = {
  db,
  now: () => new Date(),
  newId: randomUUID,
};

const ServiceReactContext = createContext<ServiceContext>(appContext);

export function ServiceProvider({ children }: { children: ReactNode }) {
  return <ServiceReactContext value={appContext}>{children}</ServiceReactContext>;
}

/** The service context for calling src/services from screens. */
export function useServices(): ServiceContext {
  return use(ServiceReactContext);
}
