import {
  AssetChunk,
  Balances,
  ChunkIndex,
  Event,
  EventTypes,
  HydratedEvent,
} from "@valuemachine/types";
import { add, gt, round } from "@valuemachine/utils";

const { Expense, Income, Trade, Debt, GuardChange } = EventTypes;
const toDate = timestamp => timestamp?.includes("T") ? timestamp.split("T")[0] : timestamp;

const sumChunks = (chunks: Array<AssetChunk | ChunkIndex>) => {
  const totals = {} as Balances;
  if (!chunks?.length) return totals;
  if (typeof chunks[0] === "number") return `${chunks.length} chunks`;
  chunks.forEach(chunk => {
    if (typeof chunk !== "number" && gt(chunk.quantity, "0")) {
      totals[chunk.asset] = add(totals[chunk.asset], chunk.quantity);
    }
  });
  return Object.entries(totals)
    .map(([asset, amount]) => `${round(amount, 4)} ${asset}`)
    .join(" and ");
};

export const describeChunk = (chunk: AssetChunk): string => {
  return `Chunk ${chunk.index}: ${round(chunk.quantity)} ${chunk.asset} held from ${
    toDate(chunk.history[0].date)
  } - ${toDate(chunk.disposeDate) || "present"}`;
};

export const describeEvent = (event: Event | HydratedEvent): string => {
  const date = event.date.split("T")[0];
  if (event.type === Income) {
    const inputs = event.inputs?.length ? sumChunks(event.inputs) : "";
    return `${event.type} of ${inputs} on ${date}`;
  } else if (event.type === Expense) {
    const outputs = event.outputs?.length ? sumChunks(event.outputs) : "";
    return `${event.type} of ${outputs} on ${date}`;
  } else if (event.type === Trade) {
    const inputs = event.inputs?.length ? sumChunks(event.inputs) : "";
    const outputs = event.outputs?.length ? sumChunks(event.outputs) : "";
    return `Traded ${outputs} for ${inputs} on ${date}`;
  } else if (event.type === Debt) {
    const inputs = event.inputs?.length ? sumChunks(event.inputs) : "";
    const outputs = event.outputs?.length ? sumChunks(event.outputs) : "";
    return inputs ? `Borrowed ${inputs} on ${date}` : `Repayed ${outputs} on ${date}`;
  } else if (event.type === GuardChange) {
    const chunks = event.chunks?.length ? sumChunks(event.chunks) : "";
    return `Moved ${chunks} from ${
      event.from.split("/")[0]
    } guard to ${event.to.split("/")[0]} on ${date}`;
  } else {
    return `Unknown event`;
  }
};
