import { AddressZero } from "ethers/constants";
import { env } from "../env";
import { CallData, Event } from "../types";
import { eq, Logger } from "../utils";
import { mergeFactory } from "./utils";

export const castEthCall = (addressBook): any =>
  (call: CallData): any => {
    const log = new Logger(`EthCall ${call.hash.substring(0, 10)}`, env.logLevel);
    const { getName, isCategory } = addressBook;

    const assetType = call.contractAddress === AddressZero
      ? "ETH"
      : isCategory(call.contractAddress, "erc20")
        ? getName(call.contractAddress)
        : null;

    if (!assetType) {
      log.debug(`Skipping ${isCategory(call.contractAddress, "erc20")}-supported token: ${call.contractAddress} aka ${getName(call.contractAddress)}`);
      return null;
    }

    const source = assetType === "ETH" ? "ethCall" : "tokenCall";
    const event = {
      date: call.timestamp,
      hash: call.hash,
      sources: [source],
      tags: [],
      transfers: [{
        assetType,
        from: call.from.toLowerCase(),
        quantity: call.value,
        to: call.to.toLowerCase(),
      }],
    } as Event;

    const { quantity, to } = event.transfers[0];
    if (eq(quantity, "0")) {
      return null;
    }
    event.description = `${source} sent ${quantity} ${assetType} to ${addressBook.getName(to)}`;

    log.info(event.description);
    log.debug(`${call.value} ${assetType} transferred to ${call.to}`);

    return event;
  };

export const mergeEthCall = mergeFactory({
  allowableTimeDiff: 0,
  log: new Logger("MergeEthCall", env.logLevel),
  mergeEvents: (event: Event, callEvent: Event): Event => {
    // tx logs and token calls return same data, add this tranfer iff this isn't the case
    if (!event.sources.includes("ethLogs") || !callEvent.sources.includes("tokenCall")) {
      event.transfers.push(callEvent.transfers[0]);
    }
    return event;
  },
  shouldMerge: (event: Event, callEvent: Event): boolean =>
    event.hash === callEvent.hash,
});
