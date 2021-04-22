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

import { mergeTransaction } from "../utils";

import { categorizeTransfer } from "./categorize";

export const mergeEthCallTransactions = (
  oldTransactions: Transaction[],
  addressBook: AddressBook,
  chainData: ChainData,
  lastUpdated: number,
  logger: Logger,
): Transaction[] => {
  let transactions = JSON.parse(JSON.stringify(oldTransactions));
  const log = logger.child({ module: "EthCall" });
  const start = Date.now();

  const newEthCalls = chainData.getEthCalls(ethCall =>
    new Date(ethCall.timestamp).getTime() > lastUpdated,
  );

  if (newEthCalls.length === 0) {
    log.info(`No new eth call are available to merge`);
    return transactions;
  }

  log.info(`Processing ${newEthCalls.length} new eth calls..`);

  newEthCalls
    .sort((call1, call2) => call1.block - call2.block)
    .forEach((call: EthCall): void => {
      if (new Date(call.timestamp).getTime() <= lastUpdated) {
        return;
      }

      if (!(addressBook.isSelf(call.to) || addressBook.isSelf(call.from))){
        return;
      }

      // We'll get internal token transfers from ethTx logs instead
      if (call.contractAddress !== constants.AddressZero) {
        return;
      }

      const ethTx = chainData.getEthTransaction(call.hash);
      if (!ethTx) {
        throw new Error(`No tx data for call ${call.hash}, did fetching chainData ever finish?`);
      } else if (ethTx.status !== 1) {
        log.debug(`Skipping reverted call`);
        return;
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
        call.to,
        addressBook,
        logger,
      );

      const { from, quantity, to } = transaction.transfers[0];
      if (math.eq(quantity, "0")) {
        return;
      }
      transaction.description = `${addressBook.getName(from)} sent ${quantity} ETH to ${
        addressBook.getName(to)
      } (internal)`;

      log.debug(transaction.description);

      transactions = mergeTransaction(transactions, log)(transaction);
    });

  const diff = (Date.now() - start).toString();
  log.info(`Done processing eth calls in ${diff} ms (avg ${
    math.round(math.div(diff, newEthCalls.length.toString()))
  } ms/ethCall)`);
  return transactions;
};
