import pino from "pino";

export const getLogger = (level = "warn", module?: string): pino.Logger => pino({
  level,
  options: {
    module,
  },
  prettyPrint: {
    colorize: true,
    ignore: "pid,hostname,module",
    messageFormat: `[{module}] {msg}`,
    translateTime: true,
  },
});
