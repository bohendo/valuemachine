import { getPrices } from "@finances/core";
import { getLogger } from "@finances/utils";
import express from "express";

import { env } from "./env";
import {
  getLogAndSend,
  globalStore,
  STATUS_YOUR_BAD,
} from "./utils";

const log = getLogger(env.logLevel).child({ module: "Prices" });
export const prices = getPrices({ store: globalStore, logger: log });

export const pricesRouter = express.Router();

pricesRouter.get("/:asset/:date", async (req, res) => {
  const logAndSend = getLogAndSend(res);
  const { asset, date } = req.params;
  try {
    const price = await prices.syncPrice(date, asset);
    logAndSend(price);
  } catch (e) {
    logAndSend(e.message, STATUS_YOUR_BAD);
  }
});
