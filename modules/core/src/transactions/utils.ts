import {
  DecimalString,
  Transaction,
  TransactionSources,
  Logger,
} from "@finances/types";
import { math } from "@finances/utils";

const { add, diff, div, lt, mul } = math;

export const isDuplicateOffChain = (
  oldTransaction: Transaction,
  newTransaction: Transaction,
): boolean => {
  if (oldTransaction.date !== newTransaction.date) {
    return false;
  } else if (oldTransaction.description !== newTransaction.description) {
    return false;
  } else {
    return true;
  }
};

export const mergeDefaultTransactions = (
  transactions: Transaction[],
  source: Partial<Transaction>,
): Transaction[] => {
  const castDefault = (transaction: Partial<Transaction>): Partial<Transaction> => ({
    prices: {},
    sources: [TransactionSources.Profile],
    tags: [],
    transfers: [],
    ...transaction,
  });

  const input = castDefault(source);

  const output = [] as Transaction[];
  for (let i = 0; i < transactions.length; i++) {
    const oldTransaction = transactions[i];
    if (oldTransaction.hash && input.hash && oldTransaction.hash === input.hash) {
      // Merge sources & tags
      output.push({
        ...oldTransaction,
        sources: Array.from(new Set([...oldTransaction.sources, ...input.sources])),
        tags: Array.from(new Set([...oldTransaction.tags, ...input.tags])),
      });
    } else if (!isDuplicateOffChain(oldTransaction, input as Transaction)) {
      output.push(oldTransaction);
    }
  }
  return output;
};

export const mergeFactory = (opts: {
  allowableTimeDiff: number;
  mergeTransactions: any;
  isDuplicate: any;
  shouldMerge: any;
  log: Logger;
}) =>
  (transactions: Transaction[], newTransaction: Transaction): Transaction[] => {
    const { allowableTimeDiff, isDuplicate, mergeTransactions, shouldMerge, log } = opts;
    const output = [] as Transaction[];
    for (let i = 0; i < transactions.length; i++) {
      const oldTransaction = transactions[i];
      if (!oldTransaction || !oldTransaction.date) {
        throw new Error(`Trying to merge new transaction into ${i} ${
          JSON.stringify(oldTransaction, null, 2)
        }`);
      }
      if (newTransaction.date) {
        const delta =
          new Date(newTransaction.date).getTime() - new Date(oldTransaction.date).getTime();
        if (isNaN(delta) || typeof delta !== "number") {
          throw new Error(`Error parsing date delta (${delta}) for new oldTransaction: ${
            JSON.stringify(newTransaction, null, 2)
          } and old oldTransaction: ${
            JSON.stringify(oldTransaction, null, 2)
          }`);
        }
        if (delta > allowableTimeDiff) {
          // log.debug(`new oldTransaction came way before oldTransaction ${i}, moving on`);
          output.push(oldTransaction);
          continue;
        }
        if (delta < -1 * allowableTimeDiff) {
          log.debug(`new transaction came way after oldTransaction ${i}, we're done`);
          output.push(newTransaction);
          output.push(...transactions.slice(i));
          return output;
        }
        log.debug(
          `transaction ${i} "${oldTransaction.description}" occured ${delta / 1000}s after "${
            newTransaction.description
          }"`,
        );
      }

      if (isDuplicate(oldTransaction, newTransaction)) {
        log.warn(`Skipping duplicate transaction`);
        return transactions;
      } else if (shouldMerge(oldTransaction, newTransaction)) {
        const mergedTransaction = mergeTransactions(oldTransaction, newTransaction);
        log.debug(`Merged "${newTransaction.description}" into ${i} "${oldTransaction.description}"`);
        log.debug(`Yielding: ${JSON.stringify(mergedTransaction, null, 2)}`);
        output.push(mergedTransaction);
        output.push(...transactions.slice(i+1));
        return output;
      }
      output.push(oldTransaction);
    }
    output.push(newTransaction);
    return output;
  };

export const mergeOffChainTransactions = (
  oldTransaction: Transaction,
  newTransaction: Transaction,
): Transaction => {
  const transfer = oldTransaction.transfers[0];
  const newTransfer = newTransaction.transfers[0];
  const mergedTransfer = {
    ...transfer,
    from: newTransfer.from.startsWith("external")
      ? transfer.from
      : newTransfer.from,
    to: newTransfer.to.startsWith("external")
      ? transfer.to
      : newTransfer.to,
  };
  return {
    ...oldTransaction,
    description: newTransaction.description,
    sources: Array.from(new Set([...oldTransaction.sources, ...newTransaction.sources])),
    tags: Array.from(new Set([...oldTransaction.tags, ...newTransaction.tags])),
    transfers: [mergedTransfer],
  };
};

export const shouldMergeOffChain = (
  oldTransaction: Transaction,
  newTransaction: Transaction,
): boolean => {
  const amountsAreClose = (a1: DecimalString, a2: DecimalString): boolean =>
    lt(div(mul(diff(a1, a2), "200"), add(a1, a2)), "1");

  if (
    // assumes the deposit to/withdraw from exchange account doesn't interact w other contracts
    oldTransaction.transfers.length !== 1 ||
    // only simple off chain sends to the chain
    newTransaction.transfers.length !== 1
  ) {
    return false;
  }
  const transfer = oldTransaction.transfers[0];
  const newTransfer = newTransaction.transfers[0];
  if (
    transfer.assetType === newTransfer.assetType &&
    amountsAreClose(transfer.quantity, newTransfer.quantity)
  ) {
    return true;
  }
  return false;
};
