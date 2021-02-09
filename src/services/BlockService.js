import RosettaSDK from 'rosetta-node-sdk';
import { getTypeDef } from '@polkadot/types';
import { u8aToHex } from '@polkadot/util';
import BN from 'bn.js';

import {
  getNetworkConnection,
  getNetworkIdentifier,
  getNetworkApiFromRequest,
} from '../substrate/connections';

import dckCurrency from '../helpers/currency';
import extrinsicOpMap from '../helpers/extrinsic-operation-map';

const Types = RosettaSDK.Client;

const OPERATION_STATUS_SUCCESS = 'SUCCESS';
const OPERATION_STATUS_FAILURE = 'FAILURE';

function getOperationAmountFromEvent(operationId, args, api) {
  if (operationId === 'balances.transfer' || operationId === 'poamodule.txnfeesgiven') {
    return api.createType('Balance', args[2]);
  } else if (operationId === 'balances.reserved') {
    return api.createType('Balance', args[1]);
  } else if (operationId === 'balances.endowed') {
    return api.createType('Balance', args[1]);
  } else if (operationId === 'poamodule.epochends') {
    // TODO: pull proper value from epoch data
    return api.createType('Balance', '9000000000'); // using 9000dck as epoch treasury rewards, this doesnt handle validator rewards atm
  } else {
    return 0;
  }
}

function getEffectedAccountFromEvent(operationId, args, api) {
  if (operationId === 'poamodule.txnfeesgiven' || operationId === 'balances.transfer') {
    return args[1];
  } else if (operationId === 'poamodule.epochends') {
    return '5EYCAe5d818kja8P5YikNggRz4KxztMtMhxP6qSTw7Bwahwq'; // treasury, TODO: get from chain or network info?
  } else {
    return args[0];
  }
}

function getSourceAccountFromEvent(operationId, args, api) {
  if (operationId === 'balances.transfer') {
    return args[0];
  }
}

/*
  problem:
  a block may contain multiple extrinsics by different signers
  an extrinsic signer is not always the source of funds in balance changes (sudo calls etc)
  sometimes source account is defined in event data (sudo setbalance), other times it isnt (balances.transfer)
*/
// TODO: failure events are not displayed!
function processRecordToOp(api, record, operations, extrinsicArgs, status, allRecords) {
  const { event } = record;

  const operationId = `${event.section}.${event.method}`.toLowerCase();
  console.log('operationId', operationId, status)

  // console.log('operationId', operationId)
  const eventOpType = extrinsicOpMap[operationId];
  if (eventOpType) {
    console.error(`proessing event:\n\t${event.section}:${event.method}:: (phase=${record.phase.toString()}) ${eventOpType}`);
    const params = event.typeDef.map(({ type }) => ({ type: getTypeDef(type) }));
    const values = event.data.map((value) => ({ isValid: true, value }));
    const args = params.map((param, index) => {
      return values[index].value;
    });

    const destAccountAddress = getEffectedAccountFromEvent(operationId, args, api);
    const balanceAmount = getOperationAmountFromEvent(operationId, args, api);

    // Apply minus delta balance from source (typically index 0)
    const sourceAccountAddress = getSourceAccountFromEvent(operationId, args, api, allRecords);
    if (sourceAccountAddress) {
      operations.push(
        Types.Operation.constructFromObject({
          'operation_identifier': new Types.OperationIdentifier(operations.length),
          'type': eventOpType,
          'status': status,
          'account': new Types.AccountIdentifier(sourceAccountAddress),
          'amount': new Types.Amount(
            balanceAmount.neg().toString(),
            dckCurrency
          ),
        })
      );
    }

    // Operations map to balance changing events (typically index 1)
    operations.push(
      Types.Operation.constructFromObject({
        'operation_identifier': new Types.OperationIdentifier(operations.length),
        'type': eventOpType,
        'status': status,
        'account': new Types.AccountIdentifier(destAccountAddress),
        'amount': new Types.Amount(
          balanceAmount.toString(),
          dckCurrency
        ),
      })
    );
  } else {
    console.error(`unprocessed event:\n\t${event.section}:${event.method}:: (phase=${record.phase.toString()}) `);
  }
}

