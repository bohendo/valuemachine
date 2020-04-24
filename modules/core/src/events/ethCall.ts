import {
  AddressBook,
  CallData,
  ChainData,
  Event,
  EventSources,
  ILogger,
  TransferCategories,
} from "@finances/types";
import { AddressZero } from "ethers/constants";

import { eq, ContextLogger } from "../utils";

import { categorizeTransfer } from "./categorizeTransfer";
import { assertChrono, mergeFactory } from "./utils";

export const mergeEthCallEvents = (
  oldEvents: Event[],
  addressBook: AddressBook,
  chainData: ChainData,
  lastUpdated: number,
  logger?: ILogger,
): Event[] => {
  const log = new ContextLogger("EthCall", logger);
  let events = JSON.parse(JSON.stringify(oldEvents));

  log.info(`Processing ${chainData.calls.length} ethereum calls..`);

  chainData.calls.sort((call1, call2) => {
    return call1.block - call2.block;
  }).map((call: CallData): any => {
    if (new Date(call.timestamp).getTime() <= lastUpdated) {
      return null;
    }

    // We'll get internal token transfers from ethTx logs instead
    if (call.contractAddress !== AddressZero) {
      return null;
    }

    if (!chainData.transactions || !chainData.transactions.find(tx => tx.hash === call.hash)) {
      throw new Error(`No tx data for call ${call.hash}, did fetching chainData get interrupted?`);
    }

    if (chainData.transactions.find(tx => tx.hash === call.hash).status !== 1) {
      log.debug(`Skipping reverted call`);
      return null;
    }

    const event = {
      date: call.timestamp,
      hash: call.hash,
      sources: [EventSources.EthCall],
      tags: [],
      transfers: [{
        assetType: "ETH",
        category: TransferCategories.Transfer,
        from: call.from.toLowerCase(),
        quantity: call.value,
        to: call.to.toLowerCase(),
      }],
    } as Event;

    event.transfers[0] = categorizeTransfer(event.transfers[0], [], addressBook, logger);

    const { from, quantity, to } = event.transfers[0];
    if (eq(quantity, "0")) {
      return null;
    }
    event.description =
      `${addressBook.getName(from)} sent ${quantity} ETH to ${addressBook.getName(to)} (internal)`;

    log.info(event.description);

    return event;
  }).filter(e => !!e).forEach((txEvent: Event): void => {
    events = mergeFactory({
      allowableTimeDiff: 0,
      log,
      mergeEvents: (event: Event, callEvent: Event): Event => {
        // tx logs and token calls return same data, add this tranfer iff this isn't the case
        event.transfers.push(callEvent.transfers[0]);
        event.sources.push(EventSources.EthCall);
        return event;
      },
      shouldMerge: (event: Event, callEvent: Event): boolean =>
        event.hash === callEvent.hash,
    })(events, txEvent);
  });
  assertChrono(events);

  return events;
};
