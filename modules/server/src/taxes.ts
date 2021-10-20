import { execSync } from "child_process";
import fs from "fs";

import { buildF8949 } from "@valuemachine/taxes";
import express from "express";

import {
  getLogAndSend,
  STATUS_MY_BAD,
  STATUS_YOUR_BAD,
} from "./utils";

export const taxesRouter = express.Router();
taxesRouter.post("/f8949", async (req, res) => {
  const logAndSend = getLogAndSend(res);
  if (!req.body?.trades?.length) {
    return logAndSend("No trades were provided", STATUS_YOUR_BAD);
  }
  try {
    const f8949Path = await buildF8949(req.body.trades, fs, execSync);
    return res.download(f8949Path, "f8949.pdf"); // empty form
  } catch (e) {
    return logAndSend(e.message, STATUS_MY_BAD);
  }
});
