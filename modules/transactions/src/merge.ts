import {
  ChainSources,
  CsvSources,
  Guards,
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
  isHash,
  rmDups,
  valuesAreClose,
} from "@valuemachine/utils";

const { Income, Expense, Deposit, Withdraw } = TransferCategories;

////////////////////////////////////////
// Internal Helper Functions

const datesAreClose = (
  ts1: TimestampString,
  ts2: TimestampString,
  wiggleRoom = `${1000 * 60 * 30}`,
) =>
  valuesAreClose(
    new Date(ts1).getTime().toString(),
    new Date(ts2).getTime().toString(),
    wiggleRoom,
  );

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
  // Handle new ethereum transactions
  if (
    newTx.sources.includes(ChainSources.Ethereum)
    && isHash(newTx.hash)
  ) {
    log = (logger || getLogger()).child({ module: `MergeEthTx` });

    // Detect & handle duplicates
    const index = transactions.findIndex(tx => tx.hash === newTx.hash);
    if (index >= 0) { // If this is NOT the first time we've encountered this eth tx
      log.debug(`Replaced duplicate eth tx: ${newTx.method}`);
      transactions[index] = newTx;
      transactions.sort(chrono);
      return transactions;
    }

    // Mergable eth txns can only contain one notable transfer
    const transfers = newTx.transfers.filter(transfer =>
      ([Income, Expense] as string[]).includes(transfer.category)
      && transfer.to !== Guards.Ethereum
    );
    if (transfers.length !== 1) {
      transactions.push(newTx);
      transactions.sort(chrono);
      log.debug(`Inserted new eth tx w ${transfers.length} mergable transfers: ${newTx.method}`);
      return transactions;
    }
    const ethTransfer = transfers[0];

    // Does this transfer have the same asset & similar quantity as the new eth tx
    const isMergable = (transfer: Transfer): boolean => 
      ((transfer.category === Deposit && ethTransfer.category === Expense) ||
       (transfer.category === Withdraw && ethTransfer.category === Income))
      && transfer.asset === ethTransfer.asset
      && valuesAreClose(
        transfer.quantity,
        ethTransfer.quantity,
        div(ethTransfer.quantity, "100"),
      );

    const mergeCandidateIndex = transactions.findIndex(tx =>
      // the candidate only has csv sources
      tx.sources.every(src => Object.keys(CsvSources).includes(src))
      // csv tx & new eth tx have timestamps that are close to each other
      && datesAreClose(tx.date, newTx.date)
      // the candidate has exactly 1 mergable transfer
      && tx.transfers.filter(isMergable).length === 1
    );

    if (mergeCandidateIndex < 0) {
      transactions.push(newTx);
      transactions.sort(chrono);
      log.debug(`Inserted new eth tx: ${newTx.method}`);
      return transactions;
    }

    const csvTx = transactions[mergeCandidateIndex];
    const csvTransfer = csvTx.transfers.find(isMergable);
    transactions[mergeCandidateIndex] = {
      // prioritize new eth tx values by default
      ...csvTx, ...newTx,
      // use csv date so we can detect csv dups more easily later
      date: csvTx.date,
      // merge sources
      sources: rmDups([...csvTx.sources, ...newTx.sources]),
    };
    ethTransfer.category = csvTransfer.category;
    if (ethTransfer.category === Deposit) {
      ethTransfer.to = csvTransfer.to;
    } else {
      ethTransfer.from = csvTransfer.from;
    }

    log.info(
      transactions[mergeCandidateIndex],
      `Merged transactions[${mergeCandidateIndex}] w new eth tx: ${newTx.method}`,
    );
    return transactions;

  ////////////////////////////////////////
  // Handle new csv transactions
  } else if (
    newTx.sources.every(src => Object.keys(CsvSources).includes(src))
    && newTx.sources.length === 1
  ) {
    const source = newTx.sources[0];
    log = (logger || getLogger()).child({ module: `Merge${source}Tx` });

    // Detect & handle duplicates
    if (transactions.find(tx =>
      tx.sources.some(src => src === source)
      && datesAreClose(tx.date, newTx.date, "1") // ie equal w/in the margin of a rounding error
      && tx.transfers.some(t1 => newTx.transfers.some(t2 =>
        t1.asset === t2.asset &&
        valuesAreClose(t1.quantity, t2.quantity, div(t2.quantity, "100"))
      ))
    )) {
      log.debug(`Skipping duplicate csv tx: ${newTx.method}`);
      return transactions;
    }

    // Mergable csv txns can only contain one transfer
    if (newTx.transfers.length !== 1) {
      transactions.push(newTx);
      transactions.sort(chrono);
      log.debug(`Inserted csv tx w ${newTx.transfers.length} transfers: ${newTx.method}`);
      return transactions;
    }
    const extTransfer = newTx.transfers[0];

    // Does this transfer have the same asset & similar quantity as the new csv tx
    const isMergable = (transfer: Transfer): boolean => 
      ((extTransfer.category === Deposit && transfer.category === Expense) ||
       (extTransfer.category === Withdraw && transfer.category === Income))
      && transfer.asset === extTransfer.asset
      && valuesAreClose(
        transfer.quantity,
        extTransfer.quantity,
        div(extTransfer.quantity, "100"),
      );

    const mergeCandidateIndex = transactions.findIndex(tx =>
      // the candidate only has ethereum sources
      tx.sources.includes(ChainSources.Ethereum)
      // eth tx & new csv tx have timestamps that are close each other
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

    const ethTx = transactions[mergeCandidateIndex];
    const ethTransfer = ethTx.transfers.find(isMergable);
    transactions[mergeCandidateIndex] = {
      // prioritize existing eth tx props by default
      ...newTx, ...ethTx,
      // use csv date so we can detect csv dups more easily later
      date: newTx.date,
      // merge sources
      sources: rmDups([...ethTx.sources, ...newTx.sources]),
    };
    ethTransfer.category = extTransfer.category;
    if (ethTransfer.category === Deposit) {
      ethTransfer.to = extTransfer.to;
    } else {
      ethTransfer.from = extTransfer.from;
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
    log.info(`Inserting tx that isn't from an Ethereum or Csv source`);
    transactions.push(newTx);
    transactions.sort(chrono);
    return transactions;
  }
};
