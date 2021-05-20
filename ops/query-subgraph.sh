#!/bin/bash

subgraphV1="https://api.thegraph.com/subgraphs/name/graphprotocol/uniswap"

exchangesByVolume=$(echo '{"query": "{
  exchanges(orderBy: tradeVolumeEth, orderDirection: desc) {
    id
    tokenSymbol
    tokenName
  }
}"}' | tr -d '\n\r')

# Get name & address of top 100 highest volume uniswap v1 markets
curl -qs -X POST --data "$exchangesByVolume" "$subgraphV1" |\
  jq '.data.exchanges
  | map(.address = .id)
  | map(.name = "UniV1-" + .tokenSymbol)
  | map(del(.tokenSymbol))
  | map(del(.id))
'
