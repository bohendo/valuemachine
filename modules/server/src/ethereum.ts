import { isAddress as isEthAddress } from "@ethersproject/address";
import { getAddressBook, getEthereumData } from "@valuemachine/transactions";
import { AddressBook, Guards } from "@valuemachine/types";
import { getAddressBookError, getLogger } from "@valuemachine/utils";
import express from "express";

import { env } from "./env";
import { getPollerHandler } from "./poller";
import { getLogAndSend, store, STATUS_YOUR_BAD } from "./utils";

const log = getLogger(env.logLevel).child({ module: "Transactions" });

const chainData = getEthereumData({
  etherscanKey: env.etherscanKey,
  covalentKey: env.covalentKey,
  logger: log,
  store,
});
const handlePoller = getPollerHandler(
  chainData.syncAddressBook,
  (addressBook: AddressBook) => chainData.getTransactions(addressBook),
  Guards.Ethereum,
);

export const ethereumRouter = express.Router();

ethereumRouter.post("/", async (req, res) => {
  const logAndSend = getLogAndSend(res);
  const addressBookJson = req.body.addressBook;
  const addressBookError = getAddressBookError(addressBookJson);
  if (addressBookError) {
    return logAndSend("Invalid AddressBook" + addressBookError, STATUS_YOUR_BAD);
  }
  const addressBook = getAddressBook({
    json: addressBookJson,
    logger: log,
  });
  await handlePoller(
    addressBook,
    addressBook.json.map(entry => entry.address).filter(addressBook.isSelf).filter(isEthAddress),
    res,
  );
});