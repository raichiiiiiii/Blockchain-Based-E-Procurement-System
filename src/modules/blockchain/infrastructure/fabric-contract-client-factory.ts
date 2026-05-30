import type { BlockchainAnchorRuntimeConfig } from '../application/blockchain-anchor-runtime-config.js';
import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as grpc from '@grpc/grpc-js';
import { connect, signers } from '@hyperledger/fabric-gateway';
import { parse as parseYaml } from 'yaml';
import { FabricBlockchainAnchorGateway } from './fabric-blockchain-anchor-gateway.js';

export type FabricContractGatewayFactoryResult =
  | {
      gateway: FabricBlockchainAnchorGateway;
      unavailableReason?: never;
    }
  | {
      gateway?: never;
      unavailableReason: string;
    };

type ConnectionProfile = {
  client?: {
    organization?: string;
  };
  organizations?: Record<string, {
    mspid?: string;
    peers?: string[];
  }>;
  peers?: Record<string, {
    url?: string;
    grpcOptions?: Record<string, string>;
    tlsCACerts?: {
      path?: string;
    };
  }>;
};

type ResolvedIdentity = {
  mspId: string;
  certificate: Buffer;
  privateKeyPem: Buffer;
};

function readConnectionProfile(profilePath: string): ConnectionProfile {
  const raw = fs.readFileSync(profilePath, 'utf8');
  if (profilePath.endsWith('.json')) {
    return JSON.parse(raw) as ConnectionProfile;
  }

  return parseYaml(raw) as ConnectionProfile;
}

function resolveMaybeRelative(baseFile: string, configuredPath: string): string {
  if (path.isAbsolute(configuredPath)) {
    return configuredPath;
  }

  return path.resolve(path.dirname(baseFile), configuredPath);
}

function endpointFromProfileUrl(url: string): string {
  if (!url.includes('://')) {
    return url;
  }

  const parsed = new URL(url);
  return `${parsed.hostname}:${parsed.port}`;
}

function firstFile(directory: string): string | undefined {
  if (!fs.existsSync(directory)) {
    return undefined;
  }

  return fs.readdirSync(directory)
    .map(file => path.join(directory, file))
    .find(file => fs.statSync(file).isFile());
}

function readIdentityJson(identityPath: string): ResolvedIdentity | undefined {
  if (!fs.existsSync(identityPath)) {
    return undefined;
  }

  const parsed = JSON.parse(fs.readFileSync(identityPath, 'utf8')) as {
    mspId?: string;
    credentials?: {
      certificate?: string;
      privateKey?: string;
    };
  };

  if (!parsed.mspId || !parsed.credentials?.certificate || !parsed.credentials.privateKey) {
    return undefined;
  }

  return {
    mspId: parsed.mspId,
    certificate: Buffer.from(parsed.credentials.certificate),
    privateKeyPem: Buffer.from(parsed.credentials.privateKey),
  };
}

function readIdentityDirectory(identityDirectory: string, mspId: string): ResolvedIdentity | undefined {
  const flatCertificate = path.join(identityDirectory, 'cert.pem');
  const flatPrivateKey = path.join(identityDirectory, 'key.pem');
  if (fs.existsSync(flatCertificate) && fs.existsSync(flatPrivateKey)) {
    return {
      mspId,
      certificate: fs.readFileSync(flatCertificate),
      privateKeyPem: fs.readFileSync(flatPrivateKey),
    };
  }

  const signCert = firstFile(path.join(identityDirectory, 'signcerts'));
  const privateKey = firstFile(path.join(identityDirectory, 'keystore'));
  if (!signCert || !privateKey) {
    return undefined;
  }

  return {
    mspId,
    certificate: fs.readFileSync(signCert),
    privateKeyPem: fs.readFileSync(privateKey),
  };
}

function resolveIdentity(
  walletPath: string,
  identityName: string,
  mspId: string,
): ResolvedIdentity {
  const identityJson = readIdentityJson(path.join(walletPath, `${identityName}.json`));
  if (identityJson) {
    return identityJson;
  }

  const nestedIdentity = readIdentityDirectory(path.join(walletPath, identityName), mspId);
  if (nestedIdentity) {
    return nestedIdentity;
  }

  const directIdentity = readIdentityDirectory(walletPath, mspId);
  if (directIdentity) {
    return directIdentity;
  }

  throw new Error(`Fabric identity '${identityName}' was not found in wallet/MSP path '${walletPath}'.`);
}

function resolveProfilePeer(profile: ConnectionProfile, profilePath: string): {
  clientOrganization: string;
  mspId: string;
  peerEndpoint: string;
  tlsRootCertPath: string;
  sslTargetNameOverride?: string;
} {
  const clientOrganization = profile.client?.organization;
  if (!clientOrganization) {
    throw new Error('Fabric connection profile is missing client.organization.');
  }

  const organization = profile.organizations?.[clientOrganization];
  const peerName = organization?.peers?.[0];
  if (!organization || !peerName) {
    throw new Error(`Fabric connection profile has no peer for organization '${clientOrganization}'.`);
  }

  const peer = profile.peers?.[peerName];
  if (!peer?.url || !peer.tlsCACerts?.path) {
    throw new Error(`Fabric connection profile peer '${peerName}' is missing url or tlsCACerts.path.`);
  }

  return {
    clientOrganization,
    mspId: organization.mspid ?? clientOrganization,
    peerEndpoint: endpointFromProfileUrl(peer.url),
    tlsRootCertPath: resolveMaybeRelative(profilePath, peer.tlsCACerts.path),
    sslTargetNameOverride: peer.grpcOptions?.['ssl-target-name-override'],
  };
}

export function createFabricContractGateway(
  config: BlockchainAnchorRuntimeConfig,
): FabricContractGatewayFactoryResult {
  try {
    const profilePath = config.fabric.connectionProfile;
    const walletPath = config.fabric.walletPath;
    const identityName = config.fabric.identity;
    const channelName = config.fabric.channelName;
    const chaincodeName = config.fabric.chaincodeName;

    if (!profilePath || !walletPath || !identityName || !channelName || !chaincodeName) {
      return { unavailableReason: 'missing_fabric_runtime_configuration' };
    }

    const profile = readConnectionProfile(profilePath);
    const profilePeer = resolveProfilePeer(profile, profilePath);
    const identity = resolveIdentity(walletPath, identityName, profilePeer.mspId);
    const privateKey = crypto.createPrivateKey(identity.privateKeyPem);
    const tlsRootCert = fs.readFileSync(profilePeer.tlsRootCertPath);
    const client = new grpc.Client(
      profilePeer.peerEndpoint,
      grpc.credentials.createSsl(tlsRootCert),
      profilePeer.sslTargetNameOverride
        ? {
            'grpc.ssl_target_name_override': profilePeer.sslTargetNameOverride,
            'grpc.default_authority': profilePeer.sslTargetNameOverride,
          }
        : undefined,
    );
    const gateway = connect({
      client,
      identity: {
        mspId: identity.mspId,
        credentials: identity.certificate,
      },
      signer: signers.newPrivateKeySigner(privateKey),
    });
    const network = gateway.getNetwork(channelName);
    const contract = network.getContract(chaincodeName);

    return {
      gateway: new FabricBlockchainAnchorGateway({
        contract,
        blockchainNetwork: config.adapter === 'fabric' ? 'fabric' : 'fabric-local',
        channelName,
        chaincodeName,
      }),
    };
  } catch {
    return {
      unavailableReason: 'fabric_gateway_configuration_invalid',
    };
  }
}
