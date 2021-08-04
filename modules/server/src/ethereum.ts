import { isAddress as isEthAddress } from "@ethersproject/address";
import { getAddressBook, getEthereumData } from "@valuemachine/transactions";
import { AddressBook, Guards } from "@valuemachine/types";
import { getAddressBookError, getLogger } from "@valuemachine/utils";
import express from "express";

import { env } from "./env";
import { getPollerHandler } from "./poller";
import { getLogAndSend, store, STATUS_YOUR_BAD } from "./utils";

const log = getLogger(env.logLevel).child({ module: `${Guards.Ethereum}Transactions` });

const ethereumData = getEthereumData({
  etherscanKey: env.etherscanKey,
  covalentKey: env.covalentKey,
  logger: log,
  store,
});
const handlePoller = getPollerHandler(
  ethereumData.syncAddressBook,
  (addressBook: AddressBook) => ethereumData.getTransactions(addressBook),
  Guards.Ethereum,
);

export const ethereumRouter = express.Router();

ethereumRouter.post("/", async (req, res) => {
  const logAndSend = getLogAndSend(res);
  const addressBookJson = req.body.addressBook;
  log.info(addressBookJson, "Got address book");
  const addressBookError = getAddressBookError(addressBookJson);
  if (addressBookError) {
    return logAndSend(`[Eth] Invalid AddressBook: ${addressBookError}`, STATUS_YOUR_BAD);
  }
  const addressBook = getAddressBook({
    json: addressBookJson,
    logger: log,
  });
  await handlePoller(
    addressBook,
    addressBook.addresses.filter(addressBook.isSelf).filter(isEthAddress),
    res,
  );
});
