import { Checkpoint, Event, State } from "./types";
import { eq } from "./utils";

let checkpoints = [
  {
    account: "0xada083a3c06ee526f827b43695f2dcff5c8c892b",
    assetType: "ETH",
    balance: "0",
    date: "2017-11-21T07:54:38.000Z",
  },
  {
    account: "0xada083a3c06ee526f827b43695f2dcff5c8c892b",
    assetType: "ETH",
    balance: "6",
    date: "2017-12-05T23:14:55.000Z",
  },
  {
    account: "0x09eB5799Ff31D198EBe1E0124F981cbB688149d9",
    assetType: "ETH",
    balance: "1",
    date: "2017-09-13T21:40:29.000Z",
  },
  {
    account: "0x09eB5799Ff31D198EBe1E0124F981cbB688149d9",
    assetType: "ETH",
    balance: "1.23269054",
    hash: "0x41a3720d7b1401ebc68e53fdd829cdb30df26cc8eb8b01e35d8cf9d36468aa6e",
  },
  /*
  {
    account: "0xada083a3c06ee526f827b43695f2dcff5c8c892b",
    assetType: "ETH",
    balance: "5.9820480179",
    date: "2017-12-11T20:28:52.000Z",
  },
  {
    account: "0xada083a3c06ee526f827b43695f2dcff5c8c892b",
    assetType: "ETH",
    balance: "1.472343111572222222",
    date: "2017-12-30T15:14:53.000Z",
  },
  {
    account: "0xada083a3c06ee526f827b43695f2dcff5c8c892b",
    assetType: "ETH",
    balance: "1.102702839572222222",
    date: "2018-02-16T04:08:45.000Z",
  },
  */
].map(
  (ckpt) => ({ ...ckpt, account: ckpt.account.toLowerCase() }),
).sort(
  (c1, c2) => new Date(c1.date).getTime() - new Date(c2.date).getTime(),
) as Checkpoint[];

export const assertState = (state: State, event: Event): void => {
  for (const { account, assetType, balance, date, hash } of checkpoints) {
    if (date === event.date || (hash && event.hash && hash === event.hash)) {
      const actual = state.getBalance(account, assetType);
      if (!eq(actual, balance)) {
        throw new Error(`Expected accout ${account} to have ${assetType} balance of ${balance} on ${event.date} but got ${actual}`);
      }
      checkpoints = checkpoints.filter(ckpt => ckpt.date !== event.date);
      console.log(`Checkpoint passed for ${account} on ${event.date}, ${checkpoints.length} remaining`);
    }
  }
};
