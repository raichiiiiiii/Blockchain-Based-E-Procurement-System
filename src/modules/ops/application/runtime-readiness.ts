import {
  buildBlockchainAnchorReadiness,
  loadBlockchainAnchorRuntimeConfig,
  type BlockchainAnchorRuntimeReadiness,
} from '../../blockchain/application/blockchain-anchor-runtime-config.js';

export type RuntimePersistenceMode = 'memory' | 'postgres';

export type RuntimeFabricMode = BlockchainAnchorRuntimeReadiness['mode'];

export type RuntimeProofAdapterMode = BlockchainAnchorRuntimeReadiness['proofAdapter'];

export type RuntimePaymentMode = 'notConfigured' | 'manual' | 'sandbox' | 'external';

export type RuntimeReadiness = {
  status: 'ready' | 'degraded';
  checks: {
    database: {
      mode: RuntimePersistenceMode;
      reachable: boolean;
    };
    fabric: BlockchainAnchorRuntimeReadiness;
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
  return resolveRuntimeBlockchainAnchorReadiness(env).mode;
}

export function resolveRuntimeBlockchainAnchorReadiness(
  env: NodeJS.ProcessEnv = process.env,
): BlockchainAnchorRuntimeReadiness {
  return buildBlockchainAnchorReadiness(loadBlockchainAnchorRuntimeConfig(env));
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
  blockchain?: BlockchainAnchorRuntimeReadiness;
  env?: NodeJS.ProcessEnv;
}): RuntimeReadiness {
  const env = input.env ?? process.env;
  const paymentMode = resolveRuntimePaymentMode(env);
  const fabric = input.blockchain ?? resolveRuntimeBlockchainAnchorReadiness(env);
  const dependencyReady = input.databaseReachable && fabric.mode !== 'unavailable';

  return {
    status: dependencyReady ? 'ready' : 'degraded',
    checks: {
      database: {
        mode: input.databaseMode,
        reachable: input.databaseReachable,
      },
      fabric,
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
