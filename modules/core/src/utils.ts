import {
  Balances,
  Value,
} from "@valuemachine/types";
import {
  ajv,
  formatErrors,
  math,
  sumValue,
} from "@valuemachine/utils";

import {
  AssetChunk,
  ChunkIndex,
  Event,
  EventTypes,
  HydratedEvent,
  ValueMachineJson,
} from "./types";

const { Expense, Income, Trade, Debt, GuardChange, Error } = EventTypes;
const toDate = timestamp => timestamp?.includes("T") ? timestamp.split("T")[0] : timestamp;

export const getEmptyValueMachine = (): ValueMachineJson => ({
  chunks: [],
  date: (new Date(0)).toISOString(),
  events: [],
});

const validateValueMachine = ajv.compile(ValueMachineJson);
export const getValueMachineError = (vmJson: ValueMachineJson): string => {
  if (!validateValueMachine(vmJson)) {
    return validateValueMachine.errors.length
      ? formatErrors(validateValueMachine.errors)
      : `Invalid ValueMachine`;
  }
  // Enforce that chunk & event index properties match their index in the array

  const eventIndexErrors = vmJson.events.map((event, index) =>
    event.index !== index ? `Invalid event index, expected ${index} but got ${event.index}` : ""
  ).filter(e => !!e);
  if (eventIndexErrors.length) {
    return eventIndexErrors.length < 3
      ? eventIndexErrors.join(", ")
      : `${eventIndexErrors[0]} (plus ${eventIndexErrors.length - 1} more index errors)`;
  }

  const chunkIndexErrors = vmJson.chunks.map((chunk, index) =>
    chunk.index !== index ? `Invalid chunk index, expected ${index} but got ${chunk.index}` : ""
  ).filter(e => !!e);
  if (chunkIndexErrors.length) {
    return chunkIndexErrors.length < 3
      ? chunkIndexErrors.join(", ")
      : `${chunkIndexErrors[0]} (plus ${chunkIndexErrors.length - 1} more index errors)`;
  }

  return "";
};

export const sumChunks = (chunks: AssetChunk[]): Balances => sumValue(chunks as Value[]);

export const mergeBalances = (balancesList: Balances[]): Balances =>
  balancesList.reduce((total, bal) => {
    Object.entries(bal).forEach(entry => { total[entry[0]] = entry[1]; });
    return total;
  }, {} as Balances);

export const describeChunk = (chunk: AssetChunk): string => {
  return `${math.round(chunk.amount)} ${chunk.asset} held from ${
    toDate(chunk.history?.[0]?.date || "???")
  } - ${toDate(chunk.disposeDate) || "present"}`;
};

export const describeEvent = (event: Event | HydratedEvent): string => {
  const describeChunks = (chunks: Array<AssetChunk | ChunkIndex>): string =>
    typeof chunks[0] === "number"
      ? `${chunks.length} chunks`
      : Object.entries(sumChunks(
        chunks.filter(c => math.gt((c as AssetChunk).amount, "0")) as AssetChunk[]
      )).map(([asset, amount]) => `${math.round(amount)} ${asset}`)
        .join(" and ");
  const date = event.date.split("T")[0];
  if (event.type === Income) {
    const inputs = event.inputs?.length ? describeChunks(event.inputs) : "";
    return `${event.type} of ${inputs} on ${date}`;
  } else if (event.type === Expense) {
    const outputs = event.outputs?.length ? describeChunks(event.outputs) : "";
    return `${event.type} of ${outputs} on ${date}`;
  } else if (event.type === Trade) {
    const inputs = event.inputs?.length ? describeChunks(event.inputs) : "";
    const outputs = event.outputs?.length ? describeChunks(event.outputs) : "";
    return `Traded ${outputs} for ${inputs} on ${date}`;
  } else if (event.type === Debt) {
    const inputs = event.inputs?.length ? describeChunks(event.inputs) : "";
    const outputs = event.outputs?.length ? describeChunks(event.outputs) : "";
    return inputs ? `Borrowed ${inputs} on ${date}` : `Repayed ${outputs} on ${date}`;
  } else if (event.type === GuardChange) {
    const chunks = event.chunks?.length ? describeChunks(event.chunks) : "";
    return `Moved ${chunks} from ${
      event.from.split("/")[0]
    } to ${event.to.split("/")[0]} on ${date}`;
  } else if (event.type === Error) {
    return `${event.code}: ${event.message}`;
  } else {
    return `Unknown event`;
  }
};
