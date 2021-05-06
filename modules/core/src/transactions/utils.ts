import {
  DecimalString,
  EthCall,
  EthTransaction,
  Logger,
  TimestampString,
  Transaction,
  TransactionSources,
} from "@finances/types";
import { getLogger, math } from "@finances/utils";

const { diff, lt } = math;

const sortTransactions = (tx1: Transaction, tx2: Transaction): number =>
  new Date(tx1.date).getTime() === new Date(tx2.date).getTime()
    ? tx1.index - tx2.index
    : new Date(tx1.date).getTime() - new Date(tx2.date).getTime();

export const getUnique = (array: string[]): string[] =>
  Array.from(new Set([...array]));

const datesAreClose = (
  ts1: TimestampString,
  ts2: TimestampString,
  wiggleRoom = `${1000 * 60 * 30}`,
) =>
  lt(
    diff(new Date(ts1).getTime().toString(), new Date(ts2).getTime().toString()),
    wiggleRoom,
  );

const quantitiesAreClose = (q1: DecimalString, q2: DecimalString, wiggleRoom = "0.000001") =>
  lt(diff(q1, q2), wiggleRoom);

export const chrono = (e1: EthCall | EthTransaction, e2: EthCall | EthTransaction): number =>
  new Date(e1.timestamp).getTime() - new Date(e2.timestamp).getTime();

// This fn ought to modifiy the old list of txns IN PLACE and also return the updated tx list
export const mergeTransaction = (
  transactions: Transaction[],
  newTx: Transaction,
  logger: Logger,
): Transaction[] => {
  let log = (logger || getLogger()).child({ module: "MergeTx" });

  if (!newTx?.transfers?.length) {
    log.debug(newTx, `Skipped new tx with zero transfers`);
    return transactions;
  }

  if (newTx.sources.length > 1) {
    log.warn(newTx, `Skipped new tx with ${newTx.sources.length} sources`);
    return transactions;
  }
  const source = newTx.sources[0];
  log = logger.child({ module: `Merge${source}` });

  // Merge simple eth txns
  if (source === TransactionSources.EthTx) {

    // Does this list of txns already include the coresponding eth tx?
    const index = transactions.findIndex(tx => tx.hash === newTx.hash);

    // This is the first time we've encountered this eth tx
    if (index < 0) {

      // Mergable eth txns can only contain one transfer
      if (newTx.transfers.length > 1) {
        transactions.push(newTx);
        transactions.sort(sortTransactions);
        log.info(`Inserted new multi-transfer eth tx: ${newTx.description}`);
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
          t.assetType === transfer.assetType && quantitiesAreClose(t.quantity, transfer.quantity)
        )
        // Existing tx & new tx have timestamps within 30 mins of each other
        && datesAreClose(tx.date, newTx.date)
      );

      if (mergeCandidateIndex < 0) {
        transactions.push(newTx);
        transactions.sort(sortTransactions);
        log.info(`Inserted new eth tx: ${newTx.description}`);
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
        ...newTx,
        sources: getUnique([
          ...transactions[mergeCandidateIndex].sources,
          ...newTx.sources
        ]) as TransactionSources[],
        tags: getUnique([...transactions[mergeCandidateIndex].tags, ...newTx.tags]),
      };

      log.info(
        transactions[mergeCandidateIndex],
        `Merged transactions[${mergeCandidateIndex}] w new eth tx: ${newTx.description}`,
      );
      return transactions;
    }

    log.info(`Replaced duplicate eth tx: ${newTx.description}`);
    transactions[index] = newTx;
    return transactions;
  }

  // Merge external txns
  // Does the tx list already include this external tx?
  const dupCandidates = transactions
    .filter(tx => tx.sources.includes(source))
    .filter(tx => datesAreClose(tx.date, newTx.date, "1") && tx.description === newTx.description);
  if (dupCandidates.length > 0) {
    log.info(`Skipping duplicate external tx: ${newTx.description}`);
    return transactions;
  }

  // Mergable external txns can only contain one transfer
  if (newTx.transfers.filter(t => math.gt(t.quantity, "0")).length > 1) {
    transactions.push(newTx);
    transactions.sort(sortTransactions);
    log.info(`Inserted new multi-transfer external tx: ${newTx.description}`);
    return transactions;
  }
  const transfer = newTx.transfers[0];

  const mergeCandidateIndex = transactions.findIndex(tx =>
    // Existing tx only has one transfer
    // (transfer to external account in same tx as a contract interaction is not supported)
    tx.transfers.filter(t => math.gt(t.quantity, "0")).length === 1
    // Existing tx hasn't had this external tx merged into it yet
    && !tx.sources.includes(source)
    // Existing tx has a transfer with same asset type & quantity as this new tx
    && tx.transfers.some(t =>
      t.assetType === transfer.assetType && quantitiesAreClose(t.quantity, transfer.quantity)
    )
    // Existing tx & new tx have timestamps within 30 mins of each other
    && datesAreClose(tx.date, newTx.date)
  );

  if (mergeCandidateIndex < 0) {
    transactions.push(newTx);
    transactions.sort(sortTransactions);
    log.info(`Inserted new external tx: ${newTx.description}`);
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
    ...newTx,
    ...transactions[mergeCandidateIndex],
    description: newTx.description,
    sources: getUnique([
      ...transactions[mergeCandidateIndex].sources,
      ...newTx.sources
    ]) as TransactionSources[],
    tags: getUnique([...transactions[mergeCandidateIndex].tags, ...newTx.tags]),
    date: newTx.date,
  };

  log.info(
    transactions[mergeCandidateIndex],
    `Merged transactions[${mergeCandidateIndex}] into new external tx: ${newTx.description}`,
  );

  return transactions;

};
