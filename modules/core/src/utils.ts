import { AssetChunk } from "@valuemachine/types";
import { round } from "@valuemachine/utils";

const toDate = timestamp => timestamp?.includes("T") ? timestamp.split("T")[0] : timestamp;

export const describeChunk = (chunk: AssetChunk): string => {
  return `Chunk ${chunk.index}: ${round(chunk.quantity)} ${chunk.asset} held from ${
    toDate(chunk.receiveDate)
  } - ${toDate(chunk.disposeDate) || "present"}`;
};
