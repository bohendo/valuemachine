import {
  CallData,
  ChainData,
  Event,
  EventSources,
  TransferCategories,
} from "@finances/types";

import { AddressZero } from "ethers/constants";
import { AddressBook, ILogger } from "../types";
import { eq, Logger } from "../utils";
import { assertChrono, mergeFactory, transferTagger } from "./utils";

const castEthCall = (addressBook: AddressBook, chainData: ChainData, log: ILogger): any =>
  (call: CallData): any => {

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

    event.transfers[0] = transferTagger(event.transfers[0], [], addressBook);

    const { from, quantity, to } = event.transfers[0];
    if (eq(quantity, "0")) {
      return null;
    }
    event.description =
      `${addressBook.getName(from)} sent ${quantity} ETH to ${addressBook.getName(to)} (internal)`;

    log.info(event.description);

    return event;
  };

export const mergeEthCallEvents = (
  oldEvents: Event[],
  addressBook: AddressBook,
  chainData: ChainData,
  logger?: ILogger,
): Event[] => {
  const log = new Logger("EthCall", logger);
  let events = JSON.parse(JSON.stringify(oldEvents));

  const latestCachedEvent = events.length !== 0
    ? new Date(events[events.length - 1].date).getTime()
    : 0;

  // returns true if new
  const onlyNew = (data: any): boolean =>
    new Date(data.timestamp || data.date).getTime() - latestCachedEvent > 0;

  const mergeEthCall = mergeFactory({
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
  });

  const newEthCalls = chainData.transactions.filter(onlyNew);
  log.info(`Processing ${newEthCalls.length} new ethereum transactions..`);
  newEthCalls
    .sort((tx1, tx2) => parseFloat(`${tx1.block}.${tx1.index}`) - parseFloat(`${tx2.block}.${tx2.index}`))
    .map(castEthCall(addressBook, chainData, log))
    .forEach((txEvent: Event): void => { events = mergeEthCall(events, txEvent); });
  assertChrono(events);

  return events;
};
