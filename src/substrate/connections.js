import { ApiPromise, WsProvider, Keyring } from '@polkadot/api';
import { cryptoWaitReady } from '@polkadot/util-crypto';

class SubstrateNetworkConnection {
  constructor({ nodeAddress, types }) {
    this.nodeAddress = nodeAddress;
    this.types = types;
  }

  async connect() {
    if (this.api && this.api.isConnected) {
      return this.api;
    }

    // TODO: max retry attempt and connection rejected error
    this.api = await ApiPromise.create({
      provider: new WsProvider(this.nodeAddress),
      types: this.types,
    });

    return this.api;
  }
}

const connections = {};

export async function getNetworkConnection(networkIdentifier) {
  const { nodeAddress } = networkIdentifier;
  if (!connections[nodeAddress]) {
    const connection = new SubstrateNetworkConnection(networkIdentifier);
    connections[nodeAddress] = connection;
    await connection.connect();
  }

  return connections[nodeAddress];
}
