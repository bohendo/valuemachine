import {
  Address,
  TransactionsParams,
  TransactionsJson,
  CsvSource,
  CsvSources,
  StoreKeys,
  Transactions,
} from "@valuemachine/types";
import { getLogger, getTransactionsError } from "@valuemachine/utils";

import { parseEthTx, getChainData } from "./ethereum";
import {
  mergeCoinbaseTransactions,
  mergeDigitalOceanTransactions,
  mergeWazirxTransactions,
  mergeWyreTransactions,
} from "./external";
import { mergeTransaction } from "./merge";
import { EthParser, CsvParser } from "./types";

export const getTransactions = ({
  addressBook,
  logger,
  store,
  json: transactionsJson,
}: TransactionsParams): Transactions => {
  const log = (logger || getLogger()).child({ module: "Transactions" });
  const json = transactionsJson || (store ? store.load(StoreKeys.Transactions) : []);

  log.debug(`Loaded transaction data containing ${
    json.length
  } transactions from ${transactionsJson ? "input" : store ? "store" : "default"}`);

  const chainData = getChainData({ logger, store });

  ////////////////////////////////////////
  // Internal Helper Methods

  const sync = () => {
    // Reset Indicies
    let i = 1;
    json.forEach(transaction => transaction.index = i++);
    // Validate
    const error = getTransactionsError(json);
    if (error) {
      throw new Error(error);
    } else {
      log.debug("All transactions have been validated");
    }
    if (store) {
      // Save to store
      log.info(`Saving ${json.length} transactions to storage`);
      store.save(StoreKeys.Transactions, json);
    }
  };

  ////////////////////////////////////////
  // Exported Methods

  const syncEthereum = async (addresses: Address[], etherscanKey?: string): Promise<boolean> => {
    try {
      await chainData.syncAddresses(addresses, etherscanKey);
      return true;
    } catch (e) {
      log.error(e);
      return false;
    }
  };

  const mergeEthereum = (addresses: Address[], customParsers = [] as EthParser[]): void => {
    const selfAddresses = addressBook.addresses.filter(a => addressBook.isSelf(a));
    const ethData = chainData.getAddressHistory(...selfAddresses);
    const newEthTxns = ethData.getEthTransactions(ethTx =>
      !json.some(tx => tx.hash === ethTx.hash),
    );
    log.info(`Merging ${newEthTxns.length} new eth transactions`);
    newEthTxns.forEach(ethTx =>
      mergeTransaction(
        json,
        parseEthTx(
          ethTx,
          addressBook,
          chainData,
          logger,
          customParsers,
        ),
        logger,
      )
    );
    sync();
  };

  const mergeCsv = (csvData: string, parser: CsvSource | CsvParser): void => {
    if (parser === CsvSources.Coinbase) {
      mergeCoinbaseTransactions(json, csvData, log);
    } else if (parser === CsvSources.DigitalOcean) {
      mergeDigitalOceanTransactions(json, csvData, log);
    } else if (parser === CsvSources.Wazirx) {
      mergeWazirxTransactions(json, csvData, log);
    } else if (parser === CsvSources.Wyre) {
      mergeWyreTransactions(json, csvData, log);
    } else if (typeof parser === "function") {
      parser(json, csvData, log);
    } else {
      log.warn(parser, `Unknown parser, expected one of [${
        Object.keys(CsvSources).join(`", "`)
      }] or a custom function`);
    }
    sync();
  };

  const merge = (transactions: TransactionsJson): void => {
    log.info(`Merging ${transactions.length} new txs into ${json.length} existing txs`);
    transactions.forEach(tx => mergeTransaction(json, tx, log));
    sync();
    log.info(`Successful merge, now we have ${json.length} txs`);
  };

  return {
    json,
    mergeEthereum,
    mergeCsv,
    merge,
    syncEthereum,
  };

};
