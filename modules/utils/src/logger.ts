import pino from "pino";

const prettyPrint = {
  colorize: true,
  ignore: "pid,hostname,module",
  messageFormat: `[{module}] {msg}`,
  translateTime: true,
};

export const getLogger = (level = "warn", module?: string): pino.Logger => module
  ? pino({ level, prettyPrint }).child({ module })
  : pino({ level, prettyPrint });
