import RosettaSDK from 'rosetta-node-sdk';

class SubstrateNetworkIdentifier extends RosettaSDK.Client.NetworkIdentifier {
  constructor(blockchain, network, nodeAddress) {
    super(blockchain, network);
    this.nodeAddress = nodeAddress;
  }
}

const networkIdentifierDev = new SubstrateNetworkIdentifier('Substrate', 'Development Node', 'localhost:9944');
const networkIdentifierTestnet = new SubstrateNetworkIdentifier('Substrate', 'Dock Testnet', 'danforth-1.dock.io');
const networkIdentifierMainnet = new SubstrateNetworkIdentifier('Substrate', 'Dock Mainnet', 'mainnet-node.dock.io');

export default [networkIdentifierDev, networkIdentifierTestnet, networkIdentifierMainnet];
