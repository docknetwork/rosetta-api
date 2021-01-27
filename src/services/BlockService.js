import RosettaSDK from 'rosetta-node-sdk';

import {
  getNetworkConnection,
  getNetworkIdentifier,
  getNetworkApiFromRequest,
} from '../substrate/connections';

const Types = RosettaSDK.Client;

/* Data API: Block */

// Get currency info
const currencyDecimals = 10; // TODO: pull from network
const currencySymbol = 'DCK';

function getTransactions(currentBlock, allRecords, api, shouldDisplay = null) {
  const transactions = [];

  // map between the extrinsics and events
  currentBlock.block.extrinsics.forEach(({ method: { method, section, args }, hash }, index) => {
    allRecords
      // filter the specific events based on the phase and then the
      // index of our extrinsic in the block
      .filter(({ phase }) =>
        phase.isApplyExtrinsic &&
        phase.asApplyExtrinsic.eq(index)
      )
      // test the events against the specific types we are looking for
      .forEach(({ event }) => {
        const extrinsicSuccess = api.events.system.ExtrinsicSuccess.is(event);
        const extrinsicFailed = api.events.system.ExtrinsicFailed.is(event);

        if (extrinsicSuccess || extrinsicFailed) {
          if (!shouldDisplay || shouldDisplay(section, method, hash)) {
            const destAccountAddress = args[0] || 'none';
            const balanceAmount = args[1] || 0;

            const transactionIdentifier = new Types.TransactionIdentifier(hash);

            const operations = [ // Operations within the above transaction type, or the tx itself? i think 1 operation per extrinsic makes sense
              Types.Operation.constructFromObject({
                'operation_identifier': [new Types.OperationIdentifier(index)],
                'type': `${section}.${method}`,
                'status': extrinsicSuccess ? 'Success' : 'Failure',
                'account': new Types.AccountIdentifier(destAccountAddress),
                'amount': new Types.Amount(
                  balanceAmount.toString(), // TODO: balance is wrong decimal places!
                  new Types.Currency(currencySymbol, currencyDecimals)
                ),
              }),
            ];

            transactions.push(new Types.Transaction(transactionIdentifier, operations));
          }
        }
      });
  });
  return transactions;
}

function getTransactionHashes(currentBlock, allRecords, api, shouldDisplay = null) {
  const transactions = [];
  currentBlock.block.extrinsics.forEach(({ method: { method, section, args }, hash }, index) => {
    if (!shouldDisplay || shouldDisplay(section, method)) {
      const transactionIdentifier = new Types.TransactionIdentifier(hash);
      transactions.push(transactionIdentifier);
    }
  });
  return transactions;
}

/**
* Get a Block
* Get a block by its Block Identifier. If transactions are returned in the same call to the node as fetching the block, the response should include these transactions in the Block object. If not, an array of Transaction Identifiers should be returned so /block/transaction fetches can be done to get all transaction information.
*
* blockRequest BlockRequest
* returns BlockResponse
* */
const block = async (params) => {
  const { blockRequest } = params;
  const api = await getNetworkApiFromRequest(blockRequest);
  const { index, hash } = blockRequest.block_identifier;

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

  // Get block timestamp
  const timestamp = (await api.query.timestamp.now.at(blockHash)).toNumber();

  // Get block parent
  const parentHash = currentBlock.block.header.parentHash.toHex();
  const parentBlock = await api.rpc.chain.getBlock(parentHash);

  // Convert to BlockIdentifier
  const blockIdentifier = new Types.BlockIdentifier(
    blockIndex,
    blockHash,
  );

  const parentBlockIdentifier = new Types.BlockIdentifier(
    parentBlock.block.header.number.toNumber(),
    parentHash,
  );

  const allRecords = await api.query.system.events.at(blockHash);
  const transactions = getTransactions(currentBlock, allRecords, api, (section, method) => {
    return section === 'balances';
  });

  // Gather other related transaction hashes
  const otherTransactions = getTransactionHashes(currentBlock, allRecords, api, (section, method) => {
    return section !== 'balances';
  });

  // Define block format
  const block = new Types.Block(
    blockIdentifier,
    parentBlockIdentifier,
    timestamp,
    transactions,
  );

  // Format data into block response
  const response = new Types.BlockResponse(
    block,
    otherTransactions,
  );
  response.other_transactions = otherTransactions; // TODO: discover why blockresponse type doesnt support it

  return response;
};

/**
* Get a Block Transaction
* Get a transaction in a block by its Transaction Identifier. This endpoint should only be used when querying a node for a block does not return all transactions contained within it.  All transactions returned by this endpoint must be appended to any transactions returned by the /block method by consumers of this data. Fetching a transaction by hash is considered an Explorer Method (which is classified under the Future Work section).  Calling this endpoint requires reference to a BlockIdentifier because transaction parsing can change depending on which block contains the transaction. For example, in Bitcoin it is necessary to know which block contains a transaction to determine the destination of fee payments. Without specifying a block identifier, the node would have to infer which block to use (which could change during a re-org).  Implementations that require fetching previous transactions to populate the response (ex: Previous UTXOs in Bitcoin) may find it useful to run a cache within the Rosetta server in the /data directory (on a path that does not conflict with the node).
*
* blockTransactionRequest BlockTransactionRequest
* returns BlockTransactionResponse
* */
const blockTransaction = async (params) => {
  const { blockTransactionRequest } = params;
  const api = await getNetworkApiFromRequest(blockTransactionRequest);
  const { index, hash } = blockTransactionRequest.block_identifier;

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

  const txIdentifier = blockTransactionRequest.transaction_identifier;
  const allRecords = await api.query.system.events.at(blockHash);
  const transactions = getTransactions(currentBlock, allRecords, api, (section, method, hash) => {
    return hash.toString() === txIdentifier.hash.toString();
  });

  console.log('transactions', transactions)

  return transactions[0];
};

module.exports = {
  /* /block */
  block,

  /* /block/transaction */
  blockTransaction,
};
