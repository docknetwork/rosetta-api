## TODO: write this properly

## Dev

`yarn dev` or `nodemon`

## Start

`yarn start`


## Run inspector
```sh
docker pull figmentnetworks/rosetta-inspector
docker run --network="host" -p 5555:5555 figmentnetworks/rosetta-inspector -url=http://localhost:8080
```

## Rosetta config notes

exempt accounts should have alice and treasury for dev? but then for live there are issues, need to track proper epoch rewards 
