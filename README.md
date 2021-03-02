## Substrate/PolkadotJS Rosetta API
This is Dock's implementation of the [Rosetta API](https://github.com/coinbase/rosetta-specifications) for our Subsrate blockchain, written in NodeJS using PolkadotJS. Currently in development but mostly done. Any suggestions or improvements are welcome. This isn't considered production ready yet but you can go ahead and try it.

## Prerequisites
Install Yarn or NPM, run the usual `yarn install` or `npm install`. Note the configuration files in the `networks` directory. To add a custom network, copy one of the files and change the parameters. You will need to also export your chain metadata and ensure its defined in the network configuration.

Network configuration files are automatically loaded when the API initializes.

## Development
Run `yarn dev` to run a development instance of the API. Default port is 8080. Check the rosetta-cli configuration files in `/rosetta-cli`. Rosetta CLI usage is [better documented here](https://github.com/coinbase/rosetta-cli), but the main files to check are:
- rosetta-cli/devnode/config.json (connects to local substrate node)
- rosetta-cli/mainnet/config.json (connects to local mainnet node)
- rosetta-cli/testnet/config.json (connects to dock testnet directly)

## Starting
- Online mode: `yarn start`
- Offline mode: `yarn start-offline`

## Starting with Docker
- Run: `docker run -d --network="host" docknetwork/rosetta-api`
- Build: `docker build -t docknetwork/rosetta-api .`

## Inspecting/Debugging
We use Rosetta Inspector to check that the API is running properly, you can do that like so using Docker:
```sh
docker pull figmentnetworks/rosetta-inspector
docker run --network="host" -p 5555:5555 figmentnetworks/rosetta-inspector -url=http://localhost:8080
```

## Potential improvements
- Memory caching solution for block/transaction info
- Write tests
