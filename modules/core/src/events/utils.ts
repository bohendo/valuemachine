import {
  DecimalString,
  Event,
  EventSources,
  TransactionLog,
  Transfer,
  TransferCategories,
} from "@finances/types";
import { AddressZero } from "ethers/constants";
import { formatEther } from "ethers/utils";

import { exchangeEvents, daiJoinInterface, defiEvents, vatInterface } from "../abi";
import { AddressBook, ILogger } from "../types";
import { add, diff, div, eq, lt, mul } from "../utils";

export const transferTagger = (
  inputTransfer: Partial<Transfer>,
  txLogs: TransactionLog[],
  addressBook: AddressBook,
): Transfer => {
  const transfer = JSON.parse(JSON.stringify(inputTransfer));
  const { isExchange, isDefi, isFamily, isSelf, isToken, getName } = addressBook;

  // nothing to match with if self-to-self
  if (isSelf(transfer.from) && isSelf(transfer.to)) {
    return transfer;

  // nothing to match with external-to-external
  } else if (!isSelf(transfer.from) && !isSelf(transfer.to)) {
    return transfer;

  // eg SwapOut to Uniswap
  } else if (isExchange(transfer.to) && isSelf(transfer.from)) {
    transfer.category = TransferCategories.SwapOut;
    return transfer;

  // eg SwapIn from Uniswap
  } else if (isExchange(transfer.from) && isSelf(transfer.to)) {
    transfer.category = TransferCategories.SwapIn;
    return transfer;

  // eg deposit into OG CDP
  } else if (transfer.assetType === "WETH" && getName(transfer.to) === "makerdao-v1-tub") {
    transfer.category = TransferCategories.Deposit;
    return transfer;

  // eg withdraw from OG CDP
  } else if (transfer.assetType === "WETH" && getName(transfer.from) === "makerdao-v1-tub") {
    transfer.category = TransferCategories.Withdraw;
    return transfer;

  } else if (isFamily(transfer.to) || isFamily(transfer.from)) {
    transfer.category = TransferCategories.Gift;
    return transfer;

  } else if (
    transfer.assetType === "ETH" &&
    addressBook.getName(transfer.from).toLowerCase() === "weth"
  ) {
    transfer.category = TransferCategories.Unlock;
  } else if (
    transfer.assetType === "ETH"
    && addressBook.getName(transfer.to).toLowerCase() === "weth"
  ) {
    transfer.category = TransferCategories.Lock;
  }

  for (const txLog of txLogs) {

    if (isDefi(txLog.address)) {

      // compound v2
      if (isToken(txLog.address) && getName(txLog.address).toLowerCase().startsWith("c")) {
        const event = defiEvents.find(e => e.topic === txLog.topics[0]);
        if (!event) { continue; }
        const data = event.decode(txLog.data, txLog.topics);
        // Withdraw
        if (event.name === "Redeem" && eq(formatEther(data.redeemAmount), transfer.quantity)) {
          transfer.category = TransferCategories.Withdraw;
          if (transfer.from === AddressZero) {
            transfer.from = txLog.address;
          }
        // Deposit
        } else if (event.name === "Mint" && eq(formatEther(data.mintAmount), transfer.quantity)) {
          transfer.category = TransferCategories.Deposit;
        }

      // makerdao
      } else if (
        getName(txLog.address) === "maker-core-vat" &&
        txLog.topics[0].slice(0,10) === vatInterface.functions.move.sighash
      ) {
        const src = "0x"+ txLog.topics[1].slice(26);
        const dst = "0x"+ txLog.topics[2].slice(26);

        // Amounts are not always exact so not sure if we can make useful comparisons yet
        // const rad = formatUnits(txLog.topics[2], 45);

        if (transfer.from === AddressZero && getName(src) === "maker-pot") {
          transfer.category = TransferCategories.Withdraw;
          transfer.from = src;
          break;

        } else if (transfer.from === AddressZero && getName(src) === "cdp" /* user-specific */) {
          transfer.category = TransferCategories.Borrow;
          transfer.from = src;
          break;

        } else if (transfer.to === AddressZero && getName(dst) === "maker-pot") {
          transfer.category = TransferCategories.Deposit;
          transfer.to = dst;
          break;

        } else if (transfer.to === AddressZero && getName(dst) === "cdp") {
          transfer.category = TransferCategories.Repay;
          transfer.to = dst;
          break;

        }

      // eg compound v1
      } else {
        const event = defiEvents.find(e => e.topic === txLog.topics[0]);
        if (!event) { continue; }
        const data = event.decode(txLog.data, txLog.topics);
        if (
          eq(formatEther(data.amount), transfer.quantity) &&
          getName(data.asset) === transfer.assetType
        ) {
          if (event.name === "RepayBorrow") {
            transfer.category = TransferCategories.Repay;
          } else if (event.name === "Borrow") {
            transfer.category = TransferCategories.Borrow;
          } else if (event.name === "SupplyReceived") {
            transfer.category = TransferCategories.Deposit;
          } else if (event.name === "SupplyWithdrawn") {
            transfer.category = TransferCategories.Withdraw;
          } else if (event.name === "BorrowTaken") {
            transfer.category = TransferCategories.Borrow;
          } else if (event.name === "BorrowRepaid") {
            transfer.category = TransferCategories.Repay;
          }
        }
      }

    // eg Oasis Dex
    } else if (isExchange(txLog.address)) {
      const event = exchangeEvents.find(e => e.topic === txLog.topics[0]);
      if (event && event.name === "LogTake") {
        const data = event.decode(txLog.data, txLog.topics);
        if (eq(formatEther(data.take_amt), transfer.quantity)) {
          transfer.category = TransferCategories.SwapIn;
          break;
        } else if (eq(formatEther(data.give_amt), transfer.quantity)) {
          transfer.category = TransferCategories.SwapOut;
          break;
        }
      }

    // eg SCD -> MCD Migration
    } else if (
      getName(txLog.address) === "maker-dai-join" &&
      txLog.topics[0].slice(0,10) === daiJoinInterface.functions.exit.sighash
    ) {
      const src = "0x" + txLog.topics[1].slice(26).toLowerCase();
      const dst = "0x" + txLog.topics[2].slice(26).toLowerCase();
      const amt = formatEther(txLog.topics[3]);
      if (
        getName(src) === "scdmcdmigration" &&
        isSelf(dst) &&
        eq(amt, transfer.quantity) &&
        transfer.from === AddressZero
      ) {
        transfer.category = TransferCategories.SwapIn;
        break;
      }
    }

  }
  return transfer;
};

