import { getPrices } from "@finances/core";
import { getLogger } from "@finances/utils";
import express from "express";

import { env } from "./env";
import {
  getLogAndSend,
  globalStore,
  STATUS_MY_BAD,
} from "./utils";

const log = getLogger(env.logLevel).child({ module: "Prices" });
export const prices = getPrices({ store: globalStore, logger: log });

export const pricesRouter = express.Router();

pricesRouter.get("/:date/:asset", async (req, res) => {
  const logAndSend = getLogAndSend(res);
  const { date, asset } = req.params;
  try {
    const price = await prices.syncPrice(date, asset);
    logAndSend(price);
  } catch (e) {
    logAndSend(e.message, STATUS_MY_BAD);
  }
});
