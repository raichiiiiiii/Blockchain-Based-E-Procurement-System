import type {
  BlockchainAnchorRuntimeReadiness,
} from '../application/blockchain-anchor-runtime-config.js';
import {
  buildBlockchainAnchorReadiness,
  loadBlockchainAnchorRuntimeConfig,
} from '../application/blockchain-anchor-runtime-config.js';
import type { BlockchainAnchorGateway } from '../application/blockchain-anchor-gateway.js';
import { InMemoryBlockchainAnchorGateway } from './in-memory-blockchain-anchor-gateway.js';
import { DisabledBlockchainAnchorGateway } from './disabled-blockchain-anchor-gateway.js';
import { UnavailableFabricAnchorGateway } from './unavailable-fabric-anchor-gateway.js';
import { createFabricContractGateway } from './fabric-contract-client-factory.js';

export type BlockchainAnchorGatewayComposition = {
  gateway: BlockchainAnchorGateway;
  readiness: BlockchainAnchorRuntimeReadiness;
};

export function createRuntimeBlockchainAnchorGateway(
  env: NodeJS.ProcessEnv = process.env,
): BlockchainAnchorGatewayComposition {
  const config = loadBlockchainAnchorRuntimeConfig(env);

  if (config.adapter === 'in-memory') {
    return {
      gateway: new InMemoryBlockchainAnchorGateway(),
      readiness: buildBlockchainAnchorReadiness(config),
    };
  }

  if (config.adapter === 'disabled') {
    const reason = config.valid
      ? 'blockchain_anchor_disabled'
      : 'invalid_blockchain_anchor_adapter';

    return {
      gateway: new DisabledBlockchainAnchorGateway(reason),
      readiness: buildBlockchainAnchorReadiness(config),
    };
  }

  if (config.missingFabricEnv.length > 0) {
    const reason = 'missing_fabric_runtime_configuration';
    return {
      gateway: new UnavailableFabricAnchorGateway({
        blockchainNetwork: config.adapter,
        channelName: config.fabric.channelName,
        chaincodeName: config.fabric.chaincodeName,
        failureReason: reason,
      }),
      readiness: buildBlockchainAnchorReadiness(config, {
        available: false,
        reason,
      }),
    };
  }

  const result = createFabricContractGateway(config);
  if (result.gateway) {
    return {
      gateway: result.gateway,
      readiness: buildBlockchainAnchorReadiness(config, {
        available: true,
      }),
    };
  }

  return {
    gateway: new UnavailableFabricAnchorGateway({
      blockchainNetwork: config.adapter,
      channelName: config.fabric.channelName,
      chaincodeName: config.fabric.chaincodeName,
      failureReason: result.unavailableReason,
    }),
    readiness: buildBlockchainAnchorReadiness(config, {
      available: false,
      reason: result.unavailableReason,
    }),
  };
}
