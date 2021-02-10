import RosettaSDK from 'rosetta-node-sdk';

import networkIdentifiers from '../network';
import { errorTypes } from '../helpers/error-types';
import {
  getNetworkApiFromRequest,
} from '../substrate/connections';

const Types = RosettaSDK.Client;

// Rosetta API target version
const rosettaVersion = '1.4.10';

// Binary true/false success state for extrinsics
const operationStatuses = [
  new Types.OperationStatus('SUCCESS', true),
  new Types.OperationStatus('FAILURE', false),
];

// List of operation supported types
const operationTypes = [
  'Transfer',
  'Create',
  'Reserved',
  'Endowed',
  'EpochEnds',
  'Fee',
];

/* Data API: Network */

/**
 * Get List of Available Networks
 * This endpoint returns a list of NetworkIdentifiers that the Rosetta server can handle.
 *
 * metadataRequest MetadataRequest
 * returns NetworkListResponse
 * */
const networkList = async () => new Types.NetworkListResponse(networkIdentifiers);

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
  const errors = errorTypes.map(
    (error) => new Types.Error(error.code, error.message, error.retriable),
  );

  return new Types.NetworkOptionsResponse(
    new Types.Version(rosettaVersion, nodeVersion),
    new Types.Allow(operationStatuses, operationTypes, errors),
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
  const currentBlockIdentifier = new Types.BlockIdentifier(
    currentBlock.block.header.number,
    currentBlock.block.header.hash.toHex(),
  );
  const genesisBlockIdentifier = new Types.BlockIdentifier(
    genesisBlockIndex,
    genesisBlockHash,
  );

  // Dont need any peers for now, format response
  const peers = [];
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
