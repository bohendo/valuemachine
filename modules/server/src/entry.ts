import { getLogger } from "@valuemachine/core";
import express from "express";

import { authRouter } from "./auth";
import { chainDataRouter } from "./chaindata";
import { env } from "./env";
import { pricesRouter } from "./prices";
import { transactionsRouter } from "./transactions";
import { getLogAndSend, STATUS_NOT_FOUND } from "./utils";

const log = getLogger(env.logLevel).child({ module: "Entry" });

log.info(`Starting server in env: ${JSON.stringify(env, null, 2)}`);


////////////////////////////////////////
// Helper Functions

////////////////////////////////////////
// First, authenticate

const app = express();

app.use(authRouter);

app.get("/auth", (req, res) => { res.send("Success"); });

app.use(express.json());

////////////////////////////////////////
// Second, take requested action

app.use("/chaindata", chainDataRouter);
app.use("/prices", pricesRouter);
app.use("/transactions", transactionsRouter);

////////////////////////////////////////
// End of pipeline

app.use((req, res) => {
  return getLogAndSend(res)(`not found`, STATUS_NOT_FOUND);
});

app.listen(env.port, () => {
  log.info(`Server is listening on port ${env.port}`);
});
