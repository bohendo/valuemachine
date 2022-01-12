import pino from "pino";

export const getLogger = (level = "warn", name?: string): pino.Logger =>
  name ? pino({ level, name }) : pino({ level });
