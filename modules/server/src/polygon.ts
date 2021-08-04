import { isAddress as isEthAddress } from "@ethersproject/address";
import { getAddressBook, getPolygonData } from "@valuemachine/transactions";
import { Guards } from "@valuemachine/types";
import { getLogger, getAddressBookError } from "@valuemachine/utils";
import express from "express";

import { env } from "./env";
import { getPollerHandler } from "./poller";
import { getLogAndSend, store, STATUS_YOUR_BAD } from "./utils";

const log = getLogger(env.logLevel).child({ module: `${Guards.Polygon}Transactions` });

const polygonData = getPolygonData({
  etherscanKey: env.etherscanKey,
  covalentKey: env.covalentKey,
  logger: log,
  store,
});
const handlePoller = getPollerHandler(
  polygonData.syncAddressBook,
  polygonData.getTransactions,
  Guards.Polygon,
);

export const polygonRouter = express.Router();

polygonRouter.post("/", async (req, res) => {
  const logAndSend = getLogAndSend(res);
  const addressBookJson = req.body.addressBook;
  const addressBookError = getAddressBookError(addressBookJson);
  if (addressBookError) {
    return logAndSend(`[Poly] Invalid AddressBook: ${addressBookError}`, STATUS_YOUR_BAD);
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
