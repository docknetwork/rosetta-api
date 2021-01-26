import RosettaSDK from 'rosetta-node-sdk';

const Types = RosettaSDK.Client;

import networkIdentifiers from '../network';

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

  const rosettaVersion = '1.4.10';
  const nodeVersion = '0.0.1';

  const operationStatuses = [
    new Types.OperationStatus('Success', true),
    new Types.OperationStatus('Reverted', false),
  ];

  const operationTypes = [
    'Transfer',
    'Reward',
  ];

  const errors = [
    new Types.Error(1, 'not implemented', false),
  ];

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

  // TODO: get network from params

  const currentBlockIdentifier = new Types.BlockIdentifier(1000, 'block 1000');
  const currentBlockTimestamp = 1586483189000;
  const genesisBlockIdentifier = new Types.BlockIdentifier(0, 'block 0');
  const peers = [
    new Types.Peer('peer 1'),
  ];

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
