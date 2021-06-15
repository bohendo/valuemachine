import { getLogger } from "@valuemachine/utils";
import express from "express";

import { env } from "./env";

const log = getLogger(env.logLevel).child({ module: "AuthRouter" });

export const authRouter = express.Router();

const authHeaderKey = "authorization";
const authType = "Basic";

const restrictedMethods = ["DELETE", "POST", "PUT"];
const restrictedPaths = [
  "/auth",
  "/chaindata",
  "/prices",
  "/transactions",
];

authRouter.use((req, res, next) => {
  if (restrictedPaths.some(p => req.path.startsWith(p)) || restrictedMethods.includes(req.method)) {
    const authHeader = req.headers[authHeaderKey];
    const authToken = Buffer.from(authHeader?.split?.(" ")?.[1] || [], "base64").toString("utf8");
    const username = authToken?.split(":")?.[0];
    const password = authToken?.split(":")?.[1];
    if (!password || password !== env.adminToken) {
      if (req.path === "/auth") {
        res.removeHeader("www-authenticate"); // prevents browser from popping up a login window.
      } else {
        res.setHeader("www-authenticate", authType);
      }
      // Log a description re why auth failed
      const prefix = `Failed to auth ${req.method} to ${req.path}`;
      if (!authHeader) {
        log.warn(`${prefix}, no ${authHeaderKey} header provided.`);
      } else if (!authHeader.includes(" ")) {
        log.warn(`${prefix}, invalid auth header format. Got: "${authHeader}"`);
      } else if (!authHeader.startsWith(`${authType} `)) {
        log.warn(`${prefix}, invalid auth type. Got ${authHeader.split(" ")[0]} (!== ${authType})`);
      } else {
        const givenToken = Buffer.from(authHeader.split(" ")[1]!, "base64").toString("utf8");
        if (!givenToken || !givenToken.includes(":")) {
          log.warn(`${prefix}, invalid token format. Got: "${givenToken}"`);
        } else {
          const givenPassword = givenToken.split(":")[1];
          if (env.adminToken !== givenPassword)  {
            log.warn(`${prefix}, invalid password. Got: ${givenPassword} (!= ${env.adminToken})`);
          } else {
            log.warn(`${prefix}, unknown error verifying token: ${givenToken}`);
          }
        }
      }
      res.status(401).send("Unauthorized");
    } else if (
      !username || username.length < 1 || username.length > 32 ||
      username.match(/[^a-zA-Z0-9_-]/)
    ) {
      log.warn(`Invalid username: "${username}"`);
      res.status(401).send("Unauthorized");
    } else {
      const username = Buffer.from(
        authHeader?.split?.(" ")?.[1] || [],
        "base64",
      ).toString("utf8").split(":")?.[0];
      req.username = username;
      log.debug(`Successfully authenticated ${username} for a ${req.method} to ${req.path}`);
      next();
    }
  } else {
    log.debug(`Authentication not required for ${req.method} to ${req.path}`);
    next();
  }
});
