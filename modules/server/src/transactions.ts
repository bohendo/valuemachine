import { getAddressBook, getTransactions } from "@finances/core";
import { getLogger } from "@finances/utils";
import express from "express";

import { chainData } from "./chaindata";
import { env } from "./env";
import { getStore } from "./store";
import { getLogAndSend, STATUS_YOUR_BAD } from "./utils";

const log = getLogger(env.logLevel).child({ module: "Transactions" });

export const transactionsRouter = express.Router();

transactionsRouter.post("/", async (req, res) => {
  const logAndSend = getLogAndSend(res);
  const username = req.username;
  const addressBookJson = req.body.addressBook;
  if (!addressBookJson || !addressBookJson.length) {
    return logAndSend(`A valid address book must be provided via POST body`, STATUS_YOUR_BAD);
  }
  const addressBook = getAddressBook(addressBookJson, log);
  const selfAddresses = addressBook.addresses.filter(a => addressBook.isSelf(a));
  log.info(`Found ${selfAddresses.length} self addreses for user ${username}`);
  const userStore = getStore(username);
  const transactions = getTransactions({ addressBook, logger: log, store: userStore });
  await transactions.mergeChainData(
    chainData.getAddressHistory(...selfAddresses),
  );
  log.info(`Returning ${transactions.getAll().length} transactions`);
  res.json(transactions.getAll());
});

