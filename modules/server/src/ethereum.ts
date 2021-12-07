import { isAddress as isEthAddress } from "@ethersproject/address";
import express from "express";
import {
  getAddressBook,
  getAddressBookError,
  getEthereumData,
  getLogger,
  Guards,
} from "valuemachine";

import { env } from "./env";
import { getPollerHandler } from "./poller";
import { getLogAndSend, store, STATUS_YOUR_BAD } from "./utils";

const log = getLogger(env.logLevel).child({ module: `${Guards.Ethereum}Transactions` });

const ethereumData = getEthereumData({
  alchemyProvider: env.alchemyProvider,
  etherscanKey: env.etherscanKey,
  logger: log,
  store,
});
const handlePoller = getPollerHandler(
  ethereumData.syncAddressBook,
  ethereumData.getTransactions,
  Guards.Ethereum,
);

export const ethereumRouter = express.Router();

ethereumRouter.post("/", async (req, res) => {
  const logAndSend = getLogAndSend(res);
  const addressBookJson = req.body.addressBook;
  const addressBookError = getAddressBookError(addressBookJson);
  if (addressBookError) {
    return logAndSend(`Invalid AddressBook: ${addressBookError}`, STATUS_YOUR_BAD);
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