function getTxFeeFromEvent(api, event, txFee) {
  if (event && event.section.toLowerCase() === 'poamodule' && event.method.toLowerCase() === 'txnfeesgiven') {
    return api.createType('Balance', event.data[2]).neg().toString();
  }
  return txFee || 0;
}

function getTransactions(currentBlock, allRecords, api, shouldDisplay = null, blockHash, paymentInfos) {
  const transactions = [];
  const fees = [];

  // map between the extrinsics and events
  console.log('currentBlock.block.extrinsics.', currentBlock.block.extrinsics.length);


  const extrinsicCount = currentBlock.block.extrinsics.length;
  const extrinsics = currentBlock.block.extrinsics;
  extrinsics.forEach((extrinsic, index) => {
    const { method: { method, section, args }, signer, hash } = extrinsic;
    const extrinsicAction = `${section}.${method}`.toLowerCase();
    if (extrinsicAction === 'timestamp.set') {
      return;
    }

    const paymentInfo = paymentInfos[index];
    const operationType = extrinsicOpMap[`${section}.${method}`.toLowerCase()];
    const transactionIdentifier = new Types.TransactionIdentifier(hash.toHex().substr(2));
    const operations = [];

    let paysFee = false;
    if (operationType && (!shouldDisplay || shouldDisplay(section, method, hash))) {
      const sourceAccountAddress = signer.toString();

      // Get extrinsic status/fee info
      let extrinsicStatus = 'UNKNOWN';
      allRecords
        // filter the specific events based on the phase and then the
        // index of our extrinsic in the block
        .filter(({ phase }) =>
          phase.isApplyExtrinsic &&
          phase.asApplyExtrinsic.eq(index)
        )
        // test the events against the specific types we are looking for
        .forEach((record) => {
          const { event } = record;
          const extrinsicAction = `${event.section}:${event.method}`;
          const extrinsicSuccess = extrinsicAction === 'system:ExtrinsicSuccess';
          const extrinsicFailed = extrinsicAction === 'system:ExtrinsicFailed';
          if (extrinsicSuccess) {
            extrinsicStatus = OPERATION_STATUS_SUCCESS;
          } else if (extrinsicFailed) {
            extrinsicStatus = OPERATION_STATUS_FAILURE;
          }

          if (extrinsicSuccess || extrinsicFailed) {
            console.error(`event determine success/fail:\n\t${event.section}:${event.method}:: (phase=${record.phase.toString()}) success: ${extrinsicSuccess} fail: ${extrinsicFailed} status: ${extrinsicStatus}`);

            const eventData = (event.toHuman()).data[0];
            if (eventData && eventData.paysFee === 'Yes') {
              paysFee = true;
            }
          }
        });

      // Parse events
      allRecords
        // filter the specific events based on the phase and then the
        // index of our extrinsic in the block
        .filter(({ phase }) =>
          {
            return phase.isApplyExtrinsic &&
            phase.asApplyExtrinsic.eq(index);
          }
        )
        // test the events against the specific types we are looking for
        .forEach((record, index) => {
          const { event } = record;
          processRecordToOp(api, record, operations, args, extrinsicStatus, allRecords);
        });
    }

    if (operations.length > 0) {
      transactions.push(new Types.Transaction(transactionIdentifier, operations));
    }

    const extrinsicData = extrinsic.toHuman();
    const txFee = paymentInfo ? paymentInfo.partialFee.neg().toString() : '';
    if (extrinsicData.isSigned && paysFee && txFee) {
      fees.push({
        'account': new Types.AccountIdentifier(extrinsicData.signer),
        'amount': new Types.Amount(
          txFee,
          dckCurrency
        ),
      });
    }
  });

  return {
    transactions,
    fees,
  };
}


function getTransactionsFromEvents(allRecords, api, blockHash) {
  const extrinsicStatus = OPERATION_STATUS_SUCCESS;
  const transactions = allRecords.map(record => {
    const operations = [];
    processRecordToOp(api, record, operations, null, extrinsicStatus, allRecords);
    if (operations.length) {
      const transactionIdentifier = new Types.TransactionIdentifier(u8aToHex(record.hash).substr(2));
      return new Types.Transaction(transactionIdentifier, operations);
    }
  }).filter(event => {
    return event !== undefined;
  });

  return transactions;
}

