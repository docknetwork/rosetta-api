const RosettaSDK = require('rosetta-node-sdk');

import {
  ERROR_NOT_IMPLEMENTED,
  throwError,
} from '../helpers/error-types';

/* Data API: Account */

/**
* Any call will log to console and throw not implemented error
* */
const dummy = async (params) => {
  console.log('Dummy request triggered, params:', params)
  throwError(ERROR_NOT_IMPLEMENTED);
  return {};
};

module.exports = {
  dummy,
};
