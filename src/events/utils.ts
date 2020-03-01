import { env } from "../env";
import { Event } from "../types";
import {
  add,
  addAssets,
  diff,
  div,
  Logger,
  lt,
  mul,
  round,
} from "../utils";

export const amountsAreClose = (a1: DecimalString, a2: DecimalString): boolean =>
  lt(div(mul(diff(a1, a2), "200"), add([a1, a2])), "1");

const getCategory = (event: Event): string => {
  if (event.assetsIn.length === 0 && event.assetsOut.length === 0) {
    return "null";
  } else if (event.assetsIn.length !== 0 && event.assetsOut.length === 0) {
    return event.tags.has("cdp")
      ? "borrow"
      : event.tags.has("defi")
        ? "withdrawal"
        : "income";
  } else if (event.assetsIn.length === 0 && event.assetsOut.length !== 0) {
    return event.tags.has("cdp")
      ? "repayment"
      : event.tags.has("defi")
        ? "deposit"
        : "expense";
  } else if (event.assetsIn.length !== 0 && event.assetsOut.length !== 0) {
    return "swap";
  }
  new Logger("getCategory", env.logLevel)
    .info(`Idk how to get description for: ${JSON.stringify(event)}`);
  return "idk";
};

export const getDescription = (event: Event): string => {
  const assetsIn = addAssets(event.assetsIn).map(a => `${round(a.quantity)} ${a.assetType}`).join(", ");
  const assetsOut = addAssets(event.assetsOut).map(a => `${round(a.quantity)} ${a.assetType}`).join(", ");
  const category = getCategory(event);
  if (event.assetsIn.length === 0 && event.assetsOut.length === 0) {
    return "null";
  } else if (event.assetsIn.length !== 0 && event.assetsOut.length === 0) {
    return event.tags.has("cdp")
      ? `${category} of ${assetsIn} from CDP`
      : `${category} of ${assetsIn} from ${event.from}`;
  } else if (event.assetsIn.length === 0 && event.assetsOut.length !== 0) {
    return event.tags.has("cdp")
      ? `${category} of ${assetsOut} to CDP`
      : `${category} of ${assetsOut} to ${event.to}`;
  } else if (event.assetsIn.length !== 0 && event.assetsOut.length !== 0) {
    return `${category} of ${assetsOut} for ${assetsIn}`;
  }
  new Logger("getDescription", env.logLevel)
    .info(`Idk how to get description for: ${JSON.stringify(event)}`);
  return "idk";
};
