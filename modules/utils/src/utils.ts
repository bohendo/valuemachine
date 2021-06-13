import pino from "pino";
import prettifier from "pino-pretty";

export const sm = (str: string): string =>
  str.toLowerCase();

export const smeq = (str1: string, str2: string): boolean =>
  sm(str1) === sm(str2);

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
