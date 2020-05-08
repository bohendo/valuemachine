import {
  DecimalString,
  Transaction,
  TransactionSources,
  ILogger,
} from "@finances/types";
import { math } from "@finances/utils";

const { add, diff, div, lt, mul } = math;

export const mergeDefaultTransactions = (
  transactions: Transaction[],
  source: Partial<Transaction>,
  lastUpdated: number,
): Transaction[] => {
  if (source && source.date && new Date(source.date).getTime() <= lastUpdated) {
    return transactions;
  }

  const castDefault = (transaction: Partial<Transaction>): Partial<Transaction> => ({
    prices: {},
    sources: [TransactionSources.Personal],
    tags: [],
    transfers: [],
    ...transaction,
  });

  const input = castDefault(source);

  const output = [] as Transaction[];
  for (let i = 0; i < transactions.length; i++) {
    const transaction = transactions[i];
    if (transaction.hash && input.hash && transaction.hash === input.hash) {
      output.push({
        ...transaction,
        sources: Array.from(new Set([...transaction.sources, ...input.sources])),
        tags: Array.from(new Set([...transaction.tags, ...input.tags])),
      });
    } else {
      output.push(transaction);
    }
  }
  return output;
};

export const mergeFactory = (opts: {
  allowableTimeDiff: number;
  mergeTransactions: any;
  shouldMerge: any;
  log: ILogger;
}) =>
  (transactions: Transaction[], newTransaction: Transaction): Transaction[] => {
    const { allowableTimeDiff, mergeTransactions, shouldMerge, log } = opts;
    const output = [] as Transaction[];
    for (let i = 0; i < transactions.length; i++) {
      const transaction = transactions[i];
      if (!transaction || !transaction.date) {
        throw new Error(`Trying to merge new transaction into ${i} ${JSON.stringify(transaction, null, 2)}`);
      }
      if (newTransaction.date) {
        const delta =
          new Date(newTransaction.date).getTime() - new Date(transaction.date).getTime();
        if (isNaN(delta) || typeof delta !== "number") {
          throw new Error(`Error parsing date delta (${delta}) for new transaction: ${
            JSON.stringify(newTransaction, null, 2)
          } and old transaction: ${
            JSON.stringify(transaction, null, 2)
          }`);
        }
        if (delta > allowableTimeDiff) {
          log.debug(`new transaction came way before transaction ${i}, moving on`);
          output.push(transaction);
          continue;
        }
        if (delta < -1 * allowableTimeDiff) {
          log.debug(`new transaction came way after transaction ${i}, we're done`);
          output.push(newTransaction);
          output.push(...transactions.slice(i));
          return output;
        }
        log.debug(
          `transaction ${i} "${transaction.description}" occured ${delta / 1000}s after "${newTransaction.description}"`,
        );
      }

      if (shouldMerge(transaction, newTransaction)) {
        const mergedTransaction = mergeTransactions(transaction, newTransaction);
        log.info(`Merged "${newTransaction.description}" into ${i} "${transaction.description}"`);
        log.debug(`Yielding: ${JSON.stringify(mergedTransaction, null, 2)}`);
        output.push(mergedTransaction);
        output.push(...transactions.slice(i+1));
        return output;
      }
      output.push(transaction);
    }
    output.push(newTransaction);
    return output;
  };

export const mergeOffChainTransactions = (
  transaction: Transaction,
  ocTransaction: Transaction,
): Transaction => {
  const transfer = transaction.transfers[0];
  const ocTransfer = ocTransaction.transfers[0];
  const mergedTransfer = {
    ...transfer,
    from: ocTransfer.from.startsWith("external")
      ? transfer.from
      : ocTransfer.from,
    to: ocTransfer.to.startsWith("external")
      ? transfer.to
      : ocTransfer.to,
  };
  return {
    ...transaction,
    description: ocTransaction.description,
    sources: Array.from(new Set([...transaction.sources, ...ocTransaction.sources])),
    tags: Array.from(new Set([...transaction.tags, ...ocTransaction.tags])),
    transfers: [mergedTransfer],
  };
};

export const shouldMergeOffChain = (
  transaction: Transaction,
  ocTransaction: Transaction,
): boolean => {
  const amountsAreClose = (a1: DecimalString, a2: DecimalString): boolean =>
    lt(div(mul(diff(a1, a2), "200"), add(a1, a2)), "1");

  if (
    // assumes the deposit to/withdraw from exchange account doesn't interact w other contracts
    transaction.transfers.length !== 1 ||
    // only simple off chain sends to the chain
    ocTransaction.transfers.length !== 1
  ) {
    return false;
  }
  const transfer = transaction.transfers[0];
  const ocTransfer = ocTransaction.transfers[0];
  if (
    transfer.assetType === ocTransfer.assetType &&
    amountsAreClose(transfer.quantity, ocTransfer.quantity)
  ) {
    return true;
  }
  return false;
};
