import { isAddress as isEthAddress } from "@ethersproject/address";
import express from "express";
import {
  getAddressBook,
  getAddressBookError,
  getPolygonData,
  getLogger,
  Guards,
} from "valuemachine";

import { env } from "./env";
import { getPollerHandler } from "./poller";
import { getLogAndSend, store, STATUS_YOUR_BAD } from "./utils";

const log = getLogger(env.logLevel).child({ name: `${Guards.Polygon}Transactions` });

const polygonData = getPolygonData({
  covalentKey: env.covalentKey,
  json: store.load("PolygonData"),
  logger: log,
  polygonscanKey: env.polygonscanKey,
  save: val => store.save("PolygonData", val),
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
