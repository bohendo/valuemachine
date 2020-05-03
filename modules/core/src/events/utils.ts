import {
  DecimalString,
  Event,
  EventSources,
  ILogger,
} from "@finances/types";
import { math } from "@finances/utils";

const { add, diff, div, lt, mul } = math;

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
    lt(div(mul(diff(a1, a2), "200"), add(a1, a2)), "1");

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
