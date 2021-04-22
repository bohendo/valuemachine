import { HashZero } from "@ethersproject/constants";
import { AddressCategories, ChainData, EthCall, EthTransaction } from "@finances/types";
import { getLogger } from "@finances/utils";

import { getAddressBook } from "../addressBook";
import { getChainData } from "../chainData";

export const testLogger = getLogger("silent").child({ module: "TestUtils" });

export const AddressOne = "0x0000000000000000000000000000000000000001";
export const AddressTwo = "0x0000000000000000000000000000000000000002";

export const testAddressBook = getAddressBook(
  [
    { name: "test-self-1", category: AddressCategories.Self, address: AddressOne },
    { name: "test-self-2", category: AddressCategories.Self, address: AddressTwo },
  ],
  testLogger,
);

export const getTestChainData = (
  transactions = [] as EthTransaction[],
  calls = [] as EthCall[],
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
