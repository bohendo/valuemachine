import { getPrices } from "@valuemachine/core";
import { getLogger } from "@valuemachine/utils";
import express from "express";

import { env } from "./env";
import {
  getLogAndSend,
  store,
  STATUS_YOUR_BAD,
} from "./utils";

const log = getLogger(env.logLevel).child({
  // level: "debug",
  module: "Prices",
});

export const pricesRouter = express.Router();

pricesRouter.get("/:unit/:asset/:date", async (req, res) => {
  const logAndSend = getLogAndSend(res);
  const { asset, date, unit } = req.params;
  log.info(`Got request for ${unit} price of ${asset} on ${date}`);
  const prices = getPrices({ store, logger: log, unit: unit });
  try {
    const price = await prices.syncPrice(date, asset);
    logAndSend(price);
  } catch (e) {
    log.error(e.stack);
    logAndSend(e.message, STATUS_YOUR_BAD);
  }
});

pricesRouter.post("/:unit", async (req, res) => {
  const logAndSend = getLogAndSend(res);
  const { unit } = req.params;
  const { transaction } = req.body;
  log.info(`Got request for ${unit} prices for transaction on ${transaction.date}`);
  const prices = getPrices({ store, logger: log, unit: unit });
  try {
    const priceList = await prices.syncTransaction(transaction);
    logAndSend(priceList);
  } catch (e) {
    log.error(e.stack);
    logAndSend(e.message, STATUS_YOUR_BAD);
  }
});