function getExtrinsicHashes(currentBlock, allRecords, api, shouldDisplay = null) {
  const transactions = [];
  currentBlock.block.extrinsics.forEach(({ method: { method, section, args }, hash }, index) => {
    if (!shouldDisplay || shouldDisplay(section, method)) {
      // const operationType = extrinsicOpMap[`${section}.${method}`];
      // if (operationType) {
        const transactionIdentifier = new Types.TransactionIdentifier(allRecords.hash.toString().substr(2));
        transactions.push(transactionIdentifier);
      // }
    }
  });
  return transactions;
}

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
  console.log('blockRequest', blockRequest)
  const api = await getNetworkApiFromRequest(blockRequest);
  const { index, hash } = blockRequest.block_identifier;

  // Get block hash if not set
  let blockHash = hash;
  let blockIndex = index;
  if (!blockHash) {
    blockHash = await api.rpc.chain.getBlockHash(blockIndex);
  }

  // Get block timestamp
  const timestamp = (await api.query.timestamp.now.at(blockHash)).toNumber();

  // Genesis block
  if (blockIndex === 0) {
    const blockIdentifier = new Types.BlockIdentifier(
      blockIndex,
      blockHash,
    );

    // Define block format
    const block = new Types.Block(
      blockIdentifier,
      blockIdentifier,
      timestamp,
      [],
    );

    // Format data into block response
    return new Types.BlockResponse(
      block,
      [],
    );
  }

  // Get block info and set index if not set
  const currentBlock = await api.rpc.chain.getBlock(blockHash);
  if (!blockIndex) {
    blockIndex = currentBlock.block.header.number.toNumber();
  }

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


  // Get payment infos for all extrinsics
  // NOTE: we have to do this here because of some weird async generator bug in getTransactions
  const paymentInfoPromises = [];
  const extrinsics = currentBlock.block.extrinsics;
  for (let index = 0; index < extrinsics.length; index++) {
    const extrinsic = extrinsics[index];
    paymentInfoPromises.push(api.rpc.payment.queryInfo(extrinsic.toHex(), blockHash));
  }

  const paymentInfos = await Promise.all(paymentInfoPromises);



  // TODO: failed extrinsics (such as balance too low) doenst show tx fee negative
  // or operation in transactions array. see dev: http://localhost:5555/Substrate/Development%20Node/block/727



  const allRecords = await api.query.system.events.at(blockHash);
  const { transactions, fees } = getTransactions(currentBlock, allRecords, api, (section, method) => {
    return true;
    // return section === 'balances';
  }, blockHash, paymentInfos);

  // Get system events as this can also contain balance changing info (poa, reserved etc)
  // HACK: (i think) setting txHash to blockHash for system events, since they arent related to extrinsic hashes
  const systemTransactions = getTransactionsFromEvents(allRecords.filter(({ phase }) => !phase.isApplyExtrinsic), api, blockHash);

  // Add fees to system transactions
  if (systemTransactions.length) {
    const operations = systemTransactions[0].operations;
    operations.push(...fees.map((fee, feeIndex) => {
      return Types.Operation.constructFromObject({
        'operation_identifier': new Types.OperationIdentifier(operations.length + feeIndex),
        'type': 'TxFeeGiven',
        'status': 'SUCCESS',
        ...fee,
      });
    }));
  }

  console.log('systemTransactions', systemTransactions, systemTransactions.length)
  transactions.push(...systemTransactions);

  console.log('fees', fees)

  // Gather other related transaction hashes
  const otherTransactions = getExtrinsicHashes(currentBlock, allRecords, api, (section, method) => {
    return false; // For Substrate I don't think we need to include other_transactions in response
    // return section !== 'balances';
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
  // response.other_transactions = otherTransactions; // TODO: discover why blockresponse type doesnt support it

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
  console.log('blockTransactionRequest', params)
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
  const { transactions, fees } = getTransactions(currentBlock, allRecords, api, (section, method, hash) => {
    return hash.toString() === txIdentifier.hash.toString();
  }, blockHash, []);

  return transactions[0] || {};
};

module.exports = {
  /* /block */
  block,

  /* /block/transaction */
  blockTransaction,
};
