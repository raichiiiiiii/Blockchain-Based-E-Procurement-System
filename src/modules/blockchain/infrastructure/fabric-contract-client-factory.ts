import type { BlockchainAnchorRuntimeConfig } from '../application/blockchain-anchor-runtime-config.js';
import type { FabricBlockchainAnchorGateway } from './fabric-blockchain-anchor-gateway.js';

export type FabricContractGatewayFactoryResult =
  | {
      gateway: FabricBlockchainAnchorGateway;
      unavailableReason?: never;
    }
  | {
      gateway?: never;
      unavailableReason: string;
    };

export function createFabricContractGateway(
  _config: BlockchainAnchorRuntimeConfig,
): FabricContractGatewayFactoryResult {
  return {
    unavailableReason: 'fabric_gateway_sdk_dependency_missing',
  };
}
