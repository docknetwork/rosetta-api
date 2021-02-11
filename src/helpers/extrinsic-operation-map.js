/*
  NOTE:
    This mapping is potentially incomplete. Not all chains will implement all balance changing events (bounties, poa),
    more should be added as they are found in Dock's case. Hopefully this can be expanded upon by others too.
    See https://polkadot.js.org/docs/substrate/events/#balances for reference on events
*/
export default {
  // 'balances.endowed': 'Endowed', // is this needed? endowed seems to appear along with transfer event, logging this gives double the balance
  'balances.reserved': 'Reserved',
  'balances.unreserved': 'Unreserved',
  'balances.deposit': 'Deposit',
  'balances.dustlost': 'DustLost',
  'balances.balanceset': 'BalanceSet',
  'balances.transfer': 'Transfer',
  'balances.transferkeepalive': 'Transfer',
  'system.newaccount': 'Create',
  'poamodule.txnfeesgiven': 'Fee',
  'poamodule.epochends': 'EpochEnds',
};
