export type RuntimePersistenceMode = 'memory' | 'postgres';

export type RuntimeFabricMode = 'local' | 'configured' | 'unavailable';

export type RuntimePaymentMode = 'notConfigured' | 'manual' | 'sandbox' | 'external';

export type RuntimeReadiness = {
  status: 'ready' | 'degraded';
  checks: {
    database: {
      mode: RuntimePersistenceMode;
      reachable: boolean;
    };
    fabric: {
      mode: RuntimeFabricMode;
    };
    payment: {
      mode: RuntimePaymentMode;
      configured: boolean;
    };
    demoSeed: {
      enabled: boolean;
    };
  };
};

export function resolveRuntimeFabricMode(env: NodeJS.ProcessEnv = process.env): RuntimeFabricMode {
  if (env.FABRIC_GATEWAY_ENABLED === 'true') {
    return 'configured';
  }

  return 'local';
}

export function resolveRuntimePaymentMode(env: NodeJS.ProcessEnv = process.env): RuntimePaymentMode {
  const mode = env.PAYMENT_ADAPTER_MODE;
  if (mode === 'manual' || mode === 'sandbox' || mode === 'external') {
    return mode;
  }

  return 'notConfigured';
}

export function buildRuntimeReadiness(input: {
  databaseMode: RuntimePersistenceMode;
  databaseReachable: boolean;
  env?: NodeJS.ProcessEnv;
}): RuntimeReadiness {
  const env = input.env ?? process.env;
  const paymentMode = resolveRuntimePaymentMode(env);

  return {
    status: input.databaseReachable ? 'ready' : 'degraded',
    checks: {
      database: {
        mode: input.databaseMode,
        reachable: input.databaseReachable,
      },
      fabric: {
        mode: input.databaseReachable ? resolveRuntimeFabricMode(env) : 'unavailable',
      },
      payment: {
        mode: paymentMode,
        configured: paymentMode !== 'notConfigured',
      },
      demoSeed: {
        enabled: env.DEMO_SEED_ENABLED === 'true',
      },
    },
  };
}
