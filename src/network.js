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
    ss58Format,
    properties = {},
    genesis,
    name,
    specName,
    specVersion,
    transactionVersion,
    types = {},
    metadata,
  }) {
    super(blockchain, network);
    this.nodeAddress = nodeAddress;
    this.ss58Format = ss58Format;
    this.properties = properties;
    this.genesis = genesis;
    this.name = name;
    this.specName = specName;
    this.specVersion = specVersion;
    this.transactionVersion = transactionVersion;
    this.types = types;
    this.metadata = metadata;
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
