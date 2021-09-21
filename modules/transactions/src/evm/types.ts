import {
  Bytes32,
  EvmAddress,
  EvmTransaction,
} from "@valuemachine/types";

export type EvmFetcher = {
  fetchHistory: (address: EvmAddress) => Promise<Bytes32[]>;
  fetchTransaction: (txHash: Bytes32) => Promise<EvmTransaction>;
};
