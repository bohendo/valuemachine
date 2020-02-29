import { Event } from "../types";
import { addAssets, Logger, round } from "../utils";

export const getCategory = (event: Event, log: Logger): string => {
  if (event.assetsIn.length === 0 && event.assetsOut.length === 0) {
    return "null";
  } else if (event.assetsIn.length !== 0 && event.assetsOut.length === 0) {
    return event.tags.includes("cdp")
      ? "borrow"
      : event.tags.includes("defi")
        ? "withdrawal"
        : "income";
  } else if (event.assetsIn.length === 0 && event.assetsOut.length !== 0) {
    return event.tags.includes("cdp")
      ? "repayment"
      : event.tags.includes("defi")
        ? "deposit"
        : "expense";
  } else if (event.assetsIn.length !== 0 && event.assetsOut.length !== 0) {
    return "swap";
  }
  log.info(`Idk how to get description for: ${JSON.stringify(event)}`);
  return "idk";
};

export const getDescription = (event: Event, log: Logger): string => {
  const assetsIn = addAssets(event.assetsIn).map(a => `${round(a.amount)} ${a.type}`).join(", ");
  const assetsOut = addAssets(event.assetsOut).map(a => `${round(a.amount)} ${a.type}`).join(", ");
  if (event.assetsIn.length === 0 && event.assetsOut.length === 0) {
    return "null";
  } else if (event.assetsIn.length !== 0 && event.assetsOut.length === 0) {
    return event.tags.includes("cdp")
      ? `${event.category} of ${assetsIn} from CDP`
      : `${event.category} of ${assetsIn} from ${event.from}`;
  } else if (event.assetsIn.length === 0 && event.assetsOut.length !== 0) {
    return event.tags.includes("cdp")
      ? `${event.category} of ${assetsOut} to CDP`
      : `${event.category} of ${assetsOut} to ${event.to}`;
  } else if (event.assetsIn.length !== 0 && event.assetsOut.length !== 0) {
    return `${event.category} of ${assetsOut} for ${assetsIn}`;
  }
  log.info(`Idk how to get description for: ${JSON.stringify(event)}`);
  return "idk";
};
