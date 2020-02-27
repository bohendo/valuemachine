import { Event } from "../types";
import { addAssets, Logger, round } from "../utils";

export const getCategory = (event: Event, log: Logger): string => {
  if (event.assetsIn.length === 0 && event.assetsOut.length === 0) {
    return "null";
  } else if (event.assetsIn.length !== 0 && event.assetsOut.length === 0) {
    return event.tags.includes("cdp") ? "borrow" : "income";
  } else if (event.assetsIn.length === 0 && event.assetsOut.length !== 0) {
    return event.tags.includes("cdp") ? "repayment" : "expense";
  } else if (event.assetsIn.length !== 0 && event.assetsOut.length !== 0) {
    return "swap";
  }
  log.info(`Idk how to get description for: ${JSON.stringify(event)}`);
  return "idk";
};

export const getDescription = (event: Event, log: Logger): string => {
  const income = addAssets(event.assetsIn).map(a => `${round(a.amount)} ${a.type}`).join(", ");
  const expense = addAssets(event.assetsOut).map(a => `${round(a.amount)} ${a.type}`).join(", ");
  if (event.assetsIn.length === 0 && event.assetsOut.length === 0) {
    return "null";
  } else if (event.assetsIn.length !== 0 && event.assetsOut.length === 0) {
    return `${event.category} of ${income} from ${event.from}`;
  } else if (event.assetsIn.length === 0 && event.assetsOut.length !== 0) {
    return `${event.category} of ${expense} to ${event.to}`;
  } else if (event.assetsIn.length !== 0 && event.assetsOut.length !== 0) {
    return `${event.category} of ${expense} for ${income}`;
  }
  log.info(`Idk how to get description for: ${JSON.stringify(event)}`);
  return "idk";
};
