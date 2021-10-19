import {
  Amount,
  Asset,
  AssetChunk,
  Balances,
  Transfer,
  ValueMachineJson,
} from "@valuemachine/types";

import { add, eq, gt, round, sub } from "./math";
import { ajv, formatErrors } from "./validate";

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

type Value = {
  asset: Asset;
  amount: Amount;
};
const sumValue = (values: Array<Value>): Balances => {
  const result = values.reduce((total, value) => {
    if (!value.amount) {
      return { ...total, [value.asset]: "1" }; // Treat NFTs as always having an amount of 1
    } else if (value.amount !== "ALL" && !eq(value.amount, "0")) {
      return { ...total, [value.asset]: add(total[value.asset], value.amount) };
    } else {
      return total;
    }
  }, {} as Balances);
  // Clean up result of any positive & negative chunks that perfectly cancelled out
  for (const asset of Object.keys(result)) {
    if (eq(result[asset], "0")) {
      delete result[asset];
    }
  }
  return result;
};

export const sumTransfers = (transfers: Transfer[]): Balances => sumValue(transfers as Value[]);
export const sumChunks = (chunks: AssetChunk[]): Balances => sumValue(chunks as Value[]);

export const describeBalance = (balance: Balances): string =>
  Object.keys(balance).map(asset =>
    eq(balance[asset], "1") && asset.includes("_")
      ? asset
      : `${round(balance[asset])} ${asset}`
  ).join(" and ");

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

export const mergeBalances = (balancesList: Balances[]): Balances =>
  balancesList.reduce((total, bal) => {
    Object.entries(bal).forEach(entry => { total[entry[0]] = entry[1]; });
    return total;
  }, {} as Balances);
