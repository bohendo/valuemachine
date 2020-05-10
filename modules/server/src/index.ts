import express from "express";
import { verifyMessage } from "ethers/utils";

import { env } from "./env";

const getLogAndSend = (res) => (message): void => {
  console.log(`Sent: ${message}`);
  res.send(message);
  return;
};

const app = express();
app.use(express.json());

app.use("/", (req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.path} ${JSON.stringify(req.body)}`);
  return next();
});

app.post("/profile", (req, res) => {
  const { key, sig } = req.body;
  const logAndSend = getLogAndSend(res);
  if (!key) {
    return logAndSend("An api key must be provided");
  }
  if (!sig) {
    return logAndSend("A signature of the api key must be provided");
  }
  let signer;
  try {
    signer = verifyMessage(key, sig);
  } catch (e) {
    return logAndSend(`Bad signature provided: ${e.message}`);
  }
  return logAndSend(`Looks good ${signer}`);
});

app.use((req, res) => {
  const code = 404;
  console.log(`${code} not found`);
  return res.sendStatus(code);
});

app.listen(env.port, () => {
  console.log(`Server is listening on port ${env.port}`);
});
