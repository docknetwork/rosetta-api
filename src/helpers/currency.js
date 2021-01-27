import RosettaSDK from 'rosetta-node-sdk';

// Get currency info
const currencyDecimals = 10; // TODO: pull from network or config
const currencySymbol = 'DCK';

export default new RosettaSDK.Client.Currency(currencySymbol, currencyDecimals);
