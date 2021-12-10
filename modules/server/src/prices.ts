import express from "express";
import {
  getLogger,
  getPriceFns,
  getValueMachine,
} from "valuemachine";

import { env } from "./env";
import {
  getLogAndSend,
  store,
  STATUS_YOUR_BAD,
} from "./utils";

const log = getLogger(env.logLevel || "warn", "Prices");

const prices = getPriceFns({
  save: val => store.save("Prices" as any, val),
  logger: log,
});

export const pricesRouter = express.Router();

pricesRouter.post("/:unit", async (req, res) => {
  const logAndSend = getLogAndSend(res);
  const { unit } = req.params;
  const { vmJson } = req.body;
  const vm = getValueMachine({ json: vmJson });
  log.info(`Getting ${unit} prices for ${vm?.json?.chunks?.length} chunks`);
  try {
    const pricesJson = await prices.syncPrices(vm, unit);
    logAndSend(pricesJson);
  } catch (e) {
    log.error(e.message);
    logAndSend(e.message, STATUS_YOUR_BAD);
  }
});
