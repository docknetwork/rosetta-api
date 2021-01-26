import RosettaSDK from 'rosetta-node-sdk';

import {
  getNetworkConnection,
  getNetworkIdentifier,
  getNetworkApiFromRequest,
} from '../substrate/connections';

const Types = RosettaSDK.Client;

/* Data API: Block */

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

  // Get currency info
  const currencyDecimals = 10; // TODO: pull from network
  const currencySymbol = 'DCK';




  const allRecords = await api.query.system.events.at(blockHash);
  const transactions = [];

  console.log('allRecords', allRecords)

  // map between the extrinsics and events
  currentBlock.block.extrinsics.forEach(({ method: { method, section, args } }, index) => {
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
          if (section === 'balances') {
            // const txHash = extrinsic.toHex();
            const txHash = 'TODO';
            console.log('txHash', txHash)

            console.log(`args: ${args.map((a) => a.toString()).join(', ')}`);

            const destAccountAddress = args[0];
            const balanceAmount = args[1];

            const transactionIdentifier = new Types.TransactionIdentifier(txHash);
            const operations = [ // Operations within the above transaction type
              Types.Operation.constructFromObject({
                'operation_identifier': [new Types.OperationIdentifier(index)],
                'type': method,
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

        if (extrinsicSuccess) {
          // extract the data for this event
          // (In TS, because of the guard above, these will be typed)
          const [dispatchInfo] = event.data;
          console.log(`${section}.${method}:: ExtrinsicSuccess:: ${dispatchInfo.toHuman()}`);
        } else if (extrinsicFailed) {
          // extract the data for this event
          const [dispatchError, dispatchInfo] = event.data;
          let errorInfo;

          // decode the error
          if (dispatchError.isModule) {
            // for module errors, we have the section indexed, lookup
            // (For specific known errors, we can also do a check against the
            // api.errors.<module>.<ErrorName>.is(dispatchError.asModule) guard)
            const decoded = api.registry.findMetaError(dispatchError.asModule);

            errorInfo = `${decoded.section}.${decoded.name}`;
          } else {
            // Other, CannotLookup, BadOrigin, no extra info
            errorInfo = dispatchError.toString();
          }

          console.log(`${section}.${method}:: ExtrinsicFailed:: ${errorInfo}`);
        }
      });
  });

  // Define block format
  const block = new Types.Block(
    blockIdentifier,
    parentBlockIdentifier,
    timestamp,
    transactions,
  );

  // TODO: list other txs
  const otherTransactions = [
    // new Types.TransactionIdentifier('transaction 1'),
  ];

  return new Types.BlockResponse(
    block,
    otherTransactions,
  );
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

  const transactionIdentifier = new Types.TransactionIdentifier('transaction 1');
  const operations = [
    Types.Operation.constructFromObject({
      'operation_identifier': new Types.OperationIdentifier(0),
      'type': 'Reward',
      'status': 'Success',
      'account': new Types.AccountIdentifier('account 2'),
      'amount': new Types.Amount(
        '1000',
        new Types.Currency('ROS', 2),
      ),
    }),
  ];

  return new Types.Transaction(transactionIdentifier, operations);
};

module.exports = {
  /* /block */
  block,

  /* /block/transaction */
  blockTransaction,
};
