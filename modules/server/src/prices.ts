import { getPrices } from "@valuemachine/core";
import { getLogger } from "@valuemachine/utils";
import express from "express";

import { env } from "./env";
import {
  getLogAndSend,
  store,
  STATUS_YOUR_BAD,
} from "./utils";

const log = getLogger(env.logLevel).child({ module: "Prices",
  // level: "debug",
});

export const pricesRouter = express.Router();

pricesRouter.post("/chunks/:unit", async (req, res) => {
  const logAndSend = getLogAndSend(res);
  const { unit } = req.params;
  const { chunks } = req.body;
  log.info(`Got request for ${unit} prices for ${chunks.length} chunks`);
  const prices = getPrices({ store, logger: log, unit: unit });
  try {
    const pricesJson = await prices.syncChunks(chunks);
    logAndSend(pricesJson);
  } catch (e) {
    log.error(e.stack);
    logAndSend(e.message, STATUS_YOUR_BAD);
  }
});
