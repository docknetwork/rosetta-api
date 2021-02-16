import RosettaSDK from 'rosetta-node-sdk';

import {
  ERROR_PARSE_INTENT,
  throwError,
} from '../helpers/error-types';

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
  console.log('callRequest', callRequest);
  throwError(ERROR_PARSE_INTENT);
  return {};
};

module.exports = {
  /* /call */
  call,
};
