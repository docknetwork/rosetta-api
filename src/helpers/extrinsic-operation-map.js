// TODO: handle all balance changes
// TODO: also handle sudo changes, such as balances.BalanceSet
// TODO: see https://polkadot.js.org/docs/substrate/events/#balances for balance related op types
export default {
  'balances.reserved': 'Reserved',
  // 'balances.endowed': 'Endowed',
  'balances.transfer': 'Transfer',
  'balances.transferkeepalive': 'Transfer',
  'system.newaccount': 'Create',
  'poamodule.txnfeesgiven': 'Fee',
  'poamodule.epochends': 'EpochEnds',
};
