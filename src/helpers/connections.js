import { ApiPromise, WsProvider } from '@polkadot/api';
import RosettaSDK from 'rosetta-node-sdk';

import networkIdentifiers from '../network';

import { Registry } from '../offline-signing';

const connections = {};
const registries = {};
const currencies = {};
const isOffline = process.argv.indexOf('--offline') > -1;

class SubstrateNetworkConnection {
  constructor({ nodeAddress, types }) {
    this.nodeAddress = nodeAddress;
    this.types = types;
  }

  async connect() {
    if (this.api && this.api.isConnected) {
      return this.api;
    }

    this.api = await ApiPromise.create({
      provider: new WsProvider(this.nodeAddress),
      types: this.types,
    });

    return this.api;
  }
}

export function getNetworkCurrencyFromRequest(networkRequest) {
  const targetNetworkIdentifier = networkRequest.network_identifier || networkIdentifiers[0];
  const { blockchain, network } = targetNetworkIdentifier;
  const networkIdentifier = getNetworkIdentifier(targetNetworkIdentifier);
  if (networkIdentifier) {
    const { nodeAddress, properties } = networkIdentifier;
    if (!currencies[nodeAddress]) {
      currencies[nodeAddress] = new RosettaSDK.Client.Currency(properties.tokenSymbol, properties.tokenDecimals);
    }
    return currencies[nodeAddress];
  }
  return null;
}

export function getNetworkIdentifier({ blockchain, network }) {
  for (let i = 0; i < networkIdentifiers.length; i++) {
    const networkIdentifier = networkIdentifiers[i];
    if (
      blockchain === networkIdentifier.blockchain
      && network === networkIdentifier.network
    ) {
      return networkIdentifier;
    }
  }

  return null;
}

export function getNetworkIdentifierFromRequest(networkRequest) {
  const targetNetworkIdentifier = networkRequest.network_identifier || networkIdentifiers[0];
  const { blockchain, network } = targetNetworkIdentifier;
  const networkIdentifier = getNetworkIdentifier(targetNetworkIdentifier);
  if (networkIdentifier) {
    return networkIdentifier;
  }
  throw new Error(
    `Can't find network with blockchain and network of: ${blockchain}, ${network}`,
  );
}

export async function getNetworkApiFromRequest(networkRequest) {
  const networkIdentifier = getNetworkIdentifierFromRequest(networkRequest);
  const { api } = await getNetworkConnection(networkIdentifier);
  return api;
}

export async function getNetworkConnection(networkIdentifier) {
  if (isOffline) {
    throw new Error('Server is in offline mode');
  }

  const { nodeAddress } = networkIdentifier;
  if (!connections[nodeAddress]) {
    const connection = new SubstrateNetworkConnection(networkIdentifier);
    connections[nodeAddress] = connection;
    await connection.connect();
  }

  return connections[nodeAddress];
}

export function getNetworkRegistryFromRequest(networkRequest) {
  const targetNetworkIdentifier = networkRequest.network_identifier || networkIdentifiers[0];
  const networkIdentifier = getNetworkIdentifier(targetNetworkIdentifier);
  const { nodeAddress } = networkIdentifier;
  if (!registries[nodeAddress]) {
    registries[nodeAddress] = new Registry({
      chainInfo: networkIdentifier,
      types: networkIdentifier.types,
      metadata: networkIdentifier.metadataRpc,
    });
  }
  return registries[nodeAddress];
}
