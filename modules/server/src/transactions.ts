import { isAddress as isEthAddress } from "@ethersproject/address";
import { getAddressBook } from "@valuemachine/transactions";
import { getLogger } from "@valuemachine/utils";
import express from "express";

import { env } from "./env";
import { chainData, getLogAndSend, STATUS_YOUR_BAD, STATUS_MY_BAD } from "./utils";

const log = getLogger(env.logLevel).child({ module: "Transactions" });

export const transactionsRouter = express.Router();

let queue = [];
transactionsRouter.post("/eth", async (req, res) => {
  const logAndSend = getLogAndSend(res);
  const addressBookJson = req.body.addressBook;
  if (!addressBookJson || !addressBookJson.length) { // TODO use getAddressBookErrors util
    return logAndSend(`A valid address book must be provided via POST body`, STATUS_YOUR_BAD);
  }
  const addressBook = getAddressBook({ json: addressBookJson, logger: log });
  const selfAddresses = addressBook.json
    .map(entry => entry.address)
    .filter(address => isEthAddress(address))
    .filter(address => addressBook.isSelf(address));
  if (selfAddresses.every(address => queue.includes(address))) {
    return logAndSend(`Eth data for ${selfAddresses.length} addresses is already syncing.`);
  }
  selfAddresses.forEach(address => queue.push(address));
  Promise.race([
    new Promise((res, rej) => setTimeout(() => rej("TimeOut"), 10000)),
    new Promise((res, rej) => chainData.syncAddressBook(addressBook).then(() => {
      queue = queue.filter(address => !selfAddresses.includes(address));
      res(true);
    }).catch((e) => {
      log.warn(`Failed to sync history for ${selfAddresses.length} addresses: ${e.message}`);
      queue = queue.filter(address => !selfAddresses.includes(address));
      rej(e);
    })),
  ]).then(
    (didSync: boolean) => {
      if (didSync) {
        log.info(`Ethereum data is synced, returning eth transactions`);
        try {
          const start = Date.now();
          const transactionsJson = chainData.getTransactions(addressBook);
          res.json(transactionsJson);
          log.info(`Returned ${transactionsJson.length} transactions at a rate of ${
            Math.round((100000 * transactionsJson.length)/(Date.now() - start)) / 100
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
        return logAndSend(
          `Ethereum data for ${selfAddresses.length} addresses has started syncing, please wait`
        );
      } else {
        return logAndSend(
          `Ethereum data for ${selfAddresses.length} addresses failed to sync ${error}`,
          STATUS_MY_BAD
        );
      }
    },
  ).catch((e) => {
    log.warn(`Encountered an error while syncing history for ${selfAddresses}: ${e.message}`);
    queue = queue.filter(address => selfAddresses.includes(address));
  });
});
