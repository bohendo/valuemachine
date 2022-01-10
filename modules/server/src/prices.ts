import express from "express";
import {
  getLogger,
  getPriceFns,
} from "valuemachine";

import { env } from "./env";
import {
  getLogAndSend,
  store,
  STATUS_YOUR_BAD,
} from "./utils";

const log = getLogger(env.logLevel || "warn", "Prices");

const prices = getPriceFns({
  save: val => store.save("Prices", val),
  json: store.load("Prices"),
  logger: log,
});
log.info(`Good morning prices router, we have ${prices.getJson().length} existing prices`);

export const pricesRouter = express.Router();

pricesRouter.post("/:unit/:asset", async (req, res) => {
  const logAndSend = getLogAndSend(res);
  const { asset, unit } = req.params;
  const { dates } = req.body;
  if (!dates.length) {
    log.warn(`No dates for missing ${unit} prices of ${asset} were provided`);
  }
  log.info(`Fetching ${dates.length} missing ${unit} prices of ${asset}`);
  try {
    const pricesJson = await prices.fetchPrices({ [asset]: dates }, unit);
    logAndSend(pricesJson);
  } catch (e) {
    log.error(e.message);
    logAndSend(e.message, STATUS_YOUR_BAD);
  }
});
