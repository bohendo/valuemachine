import { Interface } from "@ethersproject/abi";
import { isHexString, hexDataLength } from "@ethersproject/bytes";
import {
  DecimalString,
  EthCall,
  EthTransaction,
  EthTransactionLog,
  Logger,
  TimestampString,
  Transaction,
  TransactionSources,
} from "@finances/types";
import { getLogger, math } from "@finances/utils";

const { diff, div, lt } = math;

export const getUnique = (array: string[]): string[] =>
  Array.from(new Set([...array]));

export const quantitiesAreClose = (q1: DecimalString, q2: DecimalString, wiggleRoom = "0.000001") =>
  lt(diff(q1, q2), wiggleRoom);

export const chrono = (e1: EthCall | EthTransaction, e2: EthCall | EthTransaction): number =>
  new Date(e1.timestamp).getTime() - new Date(e2.timestamp).getTime();

export const parseEvent = (
  iface: Interface,
  ethLog: EthTransactionLog,
): { name: string; args: { [key: string]: string }; } => {
  const name = Object.values(iface.events).find(e =>
    iface.getEventTopic(e) === ethLog.topics[0]
  )?.name;
  const args = name ? iface.parseLog(ethLog).args : [];
  return { name, args };
};

export const isHash = (str: string): boolean => isHexString(str) && hexDataLength(str) === 32;

// This fn ought to modifiy the old list of txns IN PLACE and also return the updated tx list
export const mergeTransaction = (
  transactions: Transaction[],
  newTx: Transaction,
  logger: Logger,
): Transaction[] => {
  let log = (logger || getLogger()).child({ module: "MergeTx" });

  const sortTransactions = (tx1: Transaction, tx2: Transaction): number =>
    new Date(tx1.date).getTime() === new Date(tx2.date).getTime()
      ? tx1.index - tx2.index
      : new Date(tx1.date).getTime() - new Date(tx2.date).getTime();

  const datesAreClose = (
    ts1: TimestampString,
    ts2: TimestampString,
    wiggleRoom = `${1000 * 60 * 30}`,
  ) =>
    lt(
      diff(new Date(ts1).getTime().toString(), new Date(ts2).getTime().toString()),
      wiggleRoom,
    );

  if (!newTx?.transfers?.length) {
    log.debug(`Skipped new tx with zero transfers`);
    return transactions;
  }

  const sources = newTx.sources;
  log = logger.child({ module: `Merge${sources.join("")}` });

  // Merge simple eth txns
  if (isHash(newTx.hash)) {

    // Does this list of txns already include the coresponding eth tx?
    const index = transactions.findIndex(tx => tx.hash === newTx.hash);

    // This is the first time we've encountered this eth tx
    if (index < 0) {

      // Mergable eth txns can only contain one transfer
      if (newTx.transfers.length > 1) {
        transactions.push(newTx);
        transactions.sort(sortTransactions);
        log.debug(`Inserted new multi-transfer eth tx: ${newTx.description}`);
        return transactions;
      }
      const transfer = newTx.transfers[0];

      const mergeCandidateIndex = transactions.findIndex(tx =>
        // This tx only has one transfer
        // (matching an eth tx to a mult-transfer external tx is not supported yet)
        tx.transfers.length === 1
        // This isn't an eth tx
        && !isHash(tx.hash)
        // This tx has a transfer with same asset type & quantity as this new tx
        && tx.transfers.some(t =>
          t.assetType === transfer.assetType &&
          quantitiesAreClose(t.quantity, transfer.quantity, div(transfer.quantity, "100"))
        )
        // Existing tx & new tx have timestamps within 30 mins of each other
        && datesAreClose(tx.date, newTx.date)
      );

      if (mergeCandidateIndex < 0) {
        transactions.push(newTx);
        transactions.sort(sortTransactions);
        log.debug(`Inserted new eth tx: ${newTx.description}`);
        return transactions;
      }

      transactions[mergeCandidateIndex].transfers[0] = transfer;
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

    log.debug(`Replaced duplicate eth tx: ${newTx.description}`);
    transactions[index] = newTx;
    return transactions;
  }

  // Merge external txns
  // Does the tx list already include this external tx?
  const dupCandidates = transactions.filter(tx =>
    tx.sources.some(source => sources.includes(source))
    && datesAreClose(tx.date, newTx.date, "1")
    && tx.transfers.some(t1 => newTx.transfers.some(t2 =>
      t1.assetType === t2.assetType &&
      quantitiesAreClose(t1.quantity, t2.quantity, div(t2.quantity, "100"))
    ))
  );
  if (dupCandidates.length > 0) {
    log.debug(`Skipping duplicate external tx: ${newTx.description}`);
    return transactions;
  }

  // Mergable external txns can only contain one transfer
  if (newTx.transfers.filter(t => math.gt(t.quantity, "0")).length > 1) {
    transactions.push(newTx);
    transactions.sort(sortTransactions);
    log.debug(`Inserted new multi-transfer external tx: ${newTx.description}`);
    return transactions;
  }
  const transfer = newTx.transfers[0];

  const mergeCandidateIndex = transactions.findIndex(tx =>
    // Existing tx only has one transfer
    // (transfer to external account in same tx as a contract interaction is not supported)
    tx.transfers.filter(t => math.gt(t.quantity, "0")).length === 1
    // Existing tx hasn't had this external tx merged into it yet
    && !tx.sources.some(source => sources.includes(source))
    // Existing tx has a transfer with same asset type & quantity as this new tx
    && tx.transfers.some(t =>
      t.assetType === transfer.assetType &&
      quantitiesAreClose(t.quantity, transfer.quantity, div(transfer.quantity, "100"))
    )
    // Existing tx & new tx have timestamps within 30 mins of each other
    && datesAreClose(tx.date, newTx.date)
  );

  if (mergeCandidateIndex < 0) {
    transactions.push(newTx);
    transactions.sort(sortTransactions);
    log.debug(`Inserted new external tx: ${newTx.description}`);
    return transactions;
  }

  transactions[mergeCandidateIndex] = {
    ...newTx,
    ...transactions[mergeCandidateIndex],
    description: transactions[mergeCandidateIndex].description,
    sources: getUnique([
      ...transactions[mergeCandidateIndex].sources,
      ...newTx.sources
    ]) as TransactionSources[],
    tags: getUnique([...transactions[mergeCandidateIndex].tags, ...newTx.tags]),
    date: newTx.date,
  };

  transactions.sort(sortTransactions);
  log.info(
    transactions[mergeCandidateIndex],
    `Merged transactions[${mergeCandidateIndex}] into new external tx: ${newTx.description}`,
  );

  return transactions;

};
