import {
  Transaction,
  TransactionSources,
  EthCall,
  EthTransaction,
  Logger,
} from "@finances/types";
import { getLogger, math } from "@finances/utils";

const { eq, diff, lt } = math;

const sortTransactions = (tx1: Transaction, tx2: Transaction): number =>
  new Date(tx1.date).getTime() === new Date(tx2.date).getTime()
    ? tx1.index - tx2.index
    : new Date(tx1.date).getTime() - new Date(tx2.date).getTime();

const getUnique = (array: string[]): string[] =>
  Array.from(new Set([...array]));

const datesAreClose = (tx1: Transaction, tx2: Transaction) =>
  lt(
    diff(
      new Date(tx1.date).getTime().toString(), new Date(tx2.date).getTime().toString()
    ),
    (1000 * 60 * 30).toString()
  );

export const chrono = (e1: EthCall | EthTransaction, e2: EthCall | EthTransaction): number =>
  new Date(e1.timestamp).getTime() - new Date(e2.timestamp).getTime();

// tricky tx w 2 eth calls: 0x0c27ccc265e5a944c05eca6820268a86af2ed8bd5517c8b83560517af56e7f91
// We could check chainData to see how many eth calls are associated w this tx

// This fn ought to modifiy the old list of txns IN PLACE and also return the updated tx list
export const mergeTransaction = (
  transactions: Transaction[],
  newTx: Transaction,
  logger: Logger,
): Transaction[] => {
  let log = (logger || getLogger()).child({ module: "MergeTx" });

  if (newTx.sources.length > 1) {
    log.warn(newTx.sources, `New transaction has more than 1 source, skipping:`);
    return transactions;
  }
  const source = newTx.sources[0];
  log = logger.child({ module: `Merge${source}` });


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
    ]) as TransactionSources[];
    log.debug(`Merged new eth call into transactions list at index ${index}`);
    return transactions;

  // Merge simple eth txns
  } else if (source === TransactionSources.EthTx) {

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
          t.assetType === transfer.assetType && eq(t.quantity, transfer.quantity)
        )
        // Existing tx & new tx have timestamps within 30 mins of each other
        && datesAreClose(tx, newTx)
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
        ...newTx,
        sources: getUnique([
          ...transactions[mergeCandidateIndex].sources,
          ...newTx.sources
        ]) as TransactionSources[],
        tags: getUnique([...transactions[mergeCandidateIndex].tags, ...newTx.tags]),
      };
      log.info(
        transactions[mergeCandidateIndex],
        `Merged new eth tx into transactions[${mergeCandidateIndex}] yielding:`,
      );

      return transactions;
    }

    log.info(`This eth tx already exists in the transactions list, skipping`);
    return transactions;
  }

  // Merge external txns
  // Does the tx list already include this external tx?
  const dupCandidates = transactions
    .filter(tx => tx.sources.includes(source))
    .filter(tx => datesAreClose(tx, newTx) && tx.description === newTx.description);
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
    && datesAreClose(tx, newTx)
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
    ...newTx,
    ...transactions[mergeCandidateIndex],
    description: newTx.description,
    sources: getUnique([
      ...transactions[mergeCandidateIndex].sources,
      ...newTx.sources
    ]) as TransactionSources[],
    tags: getUnique([...transactions[mergeCandidateIndex].tags, ...newTx.tags]),
  };
  log.info(
    transactions[mergeCandidateIndex],
    `Merged new tx into transactions[${mergeCandidateIndex}] yielding:`,
  );

  return transactions;

};
