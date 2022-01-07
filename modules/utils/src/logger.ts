import pino from "pino";

const prettyPrint = {
  colorize: true,
  ignore: "pid,hostname",
  translateTime: true,
};

export const getLogger = (level = "warn", name?: string): pino.Logger => name
  ? pino({ level, name, prettyPrint })
  : pino({ level, prettyPrint });
