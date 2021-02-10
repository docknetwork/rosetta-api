import RosettaSDK from 'rosetta-node-sdk';
import fs from 'fs';

import networkTypes from '../polkadot-types.json';

// Networks folder relative to execution publicPath
const networksFolder = './networks';

class SubstrateNetworkIdentifier extends RosettaSDK.Client.NetworkIdentifier {
  constructor({
    blockchain,
    network,
    nodeAddress,
  }, types = {}) {
    super(blockchain, network);
    this.nodeAddress = nodeAddress;
    this.types = types;
  }
}

// Load networks
const networks = [];
fs.readdir(networksFolder, (error, files) => {
  if (error) {
    console.error(error);
  } else {
    files.forEach(file => {
      const data = require('.' + networksFolder + '/' + file);
      networks.push(data);
    });
  }
});

export default networks;
