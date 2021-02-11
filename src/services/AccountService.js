import RosettaSDK from 'rosetta-node-sdk';

import {
  getNetworkConnection,
  getNetworkIdentifier,
  getNetworkApiFromRequest,
} from '../substrate/connections';

import dckCurrency from '../helpers/currency';

const Types = RosettaSDK.Client;

/* Data API: Account */

/**
 * Get an Account Balance
 * Get an array of all Account Balances for an Account Identifier and the Block Identifier at which the balance lookup was performed.  Some consumers of account balance data need to know at which block the balance was calculated to reconcile account balance changes.  To get all balances associated with an account, it may be necessary to perform multiple balance requests with unique Account Identifiers.  If the client supports it, passing nil AccountIdentifier metadata to the request should fetch all balances (if applicable).  It is also possible to perform a historical balance lookup (if the server supports it) by passing in an optional BlockIdentifier.
 *
 * accountBalanceRequest AccountBalanceRequest
 * returns AccountBalanceResponse
 * */
const balance = async (params) => {
  const { accountBalanceRequest } = params;
  const { address } = accountBalanceRequest.account_identifier;
  const { index, hash } = accountBalanceRequest.block_identifier || {
    index: null,
    hash: null,
  };
  const api = await getNetworkApiFromRequest(accountBalanceRequest);

  // Get block hash if not set
  let blockHash = hash;
  let blockIndex = index;
  if (!blockHash) {
    blockHash = await api.rpc.chain.getBlockHash(index);
  }

  // Get block info and set index if not set
  const currentBlock = await api.rpc.chain.getBlock(blockHash);
  if (!blockIndex) {
    blockIndex = currentBlock.block.header.number.toNumber();
  }

  // Get balance at block hash
  const {
    data: { free },
  } = await api.query.system.account.at(blockHash, address);
  const validBlock = Types.BlockIdentifier.constructFromObject({
    index: blockIndex,
    hash: blockHash,
  });

  const validAmount = Types.Amount.constructFromObject({
    value: free.toString(),
    currency: dckCurrency,
  });

  return new Types.AccountBalanceResponse(validBlock, [validAmount]);
};

const coins = async (params) => {
  console.log('coins params', params);
  // TODO: return not implemented error
  return {};
};

module.exports = {
  /* /account/balance */
  balance,

  /* /account/coins */
  coins,
};
