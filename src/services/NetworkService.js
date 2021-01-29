import RosettaSDK from 'rosetta-node-sdk';

const Types = RosettaSDK.Client;

import networkIdentifiers from '../network';
import errorTypes from '../helpers/error-types';
import {
  getNetworkConnection,
  getNetworkIdentifier,
  getNetworkApiFromRequest,
} from '../substrate/connections';

/* Data API: Network */

/**
* Get List of Available Networks
* This endpoint returns a list of NetworkIdentifiers that the Rosetta server can handle.
*
* metadataRequest MetadataRequest
* returns NetworkListResponse
* */
const networkList = async () => {
  return new Types.NetworkListResponse(networkIdentifiers);
};

/**
* Get Network Options
* This endpoint returns the version information and allowed network-specific types for a NetworkIdentifier. Any NetworkIdentifier returned by /network/list should be accessible here.  Because options are retrievable in the context of a NetworkIdentifier, it is possible to define unique options for each network.
*
* networkRequest NetworkRequest
* returns NetworkOptionsResponse
* */
const networkOptions = async (params) => {
  const { networkRequest } = params;

  // Get api connection
  const api = await getNetworkApiFromRequest(networkRequest);
  const nodeVersion = await api.rpc.system.version();
  const rosettaVersion = '1.4.10';

  // Binary true/false success state for extrinsics
  const operationStatuses = [
    new Types.OperationStatus('SUCCESS', true),
    new Types.OperationStatus('FAILURE', false),
  ];

  // TODO: map proper operation types, these are cop[ied from eth]
  // see https://polkadot.js.org/docs/substrate/events/#balances for balance related op types
  const operationTypes = [
    'Transfer',
    'Create',
    'Reserved',
    'TxFeeGiven',

    // "MINER_REWARD",
    // "UNCLE_REWARD",
    // "FEE",
    // "CALL",
    // "CREATE",
    // "CREATE2",
    // "SELFDESTRUCT",
    // "CALLCODE",
    // "DELEGATECALL",
    // "STATICCALL",
    // "DESTRUCT",
  ];

  const errors = errorTypes.map(error => new Types.Error(error.code, error.message, error.retriable));

  return new Types.NetworkOptionsResponse(
    new Types.Version(rosettaVersion, nodeVersion),
    new Types.Allow(
      operationStatuses,
      operationTypes,
      errors,
    ),
  );
};

/**
* Get Network Status
* This endpoint returns the current status of the network requested. Any NetworkIdentifier returned by /network/list should be accessible here.
*
* networkRequest NetworkRequest
* returns NetworkStatusResponse
* */
const networkStatus = async (params) => {
  const { networkRequest } = params;

  // Get api connection
  const api = await getNetworkApiFromRequest(networkRequest);

  // Get block info
  const genesisBlockIndex = 0;
  const currentBlockTimestamp = (await api.query.timestamp.now()).toNumber();
  const genesisBlockHash = await api.rpc.chain.getBlockHash(genesisBlockIndex);
  const currentBlock = await api.rpc.chain.getBlock();

  // Format into correct types
  const currentBlockIdentifier = new Types.BlockIdentifier(currentBlock.block.header.number, currentBlock.block.header.hash.toHex());
  const genesisBlockIdentifier = new Types.BlockIdentifier(genesisBlockIndex, genesisBlockHash);

  // TODO: get peers, is it relevant?
  const peers = [];

  // TODO: evalulate need of sync status object for substrate
    // "sync_status": {
    //     "current_index": 24708,
    //     "target_index": 11733243
    // },

  return new Types.NetworkStatusResponse(
    currentBlockIdentifier,
    currentBlockTimestamp,
    genesisBlockIdentifier,
    peers,
  );
};

module.exports = {
  /* /network/list */
  networkList,

  /* /network/options */
  networkOptions,

  /* /network/status */
  networkStatus,
};
