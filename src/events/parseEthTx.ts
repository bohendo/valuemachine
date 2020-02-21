import { InputData, Event, TransactionData } from "../types";
import { Logger, add, eq, gt, lt, mul, round, sub } from "../utils";

export const parseEthTxFactory = (input: InputData, eventsRef: Event[]) => {
  const events = JSON.parse(JSON.stringify(eventsRef)) as Event[];

  const log = new Logger("ParseEthTx", input.logLevel);
  const prettyPrintAddress = (addressBook: { [key: string]: string }) =>
    (address: string): string => input.addressBook[address] || address.substring(0, 10);
  const pretty = prettyPrintAddress(input.addressBook);
  const myEthAddresses = input.ethAddresses.map(a => a.toLowerCase());
  const isSelf = (address: string) => address && myEthAddresses.includes(address.toLowerCase());

  // TODO: take events as inputs & try to match this tx to some exchange transfer
  return (tx: TransactionData): Event | null => {
    if (!tx.logs) {
      throw new Error(`Missing logs for tx ${tx.hash}, did fetchChainData get interrupted?`);
    }

    // Deal w simple txs that don't interact w contracts too much.
    if (tx.logs.length === 0) {

      if (isSelf(tx.to) && isSelf(tx.from)) {
        log.debug(`Skipping simple tx that only contains self-to-self transfers`);
        return null;
      }

      if (eq(tx.value, "0")) {
        log.debug(`Skipping simple tx with zero-value`);
        return null;
      }

      if (tx.to === null) {
        log.debug(`Skipping contract creation tx`);
        return null;
      }

      // Simple income event
      if (isSelf(tx.to) && !isSelf(tx.from)) {
        log.info(`${pretty(tx.hash)} Detected simple income tx of ${tx.value} ETH from ${pretty(tx.from)}`);
        return({
          assetsIn: [{ amount: tx.value, type: "ETH" }],
          assetsOut: [],
          category: "income",
          date: tx.timestamp,
          description: `${tx.value} ETH from ${pretty(tx.from)}`,
          from: pretty(tx.from),
          hash: tx.hash,
          source: "ethereum",
          to: pretty(tx.to),
        });
      }

      // Simple expense event
      if (!isSelf(tx.to) && isSelf(tx.from)) {
        log.info(`${pretty(tx.hash)} Detected simple expense tx of ${tx.value} ETH to ${pretty(tx.to)}`);
        return({
          assetsIn: [],
          assetsOut: [{ amount: tx.value, type: "ETH" }],
          category: "expense",
          date: tx.timestamp,
          description: `${tx.value} ETH to ${pretty(tx.to)}`,
          from: pretty(tx.from),
          hash: tx.hash,
          source: "ethereum",
          to: pretty(tx.to),
        });
      }
      log.info(`idk how to handle this simple tx yet, skipping ${tx.hash}`);
      return null;
    }

    log.debug(`idk how to handle tx w logs yet, skipping ${tx.hash}`);
    return null;
  };
};
