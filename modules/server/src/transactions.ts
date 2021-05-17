import { getAddressBook, getTransactions } from "@finances/core";
import { getLogger } from "@finances/utils";
import express from "express";

import { chainData } from "./chaindata";
import { env } from "./env";
import { getLogAndSend, STATUS_YOUR_BAD, STATUS_MY_BAD } from "./utils";

const log = getLogger(env.logLevel).child({ module: "Transactions" });

export const transactionsRouter = express.Router();

transactionsRouter.post("/", async (req, res) => {
  const logAndSend = getLogAndSend(res);
  const start = Date.now();
  const addressBookJson = req.body.addressBook;
  if (!addressBookJson || !addressBookJson.length) {
    return logAndSend(`A valid address book must be provided via POST body`, STATUS_YOUR_BAD);
  }
  const addressBook = getAddressBook(addressBookJson, log);
  const selfAddresses = addressBook.addresses.filter(a => addressBook.isSelf(a));
  log.info(`Syncing txns for ${selfAddresses.length} self addreses`);
  try {
    const transactions = getTransactions({ addressBook, logger: log });
    await transactions.mergeChainData(
      chainData.getAddressHistory(...selfAddresses),
    );
    res.json(transactions.json);
    log.info(`Returned ${transactions.json.length} transactions at a rate of ${
      Math.round(100 * (Date.now() - start)/transactions.json.length) / 100
    } ms/tx`);
  } catch (e) {
    log.warn(e);
    logAndSend("Error syncing transactions", STATUS_MY_BAD);
  }
});
