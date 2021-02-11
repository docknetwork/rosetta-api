const types = require('../polkadot-types.json');
const metadata = require('./metadata/mainnet-metadata.json');

module.exports = {
  blockchain: 'Substrate',
  network: 'Dock Mainnet',
  nodeAddress: 'wss://mainnet-node.dock.io',
  ss58Format: 22,
  properties: {
    ss58Format: 22,
    tokenDecimals: 6,
    tokenSymbol: 'DCK',
  },
  genesis: '0xf73467c6544aa68df2ee546b135f955c46b90fa627e9b5d7935f41061bb8a5a9',
  name: 'Dock Mainnet',
  specName: 'dock-main-runtime',
  // Next 2 fields need to change whenever they change on the chain.
  specVersion: 19,
  transactionVersion: 1,
  types,
  metadataRpc: metadata.metadataRpc,
};
