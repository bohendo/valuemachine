import {
  AssetChunk,
  ChunkIndex,
  Event,
  EventTypes,
  HydratedEvent,
} from "@valuemachine/types";
import { round, sumChunks } from "@valuemachine/utils";

const { Expense, Income, Trade, Debt, GuardChange, Error } = EventTypes;
const toDate = timestamp => timestamp?.includes("T") ? timestamp.split("T")[0] : timestamp;

export const describeChunk = (chunk: AssetChunk): string => {
  return `${round(chunk.amount)} ${chunk.asset} held from ${
    toDate(chunk.history?.[0]?.date || "???")
  } - ${toDate(chunk.disposeDate) || "present"}`;
};

export const describeEvent = (event: Event | HydratedEvent): string => {
  const describeChunks = (chunks: Array<AssetChunk | ChunkIndex>): string =>
    typeof chunks[0] === "number"
      ? `${chunks.length} chunks`
      : Object.entries(sumChunks(chunks as AssetChunk[]))
        .map(([asset, amount]) => `${round(amount)} ${asset}`)
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
