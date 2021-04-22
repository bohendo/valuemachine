import {
  AddressBook,
  EthCall,
  ChainData,
  Transaction,
  TransactionSources,
  Logger,
  TransferCategories,
} from "@finances/types";
import { math } from "@finances/utils";
import { constants } from "ethers";

import { chrono, mergeTransaction } from "../utils";

import { categorizeTransfer } from "./categorize";

export const mergeEthCallTransactions = (
  transactions: Transaction[],
  addressBook: AddressBook,
  chainData: ChainData,
  logger: Logger,
): Transaction[] => {
  const log = logger.child({ module: "EthCall" });

  if (chainData.json.calls.length === 0) {
    log.info(`No new eth call are available to merge`);
    return transactions;
  }

  log.info(`Processing ${chainData.json.calls.length} new eth calls..`);

  chainData.json.calls.sort(chrono).forEach((call: EthCall): void => {

    if (!(addressBook.isSelf(call.to) || addressBook.isSelf(call.from))){
      return;
    }

    // We'll get internal token transfers from ethTx logs instead
    if (call.contractAddress !== constants.AddressZero) {
      return;
    }

    const ethTx = chainData.getEthTransaction(call.hash);
    if (!ethTx) {
      throw new Error(`No tx data for call ${call.hash}, maybe chainData didn't finish downloading`);
    } else if (ethTx.status !== 1) {
      log.debug(`Skipping reverted call`);
      return;
    }

    const transaction = {
      date: call.timestamp.split(".")[0],
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
      call.to,
      addressBook,
    );

    const { from, quantity, to } = transaction.transfers[0];
    if (math.eq(quantity, "0")) {
      return;
    }
    transaction.description = `${addressBook.getName(from)} sent ${quantity} ETH to ${
      addressBook.getName(to)
    } (internal)`;

    log.debug(transaction.description);
    mergeTransaction(transactions, transaction, log);
  });

  return transactions;
};
