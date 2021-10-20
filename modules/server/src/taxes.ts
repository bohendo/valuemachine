import { execSync } from "child_process";
import fs from "fs";

import { buildF1040, buildF8949 } from "@valuemachine/taxes";
import express from "express";

import {
  getLogAndSend,
  log as logger,
  STATUS_MY_BAD,
  STATUS_YOUR_BAD,
} from "./utils";

const log = logger.child({ module: "Taxes" });

export const taxesRouter = express.Router();

taxesRouter.post("/f1040", async (req, res) => {
  log.info(`Building f1040`);
  const logAndSend = getLogAndSend(res);
  const formData = req.body?.formData;
  if (!formData) {
    return logAndSend("No formData was provided", STATUS_YOUR_BAD);
  }
  log.info(formData, `Got f1040 data`);
  try {
    const f1040Path = await buildF1040(formData, fs, execSync);
    log.info(`Built f1040 form is at path: ${f1040Path}`);
    return res.download(f1040Path, "f1040.pdf");
  } catch (e) {
    return logAndSend(e.message, STATUS_MY_BAD);
  }
});

taxesRouter.post("/f8949", async (req, res) => {
  const logAndSend = getLogAndSend(res);
  if (!req.body?.trades?.length) {
    return logAndSend("No trades were provided", STATUS_YOUR_BAD);
  }
  try {
    const f8949Path = await buildF8949(req.body.trades, fs, execSync);
    return res.download(f8949Path, "f8949.pdf");
  } catch (e) {
    return logAndSend(e.message, STATUS_MY_BAD);
  }
});
