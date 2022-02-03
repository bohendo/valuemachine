import fs from "fs";
import { execFile } from "child_process";

import express from "express";
import { fillReturn } from "valuemachine";

import {
  getLogAndSend,
  log as logger,
  STATUS_MY_BAD,
  STATUS_YOUR_BAD,
} from "./utils";

const log = logger.child({ name: "Taxes" });

export const taxesRouter = express.Router();

taxesRouter.post("/:taxYear", async (req, res) => {
  const logAndSend = getLogAndSend(res);
  const { taxYear } = req.params;
  const { forms } = req.body;
  log.info(`Building ${Object.keys(forms || {}).length} forms for ${taxYear} return`);
  if (!Object.keys(forms || {}).length) {
    return logAndSend("No forms were provided", STATUS_YOUR_BAD);
  }
  try {
    const path = await fillReturn(taxYear, forms, process.cwd(), { fs, execFile }, log);
    return res.download(path, "tax-return.pdf");
  } catch (e) {
    return logAndSend(e.message, STATUS_MY_BAD);
  }
});
