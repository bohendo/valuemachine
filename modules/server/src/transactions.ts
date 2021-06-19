import { isAddress as isEthAddress } from "@ethersproject/address";
import { getAddressBook, getTransactions } from "@valuemachine/transactions";
import { getLogger } from "@valuemachine/utils";
import express from "express";

import { env } from "./env";
import { getLogAndSend, STATUS_YOUR_BAD, STATUS_MY_BAD, store } from "./utils";

const log = getLogger(env.logLevel).child({ module: "Transactions" });

export const transactionsRouter = express.Router();

let queue = [];
transactionsRouter.post("/eth", async (req, res) => {
  const logAndSend = getLogAndSend(res);
  const start = Date.now();
  const addressBookJson = req.body.addressBook;
  if (!addressBookJson || !addressBookJson.length) { // TODO use getAddressBookErrors util
    return logAndSend(`A valid address book must be provided via POST body`, STATUS_YOUR_BAD);
  }
  const addressBook = getAddressBook({ json: addressBookJson, logger: log });
  const selfAddresses = addressBook.json
    .filter(entry => isEthAddress(entry.address))
    .filter(entry => addressBook.isSelf(entry.address));
  if (selfAddresses.every(address => queue.includes(address))) {
    return logAndSend(`Eth data for ${selfAddresses.length} addresses is already syncing.`);
  }
  selfAddresses.forEach(address => queue.push(address));
  const transactions = getTransactions({ addressBook, logger: log, store });
  Promise.race([
    new Promise((res, rej) => setTimeout(() => rej("TimeOut"), 10000)),
    new Promise((res, rej) => transactions.syncEthereum(env.etherscanKey)
      .then(() => {
        queue = queue.filter(address => selfAddresses.includes(address));
        res(true);
      }).catch((e) => {
        log.warn(`Failed to sync history for ${selfAddresses}: ${e.stack}`);
        queue = queue.filter(address => selfAddresses.includes(address));
        rej(e);
      }),
    ),
  ]).then(
    (didSync: boolean) => {
      if (didSync) {
        log.info(`Chain data is synced, returning eth transactions`);
        try {
          transactions.mergeEthereum();
          res.json(transactions.json);
          log.info(`Returned ${transactions.json.length} transactions at a rate of ${
            Math.round((100000 * transactions.json.length)/(Date.now() - start)) / 100
          } tx/sec`);
        } catch (e) {
          log.warn(e);
          logAndSend("Error syncing transactions", STATUS_MY_BAD);
        }
        return;
      }
    },
    (error: any) => {
      if (error === "TimeOut") {
        return logAndSend(`Chain data for ${selfAddresses} has started syncing, please wait`);
      } else {
        return logAndSend(`Chain data for ${selfAddresses} failed to sync ${error}`, STATUS_MY_BAD);
      }
    },
  ).catch((e) => {
    log.warn(`Encountered an error while syncing history for ${selfAddresses}: ${e.message}`);
    queue = queue.filter(address => selfAddresses.includes(address));
  });
});
