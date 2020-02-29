import {
  Event,
  InputData,
  Log,
  State,
} from "./types";
import { add, eq, gt, Logger, lt, mul, round, sub } from "./utils";

const stringifyState = (state: State): string => {
  let output = "[\n";
  for (const [key, value] of Object.entries(state)) {
    let total = "0";
    output += `  ${key}:`;
    for (const chunk of value as any) {
      output += ` ${chunk.amount}@${chunk.price},`;
      total = add([total, chunk.amount]);
    }
    output += ` (Total: ${total})\n`;
  }
  return `${output}]`;
};

export const getValueMachine = (input: InputData) =>
  (event: Event, oldState?: State): [State, Log] => {
    const log = new Logger("ValueMachine", input.logLevel);
    const state = JSON.parse(JSON.stringify(oldState || initialState));
    const logs = [];
    log.info(`Parsing state: `);
    return [newState, logs];
  };
