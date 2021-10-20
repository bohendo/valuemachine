import { getLogger } from "@valuemachine/utils";
import express from "express";

import { env } from "./env";
import { ethereumRouter } from "./ethereum";
import { polygonRouter } from "./polygon";
import { pricesRouter } from "./prices";
import { taxesRouter } from "./taxes";
import { getLogAndSend, STATUS_NOT_FOUND } from "./utils";

const log = getLogger(env.logLevel).child({ module: "Entry" });

log.info(`Starting server in env: ${JSON.stringify(env, null, 2)}`);

const app = express();

app.use((req, res, next) => {
  const query = req.query && Object.keys(req.query).length > 0
    ? `?${Object.entries(req.query).map(([key, val]) => `${key}=${val}`).join("&")}`
    : "";
  log.info(`=> ${req.method} ${req.path}${query}`);
  next();
});

app.use(express.json({ limit: "10mb" }));

app.use("/prices", pricesRouter);
app.use("/ethereum", ethereumRouter);
app.use("/polygon", polygonRouter);
app.use("/taxes", taxesRouter);

app.use((req, res) => {
  return getLogAndSend(res)(`${req.path} not found`, STATUS_NOT_FOUND);
});

app.listen(env.port, () => {
  log.info(`Server is listening on port ${env.port}`);
});
