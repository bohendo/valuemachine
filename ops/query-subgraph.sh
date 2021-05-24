#!/bin/bash

subgraphV1="https://api.thegraph.com/subgraphs/name/graphprotocol/uniswap"
subgraphV2="https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v2"

v2ExchangesByVolume=$(echo '{"query": "{
  pairs (
    first: 100
    orderBy: volumeUSD
    orderDirection: desc
  ) {
    id
    token0 {
      id
      name
      symbol
    }
    token1 {
      id
      name
      symbol
    }
  }
}"}' | tr -d '\n\r')

# Get name & address of top 100 highest volume uniswap v1 markets
curl -qs -X POST --data "$v2ExchangesByVolume" "$subgraphV2" |\
  jq '.data.pairs
  | map(.address = .id)
  | map(del(.id))
  | map(.token0 = .token0.symbol)
  | map(.token1 = .token1.symbol)
  | map(.name = "UniV2-" + .token0 + "-" + .token1)
  | map(del(.token0))
  | map(del(.token1))
'

exit

v1ExchangesByVolume=$(echo '{"query": "{
  exchanges(orderBy: tradeVolumeEth, orderDirection: desc) {
    id
    tokenSymbol
    tokenName
  }
}"}' | tr -d '\n\r')

# Get name & address of top 100 highest volume uniswap v1 markets
curl -qs -X POST --data "$v1ExchangesByVolume" "$subgraphV1" |\
  jq '.data.exchanges
  | map(.address = .id)
  | map(.name = "UniV1-" + .tokenSymbol)
  | map(del(.tokenSymbol))
  | map(del(.id))
'
