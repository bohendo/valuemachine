import {
  Logger,
  TimestampString,
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
  CsvSources,
} from "./enums";

const { Income, Expense, Internal } = TransferCategories;

////////////////////////////////////////
// Internal Helper Functions

const datesAreClose = (
  ts1: TimestampString,
  ts2: TimestampString,
  wiggleRoom = 1000 * 60 * 30, // 30 minutes
) => Math.abs(
  new Date(ts1).getTime() -
  new Date(ts2).getTime()
) < wiggleRoom;

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
    transactions.sort(chrono);
    return transactions;

  ////////////////////////////////////////
  // Handle new evm transactions
  } else if (
    Object.keys(EvmNames).includes(newTx.sources[0])
  ) {
    log = (logger || getLogger()).child({ module: `MergeEthTx` });

    // Detect & replace duplicates
    const index = transactions.findIndex(tx => tx.hash === newTx.hash);
    if (index >= 0) { // If this is NOT the first time we've encountered this evm tx
      transactions[index] = newTx;
      transactions.sort(chrono);
      log.debug(`Replaced duplicate evm tx: ${newTx.method}`);
      return transactions;
    }

    // Mergable evm txns can only contain one simple non-fee transfer
    const transfers = newTx.transfers.filter(transfer =>
      ([Income, Expense] as string[]).includes(transfer.category)
      && !Object.keys(EvmNames).some(evm => evm === transfer.to)
    );
    if (transfers.length !== 1) {
      transactions.push(newTx);
      transactions.sort(chrono);
      log.debug(`Inserted new evm tx w ${transfers.length} mergable transfers: ${newTx.method}`);
      return transactions;
    }
    const evmTransfer = transfers[0];
    const wiggleRoom = div(evmTransfer.amount, "100");

    // Does this transfer have the same asset & similar amount as the new evm tx
    const isMergable = (transfer: Transfer): boolean => 
      transfer.category === Internal &&
      (evmTransfer.category === Expense || evmTransfer.category === Income) &&
      transfer.asset === evmTransfer.asset &&
      valuesAreClose(
        transfer.amount,
        evmTransfer.amount,
        wiggleRoom,
      );

    const mergeCandidateIndex = transactions.findIndex(tx =>
      // the candidate only has csv sources
      tx.sources.every(src => Object.keys(CsvSources).includes(src))
      // csv tx & new evm tx have timestamps that are close to each other
      && datesAreClose(tx.date, newTx.date)
      // the candidate has exactly 1 mergable transfer
      && tx.transfers.filter(isMergable).length === 1
    );

    if (mergeCandidateIndex < 0) {
      transactions.push(newTx);
      transactions.sort(chrono);
      log.debug(`Inserted new evm tx: ${newTx.method}`);
      return transactions;
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
    return transactions;

  ////////////////////////////////////////
  // Handle new csv transactions
  } else if (
    Object.keys(CsvSources).includes(newTx.sources[0])
  ) {
    const source = newTx.sources[0];
    log = (logger || getLogger()).child({ module: `Merge${source}Tx` });

    // Detect & skip duplicates
    if (transactions.filter(tx => tx.sources.includes(source)).find(tx =>
      datesAreClose(tx.date, newTx.date, 1) // ie equal w/in the margin of a rounding error
      && newTx.transfers.every(newTransfer => tx.transfers.some(oldTransfer =>
        newTransfer.asset === oldTransfer.asset &&
        valuesAreClose(
          newTransfer.amount,
          oldTransfer.amount,
          div(oldTransfer.amount, "100"),
        )
      ))
    )) {
      log.debug(`Skipping duplicate csv tx: ${newTx.method}`);
      return transactions;
    }

    // Mergable csv txns can only contain one transfer
    const extTransfer = newTx.transfers[0];
    const wiggleRoom = div(extTransfer.amount, "100");
    if (newTx.transfers.length !== 1 || extTransfer.category !== Internal) {
      transactions.push(newTx);
      transactions.sort(chrono);
      log.debug(`Inserted csv tx w ${newTx.transfers.length} transfers: ${newTx.method}`);
      return transactions;
    }

    // Does this transfer have the same asset & similar amount as the new csv tx
    const isMergable = (transfer: Transfer): boolean => 
      extTransfer.category === Internal &&
      (transfer.category === Expense || transfer.category === Income) &&
      transfer.asset === extTransfer.asset &&
      valuesAreClose(
        transfer.amount,
        extTransfer.amount,
        wiggleRoom,
      );

    const mergeCandidateIndex = transactions.findIndex(tx =>
      // the candidate has one non-csv source
      tx.sources.length === 1 && !Object.keys(CsvSources).includes(tx.sources[0])
      // evm tx & new csv tx have timestamps that are close each other
      && datesAreClose(tx.date, newTx.date)
      // the candidate has exactly 1 mergable transfer
      && tx.transfers.filter(isMergable).length === 1
    );

    if (mergeCandidateIndex < 0) {
      transactions.push(newTx);
      transactions.sort(chrono);
      log.debug(`Inserted new csv tx: ${newTx.method}`);
      return transactions;
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
    };
    evmTransfer.category = extTransfer.category;
    if (evmTransfer.category === Internal) {
      evmTransfer.to = extTransfer.to;
    } else {
      evmTransfer.from = extTransfer.from;
    }

    transactions.sort(chrono);
    log.info(
      transactions[mergeCandidateIndex],
      `Merged transactions[${mergeCandidateIndex}] into new csv tx: ${newTx.method}`,
    );
    return transactions;

  ////////////////////////////////////////
  // Handle new transactions of unknown source-type
  } else {
    log.info(`Inserting tx w unknown sources: [${newTx.sources}]`);
    transactions.push(newTx);
    transactions.sort(chrono);
    return transactions;
  }
};
