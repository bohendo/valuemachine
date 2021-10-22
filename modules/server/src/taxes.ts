import { fillForm } from "@valuemachine/taxes";
import * as pdf from "pdffiller";
import express from "express";

import {
  getLogAndSend,
  log as logger,
  STATUS_MY_BAD,
  STATUS_YOUR_BAD,
} from "./utils";

const log = logger.child({ module: "Taxes" });

export const taxesRouter = express.Router();

taxesRouter.post("/:form", async (req, res) => {
  const { form } = req.params;
  log.info(`Building ${form}`);
  const logAndSend = getLogAndSend(res);
  const formData = req.body?.formData;
  if (!formData) {
    return logAndSend("No formData was provided", STATUS_YOUR_BAD);
  }
  try {
    const f1040Path = await fillForm(form, formData, pdf);
    return res.download(f1040Path, "f1040.pdf");
  } catch (e) {
    return logAndSend(e.message, STATUS_MY_BAD);
  }
});
