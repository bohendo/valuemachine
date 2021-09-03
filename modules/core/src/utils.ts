import {
  Asset,
  DecimalString,
  AssetChunk,
  Balances,
  ChunkIndex,
  Event,
  EventTypes,
  HydratedEvent,
  Transfers,
} from "@valuemachine/types";
import { add, eq, gt, round, sub } from "@valuemachine/utils";

const { Expense, Income, Trade, Debt, GuardChange } = EventTypes;
const toDate = timestamp => timestamp?.includes("T") ? timestamp.split("T")[0] : timestamp;

type Value = {
  asset: Asset;
  quantity: DecimalString;
};
const sumValue = (values: Array<Value>): Balances => {
  const totals = {} as Balances;
  if (!values?.length) return totals;
  values.forEach(value => {
    if (typeof value !== "number" && gt(value.quantity, "0")) {
      totals[value.asset] = add(totals[value.asset], value.quantity);
    }
  });
  return totals;
};
export const sumTransfers = (transfers: Transfers[]): Balances => sumValue(transfers as Value[]);
export const sumChunks = (chunks: Transfers[]): Balances => sumValue(chunks as Value[]);

// annihilate values that are present in both balances
export const diffBalances = (balancesList: Balances[]): Balances[] => {
  if (balancesList.length !== 2) return balancesList; // we can only diff 2 balances
  const output = [{ ...balancesList[0] }, { ...balancesList[1] }];
  for (const asset of Object.keys(output[0])) {
    if (asset in output[0] && asset in output[1]) {
      if (gt(output[0][asset], output[1][asset])) {
        output[0][asset] = sub(output[0][asset], output[1][asset]);
        delete output[1][asset];
      } else {
        output[1][asset] = sub(output[1][asset], output[0][asset]);
        delete output[0][asset];
        if (eq(output[1][asset], "0")) {
          delete output[1][asset];
        }
      }
    }
  }
  return output;
};

export const describeChunk = (chunk: AssetChunk): string => {
  return `${round(chunk.quantity)} ${chunk.asset} held from ${
    toDate(chunk.history?.[0]?.date || "???")
  } - ${toDate(chunk.disposeDate) || "present"}`;
};

export const describeEvent = (event: Event | HydratedEvent): string => {
  const describeChunks = (chunks: Array<AssetChunk | ChunkIndex>): string =>
    Object.entries(sumChunks(chunks))
      .map(([asset, amount]) => `${round(amount, 4)} ${asset}`)
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
  } else {
    return `Unknown event`;
  }
};
