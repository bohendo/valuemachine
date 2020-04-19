import { CallData, Event, EventSources, TransferTags } from "@finances/types";

import { AddressZero } from "ethers/constants";
import { env } from "../env";
import { eq, Logger } from "../utils";
import { mergeFactory, transferTagger } from "./utils";

export const castEthCall = (addressBook, chainData): any =>
  (call: CallData): any => {
    const log = new Logger(
      `EthCall ${call.hash.substring(0, 10)} ${call.timestamp.split("T")[0]}`,
      env.logLevel,
    );

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
        from: call.from.toLowerCase(),
        quantity: call.value,
        tags: [],
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

export const mergeEthCall = mergeFactory({
  allowableTimeDiff: 0,
  log: new Logger("MergeEthCall", env.logLevel),
  mergeEvents: (event: Event, callEvent: Event): Event => {
    // tx logs and token calls return same data, add this tranfer iff this isn't the case
    event.transfers.push(callEvent.transfers[0]);
    event.sources.push(EventSources.EthCall);
    return event;
  },
  shouldMerge: (event: Event, callEvent: Event): boolean =>
    event.hash === callEvent.hash,
});
