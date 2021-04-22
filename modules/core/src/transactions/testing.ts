import { AddressZero, HashZero } from "@ethersproject/constants";
import { ChainData, EthTransaction } from "@finances/types";
import { getLogger } from "@finances/utils";

import { getChainData } from "../chainData";

const log = getLogger("info").child({ module: "TestUtils" });

export const exampleCoinbaseCsv =
`Timestamp,           Transaction Type,Asset,Quantity Transacted,USD Spot Price at Transaction,USD Subtotal,USD Total (inclusive of fees),USD Fees,Notes
2017-05-03T01:00:00Z, Buy,             BTC,  0.1,                1500.00,                      150.00,      165.00,                       15.00,   Bought 0.0300 BTC for $165.00 USD
2017-12-12T01:00:00Z, Receive,         ETH,  1.0,                650.00,                       "",          "",                           "",      Received 1.0000 ETH from an external account
2017-12-13T01:00:00Z, Sell,            ETH,  1.0,                600.00,                       600.00,      590.00,                       10.00,   Sold 1.0000 ETH for $590.00 USD
`.replace(/, +/g, ",");

export const getFakeChainData = (tx: EthTransaction): ChainData => getChainData({
  logger: log,
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
