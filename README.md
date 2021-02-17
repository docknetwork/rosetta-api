## TODO: write this properly

## Dev

`yarn dev` or `nodemon`

## Start

`yarn start`


## Run inspector
```sh
docker pull figmentnetworks/rosetta-inspector
docker run --network="host" -p 5555:5555 figmentnetworks/rosetta-inspector -url=http://34.211.186.185:8080
```

## Rosetta config notes

exempt accounts should have alice and treasury for dev? but then for live there are issues, need to track proper epoch rewards

## Docker

Build: `docker build -t docknetwork/rosetta-api .`
Run: `docker run -d -p 8080:8080 --network="host" docknetwork/rosetta-api`
