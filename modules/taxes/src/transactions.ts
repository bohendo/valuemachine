import {
  getPrices,
  mergeCoinbaseTransactions,
  mergeDefaultTransactions,
  mergeDigitalOceanTransactions,
  mergeEthTransactions,
  mergeWyreTransactions,
  mergeWazrixTransactions,
} from "@finances/core";
import {
  AddressBook,
  AssetTypes,
  ChainData,
  Logger,
  Store,
  StoreKeys,
  Transaction,
} from "@finances/types";
import * as fs from "fs";

export const getTransactions = async (
  addressBook: AddressBook,
  chainData: ChainData,
  store: Store,
  extraTransactions: Array<Transaction | string>,
  logger: Logger = console,
): Promise<Transaction[]> => {
  const log = logger.child({ module: "GetTransactions" });

  let transactions = store.load(StoreKeys.Transactions);
  const lastUpdated = transactions.length !== 0
    ? new Date(transactions[transactions.length - 1].date).getTime()
    : 0;

  log.info(`Loaded ${transactions.length} transactions from store, most recent was on: ${
    lastUpdated ? new Date(lastUpdated).toISOString() : "never"
  }`);

  const start = new Date().getTime();

  const selfAddresses = addressBook.addresses.filter(addressBook.isSelf);

  const allHistory = chainData.getAddressHistory(...selfAddresses);

  transactions = mergeEthTransactions(
    transactions,
    addressBook,
    allHistory,
    lastUpdated,
    logger,
  );

  log.info(`Processed ${allHistory.json.transactions.length} txs & ${
    allHistory.json.calls.length
  } calls for ${selfAddresses.length} addresses in ${new Date().getTime() - start} ms`);

  for (const source of extraTransactions || []) {
    if (typeof source === "string" && source.endsWith(".csv")) {
      if (source.toLowerCase().includes("coinbase")) {
        transactions = mergeCoinbaseTransactions(
          transactions,
          fs.readFileSync(source, "utf8"),
          lastUpdated,
          logger,
        );
      } else if (source.toLowerCase().includes("digital-ocean")) {
        transactions = mergeDigitalOceanTransactions(
          transactions,
          fs.readFileSync(source, "utf8"),
          lastUpdated,
          logger,
        );
      } else if (source.toLowerCase().includes("wyre")) {
        transactions = mergeWyreTransactions(
          transactions,
          fs.readFileSync(source, "utf8"),
          lastUpdated,
          logger,
        );
      } else if (source.toLowerCase().includes("wazrix")) {
        transactions = mergeWazrixTransactions(
          transactions,
          fs.readFileSync(source, "utf8"),
          lastUpdated,
          logger,
        );
      } else {
        throw new Error(`I don't know how to parse transactions from ${source}`);
      }
    } else if (typeof source !== "string") {
      transactions = mergeDefaultTransactions(transactions, source, lastUpdated);
    }
  }

  log.info(`Attaching price info to transactions`);
  const prices = getPrices(store, logger);
  for (let i = 0; i < transactions.length; i++) {
    const transaction = transactions[i];
    const assets = Array.from(new Set(transaction.transfers.map(a => a.assetType)));
    for (let j = 0; j < assets.length; j++) {
      const assetType = assets[j] as AssetTypes;
      if (!transaction.prices[assetType]) {
        transaction.prices[assetType] = await prices.getPrice(assetType, transaction.date);
      }
    }
  }
  log.info(`Transaction price info is up to date`);

  log.info(`Saving ${transactions.length} transactions to store`);
  let i = 1;
  transactions.map(transaction => transaction.index = i++);
  store.save(StoreKeys.Transactions, transactions);
  return transactions;
};