export const assertChrono = (events: Event[]): void => {
  let prevTime = 0;
  for (const event of events) {
    if (!event || !event.date) {
      throw new Error(`Invalid event detected: ${JSON.stringify(event, null, 2)}`);
    }
    const currTime = new Date(event.date).getTime();
    if (currTime < prevTime) {
      throw new Error(`Events out of order: ${event.date} < ${new Date(prevTime).toISOString()}`);
    }
    prevTime = currTime;
  }
};

export const mergeDefaultEvents = (
  events: Event[],
  source: Partial<Event>,
  lastUpdated: number,
): Event[] => {
  if (source && source.date && new Date(source.date).getTime() <= lastUpdated) {
    return events;
  }

  const castDefault = (event: Partial<Event>): Partial<Event> => ({
    prices: {},
    sources: [EventSources.Personal],
    tags: [],
    transfers: [],
    ...event,
  });

  const input = castDefault(source);

  const output = [] as Event[];
  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    if (event.hash && input.hash && event.hash === input.hash) {
      output.push({
        ...event,
        sources: Array.from(new Set([...event.sources, ...input.sources])),
        tags: Array.from(new Set([...event.tags, ...input.tags])),
      });
    } else {
      output.push(event);
    }
  }
  return output;
};

export const mergeFactory = (opts: {
  allowableTimeDiff: number;
  mergeEvents: any;
  shouldMerge: any;
  log: ILogger;
}) =>
  (events: Event[], newEvent: Event): Event[] => {
    const { allowableTimeDiff, mergeEvents, shouldMerge, log } = opts;
    const output = [] as Event[];
    for (let i = 0; i < events.length; i++) {
      const event = events[i];
      if (!event || !event.date) {
        throw new Error(`Trying to merge new event into ${i} ${JSON.stringify(event, null, 2)}`);
      }
      if (newEvent.date) {
        const delta = new Date(newEvent.date).getTime() - new Date(event.date).getTime();
        if (isNaN(delta) || typeof delta !== "number") {
          throw new Error(`Error parsing date delta (${delta}) for new event: ${
            JSON.stringify(newEvent, null, 2)
          } and old event: ${
            JSON.stringify(event, null, 2)
          }`);
        }
        if (delta > allowableTimeDiff) {
          log.debug(`new event came way before event ${i}, moving on`);
          output.push(event);
          continue;
        }
        if (delta < -1 * allowableTimeDiff) {
          log.debug(`new event came way after event ${i}, we're done`);
          output.push(newEvent);
          output.push(...events.slice(i));
          return output;
        }
        log.debug(
          `event ${i} "${event.description}" occured ${delta / 1000}s after "${newEvent.description}"`,
        );
      }

      if (shouldMerge(event, newEvent)) {
        const mergedEvent = mergeEvents(event, newEvent);
        log.info(`Merged "${newEvent.description}" into ${i} "${event.description}"`);
        log.debug(`Yielding: ${JSON.stringify(mergedEvent, null, 2)}`);
        output.push(mergedEvent);
        output.push(...events.slice(i+1));
        return output;
      }
      output.push(event);
    }
    output.push(newEvent);
    return output;
  };

export const mergeOffChainEvents = (event: Event, ocEvent: Event): Event => {
  const transfer = event.transfers[0];
  const ocTransfer = ocEvent.transfers[0];
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
    ...event,
    description: ocEvent.description,
    sources: Array.from(new Set([...event.sources, ...ocEvent.sources])),
    tags: Array.from(new Set([...event.tags, ...ocEvent.tags])),
    transfers: [mergedTransfer],
  };
};

export const shouldMergeOffChain = (event: Event, ocEvent: Event): boolean => {
  const amountsAreClose = (a1: DecimalString, a2: DecimalString): boolean =>
    lt(div(mul(diff(a1, a2), "200"), add([a1, a2])), "1");

  if (
    // assumes the deposit to/withdraw from exchange account doesn't interact w other contracts
    event.transfers.length !== 1 ||
    // only simple off chain sends to the chain
    ocEvent.transfers.length !== 1
  ) {
    return false;
  }
  const transfer = event.transfers[0];
  const ocTransfer = ocEvent.transfers[0];
  if (
    transfer.assetType === ocTransfer.assetType &&
    amountsAreClose(transfer.quantity, ocTransfer.quantity)
  ) {
    return true;
  }
  return false;
};
