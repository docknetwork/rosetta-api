import RosettaSDK from 'rosetta-node-sdk';

const Types = RosettaSDK.Client;

import networkIdentifiers from '../network';

function getNetworkIdentifier({ blockchain, network }) {
  for (let i = 0; i < networkIdentifiers.length; i++) {
    const networkIdentifier = networkIdentifiers[i];
    if (blockchain === networkIdentifier.blockchain && network === networkIdentifier.network) {
      return networkIdentifier;
    }
  }

  return null;
}

import { getNetworkConnection } from '../substrate/connections';

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

async function getNetworkApiFromRequest(networkRequest) {
  const targetNetworkIdentifier = networkRequest.network_identifier || networkIdentifiers[0];
  const { blockchain, network } = targetNetworkIdentifier;
  const networkIdentifier = getNetworkIdentifier(targetNetworkIdentifier);
  const { api } = await getNetworkConnection(networkIdentifier);
  return api;
}

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

  // Get api connection
  const api = await getNetworkApiFromRequest(networkRequest);

  // Get block info
  const currentBlockTimestamp = (await api.query.timestamp.now()).toNumber();
  const genesisBlockHash = await api.rpc.chain.getBlockHash(0);
  const currentBlock = await api.rpc.chain.getBlock();

  // Format into correct types
  const currentBlockIdentifier = new Types.BlockIdentifier(currentBlock.block.header.number, currentBlock.block.header.hash.toHex());
  const genesisBlockIdentifier = new Types.BlockIdentifier(0, genesisBlockHash);

  // TODO: get peers
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
