import RosettaSDK from 'rosetta-node-sdk';
import fs from 'fs';

// Networks folder relative to execution publicPath
const networksFolder = './networks';

// Extend MetworkIdentifier class to set properties direct from object
class SubstrateNetworkIdentifier extends RosettaSDK.Client.NetworkIdentifier {
  constructor({
    blockchain,
    network,
    nodeAddress,
    types = {},
  }) {
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
      networks.push(new SubstrateNetworkIdentifier(data));
    });
  }
});

export default networks;
