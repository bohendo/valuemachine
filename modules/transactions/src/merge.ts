import {
  Logger,
  DateTimeString,
  Transaction,
  Transfer,
  TransferCategories,
} from "@valuemachine/types";
import {
  chrono,
  div,
  getLogger,
  dedup,
  valuesAreClose,
} from "@valuemachine/utils";

import {
  EvmNames,
  Methods,
  CsvSources,
} from "./enums";

const { Fee, Income, Expense, Internal } = TransferCategories;

////////////////////////////////////////
// Internal Helper Functions

const datesAreClose = (
  ts1: DateTimeString,
  ts2: DateTimeString,
  wiggleRoom = 1000 * 60 * 30, // 30 minutes
) => Math.abs(
  new Date(ts1).getTime() -
  new Date(ts2).getTime()
) < wiggleRoom;

const sort = (txns: Transaction[]): Transaction[] => {
  txns.sort(chrono);
  return txns.map((tx, index) => {
    tx.index = index;
    return tx;
  });
};

////////////////////////////////////////
// Exported Function
// NOTE: This fn modifies the given list of transactions IN PLACE
export const mergeTransaction = (
  transactions: Transaction[],
  newTx: Transaction,
  logger: Logger,
): Transaction[] => {
  let log = (logger || getLogger()).child({ module: "MergeTx" });
  if (!newTx?.transfers?.length) {
    log.debug(`Skipped new tx with zero transfers`);
    return transactions;
  }

  ////////////////////////////////////////
  // Insert already-merged transactions bc we don't know how to dedeup them
  if (
    newTx.sources.length > 1
  ) {
    log.info(`Inserting tx w multiple sources: [${newTx.sources}]`);
    transactions.push(newTx);
    return sort(transactions);

  ////////////////////////////////////////
  // Handle new evm transactions
  } else if (
    Object.keys(EvmNames).includes(newTx.sources[0])
  ) {
    log = (logger || getLogger()).child({ module: `MergeEthTx` });

    // Detect & replace duplicates
    const index = transactions.findIndex(tx => tx.uuid === newTx.uuid);
    if (index >= 0) { // If this is NOT the first time we've encountered this evm tx
      transactions[index] = newTx;
      log.debug(`Replaced duplicate evm tx: ${newTx.uuid}`);
      return sort(transactions);
    }

    // Mergable evm txns can only contain one simple non-fee transfer
    const transfers = newTx.transfers.filter(transfer => transfer.category !== Fee);
    const evmTransfer = transfers[0];
    if (transfers.length !== 1 || (
      evmTransfer.category !== Expense && evmTransfer.category !== Income
    )) {
      transactions.push(newTx);
      log.debug(`Inserted new evm tx w ${transfers.length} mergable transfers: ${newTx.method}`);
      return sort(transactions);
    }
    const wiggleRoom = div(evmTransfer.amount, "100");

    // Does this transfer have the same asset & similar amount as the new evm tx
    const isMergable = (transfer: Transfer): boolean => 
      transfer.category === Internal
      && transfer.asset === evmTransfer.asset
      && valuesAreClose(
        transfer.amount,
        evmTransfer.amount,
        wiggleRoom,
      );

    const targetMethod = !evmTransfer.category ? ""
      : evmTransfer.category === Expense ? Methods.Deposit
      : evmTransfer.category === Income ? Methods.Withdraw
      : "";
    const mergeCandidateIndex = transactions.findIndex(tx =>
      // the candidate only has csv sources
      tx.sources.every(src => Object.keys(CsvSources).includes(src))
      // Deposits should only be merged with expenses & withdrawals w income
      && tx.method === targetMethod
      // csv tx & new evm tx have timestamps that are close to each other
      && datesAreClose(tx.date, newTx.date)
      // the candidate has exactly 1 mergable transfer
      && tx.transfers.filter(isMergable).length === 1
    );

    if (mergeCandidateIndex < 0) {
      transactions.push(newTx);
      log.debug(`Inserted new evm tx: ${newTx.method}`);
      return sort(transactions);
    }

    const csvTx = transactions[mergeCandidateIndex];
    const csvTransfer = csvTx.transfers.find(isMergable);
    transactions[mergeCandidateIndex] = {
      // prioritize new evm tx values by default
      ...csvTx, ...newTx,
      // use csv date so we can detect csv dups more easily later
      date: csvTx.date,
      // merge sources
      sources: dedup([...csvTx.sources, ...newTx.sources]),
    };
    evmTransfer.category = csvTransfer.category;
    if (evmTransfer.category === Internal) {
      evmTransfer.to = csvTransfer.to;
    } else {
      evmTransfer.from = csvTransfer.from;
    }

    log.info(
      transactions[mergeCandidateIndex],
      `Merged transactions[${mergeCandidateIndex}] w new evm tx: ${newTx.method}`,
    );
    return sort(transactions);

  ////////////////////////////////////////
  // Handle new csv transactions
  } else if (
    Object.keys(CsvSources).includes(newTx.sources[0])
  ) {
    const source = newTx.sources[0];
    log = (logger || getLogger()).child({ module: `Merge${source}Tx` });

    if (transactions.filter(tx => tx.sources.includes(source)).find(tx =>
      tx.uuid === newTx.uuid || (
        datesAreClose(tx.date, newTx.date, 1) // ie equal w/in the margin of a rounding error
        && newTx.transfers.every(newTransfer => tx.transfers.some(oldTransfer =>
          newTransfer.asset === oldTransfer.asset &&
          valuesAreClose(
            newTransfer.amount,
            oldTransfer.amount,
            div(oldTransfer.amount, "100"),
          )
        ))
      )
    )) {
      log.debug(`Skipping duplicate csv tx: ${newTx.method}`);
      return sort(transactions);
    }

    // Mergable csv txns can only contain one transfer
    const extTransfer = newTx.transfers[0];
    const wiggleRoom = div(extTransfer.amount, "100");
    if (newTx.transfers.length !== 1 || extTransfer.category !== Internal) {
      transactions.push(newTx);
      log.debug(`Inserted csv tx w ${newTx.transfers.length} transfers: ${newTx.method}`);
      return sort(transactions);
    }

    // Does this transfer have the same asset & similar amount as the new csv tx
    const targetCategory = !newTx.method ? ""
      : newTx.method === Methods.Deposit ? TransferCategories.Expense
      : newTx.method === Methods.Withdraw ? TransferCategories.Income
      : "";
    const isMergable = (transfer: Transfer): boolean => 
      transfer.category === targetCategory
      && transfer.asset === extTransfer.asset
      && valuesAreClose(
        transfer.amount,
        extTransfer.amount,
        wiggleRoom,
      );

    const mergeCandidateIndex = transactions.findIndex(tx =>
      // the candidate has one non-csv source
      tx.sources.length === 1 && !Object.keys(CsvSources).includes(tx.sources[0])
      // the candidate has one non-fee transfer
      && tx.transfers.filter(transfer => transfer.category !== Fee).length === 1
      // evm tx & new csv tx have timestamps that are close each other
      && datesAreClose(tx.date, newTx.date)
      // the candidate has exactly 1 mergable transfer
      && tx.transfers.filter(isMergable).length === 1
    );

    if (mergeCandidateIndex < 0) {
      transactions.push(newTx);
      log.debug(`Inserted new csv tx: ${newTx.method} on ${newTx.date}`);
      return sort(transactions);
    }

    const evmTx = transactions[mergeCandidateIndex];
    const evmTransfer = evmTx.transfers.find(isMergable);
    transactions[mergeCandidateIndex] = {
      // prioritize existing evm tx props by default
      ...newTx, ...evmTx,
      // use csv date so we can detect csv dups later
      date: newTx.date,
      // merge sources
      sources: dedup([...evmTx.sources, ...newTx.sources]),
      transfers: [
        ...evmTx.transfers.filter(t => !isMergable(t)), // Simply insert non-mergable transfers
        { // insert the mergable transfer w values properly merged
          ...evmTransfer,
          category: TransferCategories.Internal,
          from: extTransfer.from.endsWith("default") ? evmTransfer.from : extTransfer.from,
          to: extTransfer.to.endsWith("default") ? evmTransfer.to : extTransfer.to,
        }
      ].sort((t1, t2) => t1.index - t2.index), // make sure they're still sorted by index
    };

    log.info(
      transactions[mergeCandidateIndex],
      `Merged transactions[${mergeCandidateIndex}] into new csv tx: ${newTx.method}`,
    );
    return sort(transactions);

  ////////////////////////////////////////
  // Handle new transactions of unknown source-type
  } else {
    log.info(`Inserting tx w unknown sources: [${newTx.sources}]`);
    transactions.push(newTx);
    return sort(transactions);
  }
};
