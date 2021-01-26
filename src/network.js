import RosettaSDK from 'rosetta-node-sdk';

const networkIdentifierTestnet = new RosettaSDK.Client.NetworkIdentifier('Substrate', 'Dock Testnet');
const networkIdentifierMainnet = new RosettaSDK.Client.NetworkIdentifier('Substrate', 'Dock Mainnet');

export default [networkIdentifierTestnet, networkIdentifierMainnet];
