import React, { createContext, useContext, ReactNode } from 'react';
import { FASTAPI_BASE_URL, TEST_LOCALLY } from '../config/flags';

interface Environment {
  mode: 'local' | 'cloud';
  baseUrl: string;
}

const EnvironmentContext = createContext<Environment | null>(null);

export function EnvironmentProvider({ children }: { children: ReactNode }) {
  const value: Environment = {
    mode: TEST_LOCALLY ? 'local' : 'cloud',
    baseUrl: FASTAPI_BASE_URL,
  };
  return <EnvironmentContext.Provider value={value}>{children}</EnvironmentContext.Provider>;
}

export function useEnvironment(): Environment {
  const ctx = useContext(EnvironmentContext);
  if (!ctx) throw new Error('useEnvironment must be used inside EnvironmentProvider');
  return ctx;
}
