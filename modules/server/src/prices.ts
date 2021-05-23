import { getPrices } from "@finances/core";
import { getLogger } from "@finances/utils";
import express from "express";

import { env } from "./env";
import {
  getLogAndSend,
  globalStore,
  STATUS_YOUR_BAD,
} from "./utils";

const log = getLogger(env.logLevel).child({ level: "debug", module: "Prices" });

export const pricesRouter = express.Router();

pricesRouter.get("/:uoa/:asset/:date", async (req, res) => {
  const logAndSend = getLogAndSend(res);
  const { asset, date, uoa } = req.params;
  const prices = getPrices({ store: globalStore, logger: log, unitOfAccount: uoa });
  try {
    const price = await prices.syncPrice(date, asset);
    logAndSend(price);
  } catch (e) {
    logAndSend(e.message, STATUS_YOUR_BAD);
  }
});

pricesRouter.post("/:uoa", async (req, res) => {
  const logAndSend = getLogAndSend(res);
  const { uoa } = req.params;
  const { transaction } = req.body;
  const prices = getPrices({ store: globalStore, logger: log, unitOfAccount: uoa });
  try {
    const priceList = await prices.syncTransaction(transaction);
    logAndSend(priceList);
  } catch (e) {
    logAndSend(e.message, STATUS_YOUR_BAD);
  }
});
