import { AddressZero, HashZero } from "@ethersproject/constants";
import { ChainData, EthTransaction } from "@finances/types";
import { getLogger } from "@finances/utils";

import { getChainData } from "../chainData";

export const testLogger = getLogger("silent").child({ module: "TestUtils" });

export const getFakeChainData = (tx: EthTransaction): ChainData => getChainData({
  logger: testLogger,
  chainDataJson: {
    addresses: {
      [AddressZero]: {
        history: [HashZero],
        lastUpdated: new Date(0).toISOString(),
      }
    },
    calls: [],
    tokens: {},
    transactions: [
      {
        block: 10,
        data: "0x",
        from: AddressZero,
        gasLimit: "0x100000",
        gasPrice: "0x100000",
        gasUsed: "0x1000",
        hash: HashZero,
        index: 1,
        logs: [],
        nonce: 0,
        status: 1,
        timestamp: "2000-01-01T00:00:00.000Z",
        to: AddressZero,
        value: "0.0",
        ...tx,
      },
    ],
  },
});
