export type BlockchainAnchorAdapterMode = 'disabled' | 'in-memory' | 'fabric-local' | 'fabric';

export type BlockchainAnchorRuntimeConfig = {
  adapter: BlockchainAnchorAdapterMode;
  requestedAdapter: string;
  valid: boolean;
  validationIssues: string[];
  missingFabricEnv: string[];
  fabric: {
    channelName?: string;
    chaincodeName?: string;
    connectionProfile?: string;
    walletPath?: string;
    identity?: string;
  };
};

export type BlockchainAnchorRuntimeReadiness = {
  mode: 'disabled' | 'local' | 'configured' | 'unavailable';
  proofAdapter: BlockchainAnchorAdapterMode;
  configured: boolean;
  available: boolean;
  simulated: boolean;
  reason?: string;
  missingConfiguration?: string[];
  channelName?: string;
  chaincodeName?: string;
  connectionProfileConfigured?: boolean;
  walletPathConfigured?: boolean;
  identityConfigured?: boolean;
};

const ALLOWED_ADAPTERS = new Set<BlockchainAnchorAdapterMode>([
  'disabled',
  'in-memory',
  'fabric-local',
  'fabric',
]);

const REQUIRED_FABRIC_ENV = [
  'FABRIC_CHANNEL_NAME',
  'FABRIC_CHAINCODE_NAME',
  'FABRIC_CONNECTION_PROFILE',
  'FABRIC_WALLET_PATH',
  'FABRIC_IDENTITY',
] as const;

function envValue(env: NodeJS.ProcessEnv, key: string): string | undefined {
  const value = env[key]?.trim();
  return value && value.length > 0 ? value : undefined;
}

function parseAdapter(value: string): BlockchainAnchorAdapterMode | undefined {
  return ALLOWED_ADAPTERS.has(value as BlockchainAnchorAdapterMode)
    ? value as BlockchainAnchorAdapterMode
    : undefined;
}

export function requiresFabricConfiguration(adapter: BlockchainAnchorAdapterMode): boolean {
  return adapter === 'fabric-local' || adapter === 'fabric';
}

export function loadBlockchainAnchorRuntimeConfig(
  env: NodeJS.ProcessEnv = process.env,
): BlockchainAnchorRuntimeConfig {
  const requestedAdapter = envValue(env, 'BLOCKCHAIN_ANCHOR_ADAPTER') ?? 'in-memory';
  const parsedAdapter = parseAdapter(requestedAdapter);
  const adapter = parsedAdapter ?? 'disabled';
  const validationIssues = parsedAdapter
    ? []
    : [`Unsupported BLOCKCHAIN_ANCHOR_ADAPTER '${requestedAdapter}'.`];

  const missingFabricEnv = requiresFabricConfiguration(adapter)
    ? REQUIRED_FABRIC_ENV.filter(key => !envValue(env, key))
    : [];

  if (missingFabricEnv.length > 0) {
    validationIssues.push(`Missing Fabric runtime configuration: ${missingFabricEnv.join(', ')}.`);
  }

  return {
    adapter,
    requestedAdapter,
    valid: validationIssues.length === 0,
    validationIssues,
    missingFabricEnv,
    fabric: {
      channelName: envValue(env, 'FABRIC_CHANNEL_NAME'),
      chaincodeName: envValue(env, 'FABRIC_CHAINCODE_NAME'),
      connectionProfile: envValue(env, 'FABRIC_CONNECTION_PROFILE'),
      walletPath: envValue(env, 'FABRIC_WALLET_PATH'),
      identity: envValue(env, 'FABRIC_IDENTITY'),
    },
  };
}

export function buildBlockchainAnchorReadiness(
  config: BlockchainAnchorRuntimeConfig,
  input?: {
    available?: boolean;
    reason?: string;
  },
): BlockchainAnchorRuntimeReadiness {
  if (config.adapter === 'disabled') {
    return {
      mode: config.valid ? 'disabled' : 'unavailable',
      proofAdapter: 'disabled',
      configured: false,
      available: false,
      simulated: false,
      reason: config.valid ? 'blockchain_anchor_disabled' : 'invalid_blockchain_anchor_adapter',
    };
  }

  if (config.adapter === 'in-memory') {
    return {
      mode: 'local',
      proofAdapter: 'in-memory',
      configured: true,
      available: true,
      simulated: true,
      reason: 'in_memory_anchor_gateway',
    };
  }

  const base = {
    proofAdapter: config.adapter,
    configured: config.missingFabricEnv.length === 0,
    simulated: false,
    channelName: config.fabric.channelName,
    chaincodeName: config.fabric.chaincodeName,
    connectionProfileConfigured: Boolean(config.fabric.connectionProfile),
    walletPathConfigured: Boolean(config.fabric.walletPath),
    identityConfigured: Boolean(config.fabric.identity),
  };

  if (config.missingFabricEnv.length > 0) {
    return {
      ...base,
      mode: 'unavailable',
      available: false,
      reason: 'missing_fabric_runtime_configuration',
      missingConfiguration: [...config.missingFabricEnv],
    };
  }

  const available = input?.available ?? false;
  return {
    ...base,
    mode: available ? 'configured' : 'unavailable',
    available,
    reason: available ? undefined : input?.reason ?? 'fabric_gateway_unavailable',
  };
}
