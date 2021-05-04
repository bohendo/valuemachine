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
