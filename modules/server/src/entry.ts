import { getLogger } from "@valuemachine/utils";
import express from "express";

import { authRouter } from "./auth";
import { env } from "./env";
import { pricesRouter } from "./prices";
import { ethereumRouter } from "./ethereum";
import { polygonRouter } from "./polygon";
import { getLogAndSend, STATUS_NOT_FOUND } from "./utils";

const log = getLogger(env.logLevel).child({ module: "Entry" });

log.info(`Starting server in env: ${JSON.stringify(env, null, 2)}`);

const app = express();

app.use(authRouter);
app.get("/auth", (req, res) => { res.send("Success"); });

app.use(express.json({ limit: "10mb" }));

app.use("/prices", pricesRouter);
app.use("/ethereum", ethereumRouter);
app.use("/polygon", polygonRouter);

app.use((req, res) => {
  return getLogAndSend(res)(`not found`, STATUS_NOT_FOUND);
});

app.listen(env.port, () => {
  log.info(`Server is listening on port ${env.port}`);
});
