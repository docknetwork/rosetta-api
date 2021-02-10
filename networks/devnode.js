const types = require('../polkadot-types.json');

module.exports = {
  blockchain: 'Substrate',
  network: 'Development Node',
  nodeAddress: 'ws://localhost:9944',
  ss58Format: 42,
  properties: {
    ss58Format: 42,
    tokenDecimals: 6,
    tokenSymbol: 'DCK',
  },
  genesis: '0xbae7b59e8d0ef61db70861f49f31e0c6145cb8c33836e2ea2fb4390996cdb174',
  name: 'Development',
  specName: 'dock-main-runtime',
  // Next 2 fields need to change whenever they change on the chain.
  specVersion: 12,
  transactionVersion: 1,
  types,
};
