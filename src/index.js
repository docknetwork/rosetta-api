import RosettaSDK from 'rosetta-node-sdk';
import ServiceHandlers from './services';

/* Create a server configuration */
const Server = new RosettaSDK.Server({
  URL_PORT: 8080,
});

/* Data API: Network specific procedure call */
Server.register('/call', ServiceHandlers.Call.call);

/* Data API: Network */
Server.register('/network/list', ServiceHandlers.Network.networkList);
Server.register('/network/options', ServiceHandlers.Network.networkOptions);
Server.register('/network/status', ServiceHandlers.Network.networkStatus);

/* Data API: Block */
Server.register('/block', ServiceHandlers.Block.block);
Server.register('/block/transaction', ServiceHandlers.Block.blockTransaction);

/* Data API: Account */
Server.register('/account/balance', ServiceHandlers.Account.balance);
Server.register('/account/coins', ServiceHandlers.Dummy.dummy);

/* Data API: Mempool */
Server.register('/mempool', ServiceHandlers.Mempool.mempool);
Server.register('/mempool/transaction', ServiceHandlers.Mempool.mempoolTransaction);

/* Construction API */
Server.register(
  '/construction/metadata',
  ServiceHandlers.Construction.constructionMetadata,
);
Server.register(
  '/construction/submit',
  ServiceHandlers.Construction.constructionSubmit,
);
Server.register(
  '/construction/combine',
  ServiceHandlers.Construction.constructionCombine,
);
Server.register(
  '/construction/derive',
  ServiceHandlers.Construction.constructionDerive,
);
Server.register(
  '/construction/hash',
  ServiceHandlers.Construction.constructionHash,
);
Server.register(
  '/construction/parse',
  ServiceHandlers.Construction.constructionParse,
);
Server.register(
  '/construction/payloads',
  ServiceHandlers.Construction.constructionPayloads,
);
Server.register(
  '/construction/preprocess',
  ServiceHandlers.Construction.constructionPreprocess,
);

/* Enforce JSON content type */
Server.expressServer.app.use((req, res, next) => {
  res.setHeader('Content-Type', 'application/json');
  next();
});

async function main() {
  await Server.launch();
}

main();
