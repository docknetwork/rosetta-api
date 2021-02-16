import RosettaSDK from 'rosetta-node-sdk';

import {
  ERROR_PARSE_INTENT,
  ERROR_POLKADOT_ERROR,
  throwError,
} from '../helpers/error-types';

import {
  getNetworkApiFromRequest,
} from '../helpers/connections';

const Types = RosettaSDK.Client;

/* Data API: Call */

/**
 * Make a Network-Specific Procedure Call
 * Call invokes an arbitrary, network-specific procedure call with network-specific parameters.
 *
 * CallRequest callRequest
 * returns CallResponse
 * */
const call = async (params) => {
  const { callRequest } = params;
  const { method, parameters } = callRequest;
  const api = await getNetworkApiFromRequest(callRequest);

  // Get method function from string
  const methodSplit = method.split('.');
  const methodType = methodSplit[0];
  let methodFn = api[methodType];
  for (let i = 1; i < methodSplit.length; i++) {
    methodFn = methodFn[methodSplit[i]];
  }

  if (!methodFn) {
    throwError(ERROR_PARSE_INTENT);
  }

  const isQuery = methodType === 'query';
  const { blockHash, args = [] } = parameters;

  try {
    const extrinsic = (blockHash && isQuery) ? methodFn.at(blockHash, ...args) : methodFn(...args);
    if (isQuery) {
      const result = (await extrinsic).toJSON();
      return {
        result,
        idempotent: isQuery,
      };
    }
  } catch (e) {
    throwError(ERROR_POLKADOT_ERROR, e.toString());
  }

  throwError(ERROR_PARSE_INTENT);
};

module.exports = {
  /* /call */
  call,
};
