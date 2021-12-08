import {
  Account,
  AddressBook,
  getLogger,
  Guard,
  TransactionsJson,
} from "valuemachine";

import { env } from "./env";
import { getLogAndSend, STATUS_MY_BAD } from "./utils";


export const getPollerHandler = (
  syncData: (addressBook: AddressBook) => Promise<void>,
  getData: (addressBook: AddressBook) => TransactionsJson,
  dataType: Guard,
) => {
  const log = getLogger("debug" || env.logLevel).child({ module: `${dataType}Poller` });
  let syncing = [];
  return async (
    addressBook: AddressBook,
    addresses: Account[],
    res: any,
  ): Promise<void> => {
    const logAndSend = getLogAndSend(res);
    const label = `${dataType} history`;
    if (!addresses?.length) {
      return logAndSend([]);
    }
    if (addresses.every(address => syncing.includes(address))) {
      return logAndSend(`${label} for ${addresses.length} addresses is already syncing.`);
    }
    addresses.forEach(address => syncing.push(address));

    const sync = new Promise(res => syncData(addressBook).then(() => {
      log.warn(`Successfully synced ${label} for ${addresses.length} addresses`);
      syncing = syncing.filter(address => !addresses.includes(address));
      res(true);
    }).catch((e) => {
      log.warn(`Failed to sync ${label} for ${addresses.length} addresses: ${e.stack}`);
      syncing = syncing.filter(address => !addresses.includes(address));
      res(false);
    }));

    Promise.race([
      sync,
      new Promise((res, rej) => setTimeout(() => rej("TimeOut"), 10000)),
    ]).then(
      (didSync: boolean) => {
        if (didSync) {
          try {
            const start = Date.now();
            const transactionsJson = getData(addressBook);
            res.json(transactionsJson);
            log.info(`Returned ${transactionsJson.length} ${dataType} transactions at a rate of ${
              Math.round((100000 * transactionsJson.length)/(Date.now() - start)) / 100
            } tx/sec`);
          } catch (e) {
            log.warn(e);
            logAndSend(`Error syncing ${dataType} transactions`, STATUS_MY_BAD);
          }
          return;
        } else {
          return logAndSend(
            `${label} for ${addresses.length} addresses failed to sync`,
            STATUS_MY_BAD
          );
        }
      },
      (error: any) => {
        if (error === "TimeOut") {
          return logAndSend(
            `${label} for ${addresses.length} addresses has started syncing, please wait`
          );
        } else {
          return logAndSend(
            `${label} for ${addresses.length} addresses failed to sync ${error}`,
            STATUS_MY_BAD
          );
        }
      },

    ).catch((e) => {
      log.warn(`Encountered an error while syncing ${label} for ${addresses}: ${e.message}`);
      syncing = syncing.filter(address => addresses.includes(address));
    });
    log.info(`Synced ${label} for ${addresses.length} addresses successfully? ${await sync}`);
    return;
  };
};
