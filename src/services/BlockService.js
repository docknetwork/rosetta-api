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
/*
  problem:
  a block may contain multiple extrinsics by different signers
  an extrinsic signer is not always the source of funds in balance changes (sudo calls etc)
  sometimes source account is defined in event data (sudo setbalance), other times it isnt (balances.transfer)
*/

const OPERATION_STATUS_SUCCESS = 'SUCCESS';
const OPERATION_STATUS_FAILURE = 'FAILURE';
const OPERATION_STATUS_UNKNOWN = 'UNKNOWN';

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

function getEffectedAccountFromExtrinsic(api, extrinsic, extrinsicMethod) {
  if (extrinsicMethod === 'balances.transfer' || extrinsicMethod === 'balances.transferkeepalive') {
    return extrinsic.method.args[0].toString();
  }
}

function getOperationAmountFromExtrinsic(api, extrinsic, extrinsicMethod) {
  // console.log('operationType', extrinsicMethod, extrinsic.toHuman(), extrinsic.method.args[0], extrinsic.method.args[1]);
  if (extrinsicMethod === 'balances.transfer' || extrinsicMethod === 'balances.transferkeepalive') {
    return api.createType('Balance', extrinsic.method.args[1]);
  }
}

function getSourceAccountFromExtrinsic(extrinsic) {
  return extrinsic.signer.toString();
}

function addToOperations(operations, eventOpType, status, destAccountAddress, balanceAmount, sourceAccountAddress) {
  // Apply minus delta balance from source (typically index 0)
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
}

function processRecordToOp(api, record, operations, extrinsicArgs, status, allRecords) {
  const { event } = record;
  const operationId = `${event.section}.${event.method}`.toLowerCase();
  const eventOpType = extrinsicOpMap[operationId];
  if (eventOpType) {
    const params = event.typeDef.map(({ type }) => ({ type: getTypeDef(type) }));
    const values = event.data.map((value) => ({ isValid: true, value }));
    const args = params.map((param, index) => {
      return values[index].value;
    });

    const destAccountAddress = getEffectedAccountFromEvent(operationId, args, api);
    const balanceAmount = getOperationAmountFromEvent(operationId, args, api);
    const sourceAccountAddress = getSourceAccountFromEvent(operationId, args, api, allRecords);

    addToOperations(operations, eventOpType, status, destAccountAddress, balanceAmount, sourceAccountAddress);
  } else {
    // console.error(`unprocessed event:\n\t${event.section}:${event.method}:: (phase=${record.phase.toString()}) `);
  }
}

function getTransactions(currentBlock, allRecords, api, shouldDisplay = null, blockHash, paymentInfos) {
// console.log('currentBlock.block.extrinsics.', currentBlock.block.extrinsics.length);
  const transactions = [];
  const fees = [];

  // map between the extrinsics and events
  const extrinsicCount = currentBlock.block.extrinsics.length;
  const extrinsics = currentBlock.block.extrinsics;
  extrinsics.forEach((extrinsic, index) => {
    const { method: { method, section, args }, signer, hash } = extrinsic;
    const extrinsicAction = `${section}.${method}`.toLowerCase();
    if (extrinsicAction === 'timestamp.set') {
      return;
    }

    const paymentInfo = paymentInfos[index];
    const extrinsicMethod = `${section}.${method}`.toLowerCase();
    const operationType = extrinsicOpMap[extrinsicMethod];
    const transactionIdentifier = new Types.TransactionIdentifier(hash.toHex().substr(2));
    const operations = [];

    let paysFee = false;
    if (operationType && (!shouldDisplay || shouldDisplay(section, method, hash))) {
      const sourceAccountAddress = signer.toString();

      // Get extrinsic status/fee info
      let extrinsicStatus = OPERATION_STATUS_UNKNOWN;
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
            const eventData = (event.toHuman()).data;
            eventData.forEach(data => {
              if (data && data.paysFee === 'Yes') {
                paysFee = true;
              }
            });
          }
        });

      if (extrinsicStatus === OPERATION_STATUS_SUCCESS) {
        // Parse events
        allRecords
          .filter(({ phase }) => phase.isApplyExtrinsic && phase.asApplyExtrinsic.eq(index))
          .forEach((record, index) => processRecordToOp(api, record, operations, args, extrinsicStatus, allRecords));
      } else { // When an extrinsic fails we cant rely on the events to parse its operations
        const destAccountAddress = getEffectedAccountFromExtrinsic(api, extrinsic, extrinsicMethod);
        const balanceAmount = getOperationAmountFromExtrinsic(api, extrinsic, extrinsicMethod);
        const sourceAccountAddress = getSourceAccountFromExtrinsic(extrinsic);
        if (balanceAmount) {
          addToOperations(operations, operationType, extrinsicStatus, destAccountAddress, balanceAmount, sourceAccountAddress);
        }
      }
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


function getTransactionsFromEvents(allRecords, api) {
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
  // console.log('blockRequest', blockRequest)
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
    // TODO: testnet seems to be unable to query payment info for older blocks, causing a bad error!
    paymentInfoPromises.push(api.rpc.payment.queryInfo(extrinsic.toHex(), blockHash));
  }

  const paymentInfos = await Promise.all(paymentInfoPromises);
  const allRecords = await api.query.system.events.at(blockHash);
  const { transactions, fees } = getTransactions(currentBlock, allRecords, api, (section, method) => {
    return true;
    // return section === 'balances';
  }, blockHash, paymentInfos);

  // Get system events as this can also contain balance changing info (poa, reserved etc)
  // HACK: setting txHash to blockHash for system events, since they arent related to extrinsic hashes
  const systemTransactions = getTransactionsFromEvents(allRecords.filter(({ phase }) => !phase.isApplyExtrinsic), api);

  // Add fees to system transactions
  if (systemTransactions.length) {
    const operations = systemTransactions[0].operations;
    operations.push(...fees.map((fee, feeIndex) => {
      return Types.Operation.constructFromObject({
        'operation_identifier': new Types.OperationIdentifier(operations.length + feeIndex),
        'type': 'Fee',
        'status': OPERATION_STATUS_SUCCESS,
        ...fee,
      });
    }));

    transactions.push(...systemTransactions);
  }

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
  );

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
  // console.log('blockTransactionRequest', params)
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
