import {
  getPrice,
  mergeCoinbaseTransactions,
  mergeDefaultTransactions,
  mergeDigitalOceanTransactions,
  mergeEthTransactions,
  mergeWyreTransactions,
} from "@finances/core";
import { AddressBook, ILogger, AssetTypes, ChainData, Transaction } from "@finances/types";
import { ContextLogger } from "@finances/utils";
import * as fs from "fs";

export const getTransactions = async (
  addressBook: AddressBook,
  chainData: ChainData,
  cache: any,
  extraTransactions: Array<Transaction | string>,
  logger: ILogger = console,
): Promise<Transaction[]> => {
  const log = new ContextLogger("GetTransactions", logger);

  let transactions = cache.loadTransactions();
  const lastUpdated = transactions.length !== 0
    ? new Date(transactions[transactions.length - 1].date).getTime()
    : 0;

  log.info(`Loaded ${transactions.length} transactions from cache, most recent was on: ${
    lastUpdated ? new Date(lastUpdated).toISOString() : "never"
  }`);

  transactions = mergeEthTransactions(
    transactions,
    addressBook,
    chainData,
    lastUpdated,
    logger,
  );

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
      } else {
        throw new Error(`I don't know how to parse transactions from ${source}`);
      }
    } else if (typeof source !== "string") {
      transactions = mergeDefaultTransactions(transactions, source, lastUpdated);
    }
  }

  log.info(`Attaching price info to transactions`);
  for (let i = 0; i < transactions.length; i++) {
    const transaction = transactions[i];
    const assets = Array.from(new Set(transaction.transfers.map(a => a.assetType)));
    for (let j = 0; j < assets.length; j++) {
      const assetType = assets[j] as AssetTypes;
      if (!transaction.prices) { transaction.prices = {}; } // TODO: this should already be done
      if (!transaction.prices[assetType]) {
        transaction.prices[assetType] = await getPrice(assetType, transaction.date, cache, logger);
      }
    }
  }
  log.info(`Transaction price info is up to date`);

  log.info(`Saving ${transactions.length} transactions to cache`);
  let i = 1;
  transactions.map(transaction => transaction.index = i++);
  cache.saveTransactions(transactions);
  return transactions;
};

