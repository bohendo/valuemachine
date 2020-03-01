import { env } from "../env";
import { CallData, Event } from "../types";
import { Logger } from "../utils";
import { getDescription } from "./utils";

export const castEthCall = (addressBook): any =>
  (call: CallData): any => {
    const log = new Logger(`EthCall ${call.hash.substring(0, 10)}`, env.logLevel);
    const { getName, isCategory } = addressBook;

    const assetType = call.contractAddress
      ? isCategory(call.contractAddress, "erc20")
        ? getName(call.contractAddress)
        : null
      : "ETH";

    if (!assetType) {
      log.debug(`Skipping unsupported token: ${call.contractAddress}`);
      return null;
    }

    const event = {
      date: call.timestamp,
      hash: call.hash,
      sources: new Set([assetType === "ETH" ? "ethCall" : "tokenCall"]),
      tags: new Set(),
      transfers: [{
        assetType,
        from: call.from,
        quantity: call.value,
        to: call.to,
      }],
    } as Event;


    event.description = getDescription(event);
    log.info(event.description);
    log.debug(`${call.value} ${assetType} transferred to ${call.to}`);

    return event;
  };

export const mergeEthCall = (events: Event[], callEvent: Event): Event[] => {
  const log = new Logger("MergeWyre", env.logLevel);
  const output = [] as Event[];
  const closeEnough = 15 * 60 * 1000; // 15 minutes
  for (const i = 0; i < events.length; i++) {
    const event = events[i];

    // Are event dates close enough to even consider merging?
    const diff = new Date(callEvent.date).getTime() - new Date(event.date).getTime();
    if (diff > closeEnough) {
      output.push(event);
      continue;
    } else if (diff < (closeEnough * -1)) {
      output.push(callEvent);
      output.push(...events.slice(i));
      return output;
    }
    log.debug(`Found event that happened ${diff / (1000)} seconds before this one.`);

    if (event.hash !== callEvent.hash) {
      if (diff >= 0) {
        output.push(callEvent);
        output.push(...events.slice(i));
      } else {
        output.push(event);
        output.push(callEvent);
        output.push(...events.slice(i + 1));
      }
      return output;
    }

    // tx logs and token calls return same data, add this tranfer iff this isn't the case
    if (!event.sources.has("ethLogs") && !callEvent.sources.has("tokenCall")) {
      event.transfers.push(callEvent.transfers[0]);
    }
    output.push(event, ...events.slice(i+1));
    return output;
  }
  return output;
};
