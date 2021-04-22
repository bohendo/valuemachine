import { AddressZero, HashZero } from "@ethersproject/constants";
import { ChainData, EthCalls, EthTransaction } from "@finances/types";
import { getLogger } from "@finances/utils";

import { getAddressBook } from "../addressBook";
import { getChainData } from "../chainData";

export const testLogger = getLogger("silent").child({ module: "TestUtils" });

export const AddressOne = "0x0000000000000000000000000000000000000001";
export const AddressTwo = "0x0000000000000000000000000000000000000002";

export const testAddressBook = getAddressBook(
  [
    { name: "test", category: "self", address: AddressZero },
    { name: "test", category: "self", address: AddressOne },
  ],
  testLogger,
);

export const getTestChainData = (
  transactions?: EthTransaction = [],
  calls?: EthCalls = [],
): ChainData => getChainData({
  logger: testLogger,
  chainDataJson: {
    addresses: {
      [AddressOne]: {
        history: [HashZero],
        lastUpdated: new Date(0).toISOString(),
      }
    },
    calls,
    tokens: {},
    transactions,
  },
});
