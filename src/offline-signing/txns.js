import { EXTRINSIC_VERSION } from '@polkadot/types/extrinsic/v4/Extrinsic';
import { createSignedTx, createSigningPayload, methods } from '@substrate/txwrapper';

/**
 * Build a transfer txn
 * @param {Object} params - An object containing the parameters.
 * @param params.from
 * @param params.to
 * @param params.value
 * @param params.tip
 * @param params.nonce
 * @param params.eraPeriod
 * @param params.blockNumber
 * @param params.blockHash
 * @param params.registry - This is an instance of `Registry` class
 * @returns {{unsignedTxn: Object, signingPayload: string}}
 */
export function buildTransferTxn({
  from, to, value, tip, nonce, eraPeriod, blockNumber, blockHash, registry,
}) {
  console.log('methods.balances.transfer', methods.balances.transfer)
  const unsignedTxn = methods.balances.transfer({
    value,
    dest: to,
  }, {
    address: from,
    blockHash,
    blockNumber,
    eraPeriod,
    genesisHash: registry.chainInfo.genesis,
    metadataRpc: registry.metadata,
    nonce,
    specVersion: registry.chainInfo.specVersion,
    tip,
    transactionVersion: registry.chainInfo.transactionVersion,
  }, {
    metadataRpc: registry.metadata,
    registry: registry.registry,
  });
  const signingPayload = createSigningPayload(unsignedTxn, { registry: registry.registry });
  return {
    unsignedTxn, signingPayload,
  };
}
