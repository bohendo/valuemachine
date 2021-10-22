import { fillForm, fillReturn } from "@valuemachine/taxes";
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

taxesRouter.post("/", async (req, res) => {
  const logAndSend = getLogAndSend(res);
  const forms = req.body?.forms;
  log.info(`Building ${Object.keys(forms || {}).length} forms`);
  if (!forms) {
    return logAndSend("No forms was provided", STATUS_YOUR_BAD);
  }
  try {
    const path = await fillReturn(forms, pdf);
    return res.download(path, "tax-return.pdf");
  } catch (e) {
    return logAndSend(e.message, STATUS_MY_BAD);
  }
});

taxesRouter.post("/:form", async (req, res) => {
  const logAndSend = getLogAndSend(res);
  const { form } = req.params;
  const { data } = req.body;
  log.info(`Building ${form}`);
  if (!data) {
    return logAndSend(`No ${form} data was provided`, STATUS_YOUR_BAD);
  }
  try {
    const path = await fillForm(form, data, pdf);
    return res.download(path, `${form}.pdf`);
  } catch (e) {
    return logAndSend(e.message, STATUS_MY_BAD);
  }
});
