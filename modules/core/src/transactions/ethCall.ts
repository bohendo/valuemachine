import {
  AddressBook,
  EthCall,
  ChainDataJson,
  Transaction,
  TransactionSources,
  Logger,
  TransferCategories,
} from "@finances/types";
import { ContextLogger, math } from "@finances/utils";
import { AddressZero } from "ethers/constants";

import { categorizeTransfer } from "./categorizeTransfer";
import { mergeFactory } from "./utils";
import { getTransactionsError } from "../verify";

export const mergeEthCallTransactions = (
  oldTransactions: Transaction[],
  addressBook: AddressBook,
  chainData: ChainDataJson,
  lastUpdated: number,
  logger?: Logger,
): Transaction[] => {
  const log = new ContextLogger("EthCall", logger);
  let transactions = JSON.parse(JSON.stringify(oldTransactions));

  const merge = mergeFactory({
      allowableTimeDiff: 0,
      log,
      mergeTransactions: (transaction: Transaction, callTransaction: Transaction): Transaction => {
        // tx logs and token calls return same data, add this tranfer iff this isn't the case
        transaction.transfers.push(callTransaction.transfers[0]);
        transaction.sources.push(TransactionSources.EthCall);
        return transaction;
      },
      shouldMerge: (transaction: Transaction, callTransaction: Transaction): boolean =>
        transaction.hash === callTransaction.hash,
    });

  log.info(`Processing ${chainData.calls.length} ethereum calls..`);

  chainData.calls
    .sort((call1, call2) => call1.block - call2.block)
    .forEach((call: EthCall): void => {
      if (new Date(call.timestamp).getTime() <= lastUpdated) {
        return;
      }

      if (!(addressBook.isSelf(call.to) || addressBook.isSelf(call.from))){
        return;
      }

      // We'll get internal token transfers from ethTx logs instead
      if (call.contractAddress !== AddressZero) {
        return;
      }

      if (!chainData.transactions || !chainData.transactions.find(tx => tx.hash === call.hash)) {
        throw new Error(`No tx data for call ${call.hash}, did fetching chainData get interrupted?`);
      }

      if (chainData.transactions.find(tx => tx.hash === call.hash).status !== 1) {
        log.debug(`Skipping reverted call`);
        return;
      }

      const transaction = {
        date: call.timestamp,
        hash: call.hash,
        prices: {},
        sources: [TransactionSources.EthCall],
        tags: [],
        transfers: [{
          assetType: "ETH",
          category: TransferCategories.Transfer,
          from: call.from.toLowerCase(),
          quantity: call.value,
          to: call.to.toLowerCase(),
        }],
      } as Transaction;

      transaction.transfers[0] = categorizeTransfer(
        transaction.transfers[0],
        [],
        addressBook,
        logger,
      );

      const { from, quantity, to } = transaction.transfers[0];
      if (math.eq(quantity, "0")) {
        return;
      }
      transaction.description =
        `${addressBook.getName(from)} sent ${quantity} ETH to ${addressBook.getName(to)} (internal)`;

      log.info(transaction.description);

      transactions = merge(transactions, transaction);
    });

  const error = getTransactionsError(transactions);
  if (error) {
    throw new Error(error);
  }

  return transactions;
};
