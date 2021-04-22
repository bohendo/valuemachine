import {
  DecimalString,
  Transaction,
  TransactionSources,
  Logger,
} from "@finances/types";
import { math } from "@finances/utils";

const { add, eq, diff, div, lt, mul } = math;

export const sortTransactions = (tx1: Transaction, tx2: Transaction): number =>
  new Date(tx1.date).getTime() === new Date(tx2.date).getTime()
    ? tx1.index - tx2.index
    : new Date(tx1.date).getTime() - new Date(tx2.date).getTime();

export const getUnique = (array: string[]) =>
  Array.from(new Set([...array]));

// tricky tx w 2 eth calls: 0x0c27ccc265e5a944c05eca6820268a86af2ed8bd5517c8b83560517af56e7f91
// We could check chainData to see how many eth calls are associated w this tx

// This fn ought to modifiy the old list of txns IN PLACE and also return the updated tx list
export const mergeTransaction = (
  transactions: Transaction[],
  logger: Logger,
): any => (
  newTx: Transaction,
): Transaction[] => {
  const log = logger.child({ module: "MergeTx" });

  if (newTx.sources.length > 1) {
    log.warn(newTx.sources, `New transaction has more than 1 source, skipping:`);
    return transactions;
  }
  const source = newTx.sources[0];

  // Merge simple internal eth calls
  if (source === TransactionSources.EthCall) {
    if (newTx.transfers.length > 1) {
      log.warn(newTx.transfers, `New eth call has more than 1 transfer, skipping:`);
      return transactions;
    }
    // Does this list of txns already include the coresponding eth tx?
    const index = transactions.findIndex(tx => tx.hash === newTx.hash);
    // This is the first time we encountered this eth tx, insert it
    if (index < 0) {
      // TODO: are there any external txns present that this should be merged into?
      transactions.push(newTx);
      transactions.sort(sortTransactions);
      log.debug(`Inserted new eth call into transactions list`);
      return transactions;
    }
    // An eth tx with this hash already exists, merge this eth call into it
    transactions[index].transfers.push(newTx.transfers[0]);
    transactions[index].sources = getUnique([
      ...transactions[index].sources,
      TransactionSources.EthCall,
    ]);
    log.debug(`Merged new eth call into transactions list at index ${index}`);
    return transactions;

  // Merge simple eth txns
  } else if (source === TransactionSources.EthTx) {
    log.info(`Analyzing new eth tx to see if it should be inserted or merged..`);

    // Does this list of txns already include the coresponding eth tx?
    const index = transactions.findIndex(tx => tx.hash === newTx.hash);
    // This is the first time we've encountered this eth tx
    if (index < 0) {

      // Mergable eth txns can only contain one transfer
      if (newTx.transfers.length > 1) {
        transactions.push(newTx);
        transactions.sort(sortTransactions);
        log.info(`Inserted multi-transfer eth tx into transactions list`);
        return transactions;
      }
      const transfer = newTx.transfers[0];

      const mergeCandidateIndex = transactions.findIndex(tx =>
        // This tx only has one transfer
        // (matching an eth tx to a mult-transfer external tx is not supported yet)
        tx.transfers.length === 1
        // This tx hasn't had this eth tx merged into it yet
        && !tx.sources.includes(source)
        // This tx has a transfer with same asset type & quantity as this new tx
        && tx.transfers.some(t =>
          t.assetType === transfer.assetType && eq(t.quantity, transfer.quantity)
        )
        // Existing tx & new tx have timestamps within 30 mins of each other
        && diff(
          new Date(tx.date).getTime().toString() - new Date(newTx.date).getTime().toString()
        ) < 1000 * 60 * 30
      );

      if (mergeCandidateIndex < 0) {
        transactions.push(newTx);
        transactions.sort(sortTransactions);
        log.info(`Inserted eth tx w no merge candidates into transactions list`);
        return transactions;
      }

      // The old transfer came from an exteranl source
      const oldTransfer = transactions[mergeCandidateIndex].transfers[0];

      transactions[mergeCandidateIndex].transfers[0] = {
        ...oldTransfer,
        from: transfer.from.startsWith("external")
          ? oldTransfer.from
          : transfer.from,
        to: transfer.to.startsWith("external")
          ? oldTransfer.to
          : transfer.to,
      };
      // Keep the external txn's description instead of the eth txn's
      transactions[mergeCandidateIndex] = {
        ...transactions[mergeCandidateIndex],
        sources: getUnique([...transactions[mergeCandidateIndex].sources, ...newTx.sources]),
        tags: getUnique([...transactions[mergeCandidateIndex].tags, ...newTx.tags]),
      };
      log.info(
        transactions[mergeCandidateIndex],
        `Merged new eth tx into transactions[${mergeCandidateIndex}] yielding:`,
      );

      return transactions;

    }
    log.debug(`This eth tx already exists in the transactions list, skipping`);
    return transactions;
  }

  // Merge external txns
  // Does the tx list already include this external tx?
  const dupCandidates = transactions
    .filter(tx => tx.sources.includes(source))
    .filter(tx => tx.date === newTx.date && tx.description === newTx.description);
  if (dupCandidates.length > 0) {
    log.warn(dupCandidates, `Looks like this external tx has already been merged`);
    return transactions;
  }

  // Mergable external txns can only contain one transfer
  if (newTx.transfers.length > 1) {
    transactions.push(newTx);
    transactions.sort(sortTransactions);
    log.info(`Inserted multi-transfer external tx into transactions list`);
    return transactions;
  }
  const transfer = newTx.transfers[0];

  const mergeCandidateIndex = transactions.findIndex(tx =>
    // Existing tx only has one transfer
    // (transfer to external account in same tx as a contract interaction is not supported)
    tx.transfers.length === 1
    // Existing tx hasn't had this external tx merged into it yet
    && !tx.sources.includes(source)
    // Existing tx has a transfer with same asset type & quantity as this new tx
    && tx.transfers.some(t =>
      t.assetType === transfer.assetType && eq(t.quantity, transfer.quantity)
    )
    // Existing tx & new tx have timestamps within 30 mins of each other
    && diff(
      new Date(tx.date).getTime().toString() - new Date(newTx.date).getTime().toString()
    ) < 1000 * 60 * 30
  );

  if (mergeCandidateIndex < 0) {
    transactions.push(newTx);
    transactions.sort(sortTransactions);
    log.info(`Inserted external tx w no merge candidates into transactions list`);
    return transactions;
  }

  const oldTransfer = transactions[mergeCandidateIndex].transfers[0];

  transactions[mergeCandidateIndex].transfers[0] = {
    ...oldTransfer,
    from: transfer.from.startsWith("external")
      ? oldTransfer.from
      : transfer.from,
    to: transfer.to.startsWith("external")
      ? oldTransfer.to
      : transfer.to,
  };
  transactions[mergeCandidateIndex] = {
    ...transactions[mergeCandidateIndex],
    description: newTx.description,
    sources: getUnique([...transactions[mergeCandidateIndex].sources, ...newTx.sources]),
    tags: getUnique([...transactions[mergeCandidateIndex].tags, ...newTx.tags]),
  };
  log.info(
    transactions[mergeCandidateIndex],
    `Merged new tx into transactions[${mergeCandidateIndex}] yielding:`,
  );

  return transactions;

};

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

export const mergeDefaultTransactions = (
  transactions: Transaction[],
  source: Partial<Transaction>,
): Transaction[] => {
  const castDefault = (transaction: Partial<Transaction>): Partial<Transaction> => ({
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
