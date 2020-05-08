import {
  AddressBook,
  CallData,
  ChainData,
  Transaction,
  TransactionSources,
  ILogger,
  TransferCategories,
} from "@finances/types";
import { ContextLogger, math } from "@finances/utils";
import { AddressZero } from "ethers/constants";

import { categorizeTransfer } from "./categorizeTransfer";
import { assertChrono, mergeFactory } from "./utils";

export const mergeEthCallTransactions = (
  oldTransactions: Transaction[],
  addressBook: AddressBook,
  chainData: ChainData,
  lastUpdated: number,
  logger?: ILogger,
): Transaction[] => {
  const log = new ContextLogger("EthCall", logger);
  let transactions = JSON.parse(JSON.stringify(oldTransactions));

  log.info(`Processing ${chainData.calls.length} ethereum calls..`);

  chainData.calls.sort((call1, call2) => {
    return call1.block - call2.block;
  }).map((call: CallData): any => {
    if (new Date(call.timestamp).getTime() <= lastUpdated) {
      return null;
    }

    if (!(addressBook.isSelf(call.to) || addressBook.isSelf(call.from))){
      return null;
    }

    // We'll get internal token transfers from ethTx logs instead
    if (call.contractAddress !== AddressZero) {
      return null;
    }

    if (!chainData.transactions || !chainData.transactions.find(tx => tx.hash === call.hash)) {
      throw new Error(`No tx data for call ${call.hash}, did fetching chainData get interrupted?`);
    }

    if (chainData.transactions.find(tx => tx.hash === call.hash).status !== 1) {
      log.debug(`Skipping reverted call`);
      return null;
    }

    const transaction = {
      date: call.timestamp,
      hash: call.hash,
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
      return null;
    }
    transaction.description =
      `${addressBook.getName(from)} sent ${quantity} ETH to ${addressBook.getName(to)} (internal)`;

    log.info(transaction.description);

    return transaction;
  }).filter(e => !!e).forEach((txTransaction: Transaction): void => {
    transactions = mergeFactory({
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
    })(transactions, txTransaction);
  });
  assertChrono(transactions);

  return transactions;
};
