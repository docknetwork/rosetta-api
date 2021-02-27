import {
  hexToU8a,
} from '@polkadot/util';

import {
  methods,
} from '@substrate/txwrapper';

import {
  ERROR_PARSE_INTENT,
  ERROR_POLKADOT_ERROR,
  throwError,
} from '../helpers/error-types';

import {
  getNetworkApiFromRequest,
} from '../helpers/connections';

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
  const methodSplit = method.split('.');
  const methodType = methodSplit[0];
  const isQuery = methodType === 'query';
  const isTransaction = methodType === 'tx';

  // Get method function from string
  let methodFn = isTransaction ? methods : api[methodType];
  for (let i = 1; i < methodSplit.length; i++) {
    methodFn = methodFn[methodSplit[i]];
  }

  if (!methodFn) {
    throwError(ERROR_PARSE_INTENT);
  }
  const {
    signature,
    signer,
    blockHash,
    signingPayload,
    args = [],
  } = parameters;

  // Try to execute the extrinsic or query
  try {
    const extrinsic = (blockHash && isQuery) ? methodFn.at(blockHash) : methodFn(...args);
    const isPromise = typeof extrinsic.then === 'function';
    if (isQuery || isPromise) {
      const result = (await extrinsic).toJSON();
      return {
        result,
        idempotent: isQuery,
      };
    }
    // Check if signature, if so, add it
    if (signature && signer) {
      extrinsic.addSignature(
        signer,
        hexToU8a(signature),
        signingPayload,
      );
    }

    // Try to submit the extrinsic
    const txHash = await api.rpc.author.submitExtrinsic(extrinsic.toHex());
    return {
      result: txHash,
      idempotent: false,
    };
  } catch (e) {
    throwError(ERROR_POLKADOT_ERROR, e.toString());
  }

  throwError(ERROR_PARSE_INTENT);
  return {};
};

module.exports = {
  /* /call */
  call,
};
