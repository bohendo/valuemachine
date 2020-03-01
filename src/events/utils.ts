import { DecimalString, Event } from "../types";
import {
  add,
  diff,
  div,
  Logger,
  lt,
  mul,
} from "../utils";

export const amountsAreClose = (a1: DecimalString, a2: DecimalString): boolean =>
  lt(div(mul(diff(a1, a2), "200"), add([a1, a2])), "1");

export const mergeFactory = (opts: {
  allowableTimeDiff: number;
  mergeEvents: any;
  shouldMerge: any;
  log?: Logger;
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
          log && log.debug(`new event came way before event ${i}, moving on`);
          output.push(event);
          continue;
        }
        if (delta < -1 * allowableTimeDiff) {
          log && log.debug(`new event came way after event ${i}, we're done`);
          output.push(newEvent);
          output.push(...events.slice(i));
          return output;
        }
        log && log.info(
          `event ${i} "${event.description}" occured ${delta / 1000}s after "${newEvent.description}"`,
        );
      }

      if (shouldMerge(event, newEvent)) {
        const mergedEvent = mergeEvents(event, newEvent);
        log && log.info(`Merged "${newEvent.description}" into ${i} "${event.description}" yielding: ${
          JSON.stringify(mergedEvent, null, 2)
        }`);
        output.push(mergedEvent);
        output.push(...events.slice(i+1));
        return output;
      }
      output.push(event);
    }
    output.push(newEvent);
    return output;
  };
