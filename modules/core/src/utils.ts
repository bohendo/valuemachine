import { AssetChunk, ChunkIndex, Event, EventTypes, HydratedEvent } from "@valuemachine/types";
import { round } from "@valuemachine/utils";

const { Expense, Income /*, Trade, Debt, Jurisdiction */ } = EventTypes;
const toDate = timestamp => timestamp?.includes("T") ? timestamp.split("T")[0] : timestamp;

const sumChunks = (chunks: Array<AssetChunk | ChunkIndex>) => {
  return typeof chunks[0] === "number"
    ? `${chunks.length} chunks`
    : `${round(chunks[0].quantity)} ${chunks[0].asset}`;
};

export const describeChunk = (chunk: AssetChunk): string => {
  return `Chunk ${chunk.index}: ${round(chunk.quantity)} ${chunk.asset} held from ${
    toDate(chunk.receiveDate)
  } - ${toDate(chunk.disposeDate) || "present"}`;
};

export const describeEvent = (event: Event | HydratedEvent): string =>
  event.type === Expense ? `${event.type} of ${sumChunks(event.outputs)} on ${event.date}`
  : event.type === Income ? `${event.type} of ${sumChunks(event.inputs)} on ${event.date}`
  : `${event.type} event on ${event.date}`;
