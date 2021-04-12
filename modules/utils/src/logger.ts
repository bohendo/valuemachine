import pino from "pino";
import prettifier from "pino-pretty";

export const getLogger = (level = "info"): pino.Logger => pino({
  level,
  prettyPrint: {
    colorize: true,
    ignore: "pid,hostname,module",
    messageFormat: `[{module}] {msg}`,
    translateTime: true,
  },
  prettifier,
});
