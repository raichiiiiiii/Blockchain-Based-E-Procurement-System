import { BackendApiError } from '../api/errors';

type FrontendEnv = {
  VITE_ENABLE_LOCAL_DEMO_FALLBACK?: string | boolean;
  VITE_ENABLE_GUIDED_DEMO?: string | boolean;
};

const truthyValues = new Set(['1', 'true', 'yes', 'on']);

function readEnv(): FrontendEnv {
  return ((import.meta as ImportMeta & { env?: FrontendEnv }).env ?? {}) as FrontendEnv;
}

function isEnabled(value: string | boolean | undefined): boolean {
  if (typeof value === 'boolean') {
    return value;
  }

  return truthyValues.has((value ?? '').trim().toLowerCase());
}

export function isLocalDemoFallbackEnabled(): boolean {
  return isEnabled(readEnv().VITE_ENABLE_LOCAL_DEMO_FALLBACK);
}

export function isGuidedDemoEnabled(): boolean {
  return isEnabled(readEnv().VITE_ENABLE_GUIDED_DEMO);
}

export function createLocalDemoFallbackDisabledError(feature: string): BackendApiError {
  return new BackendApiError(
    'UNAVAILABLE',
    `${feature} requires the backend demo data path. Start the local demo services or explicitly enable the local demo fallback for offline walkthroughs.`,
  );
}
