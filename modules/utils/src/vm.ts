import {
  ValueMachineJson,
  Asset,
  AssetChunk,
  Balances,
  DecimalString,
  Transfer,
} from "@valuemachine/types";

import { add, eq, gt, round as defaultRound, sub } from "./math";
import { ajv, formatErrors } from "./validate";

const round = n => defaultRound(n, 6).replace(/0+$/, "0");

export const getEmptyValueMachine = (): ValueMachineJson => ({
  chunks: [],
  date: (new Date(0)).toISOString(),
  events: [],
});

const validateValueMachine = ajv.compile(ValueMachineJson);
export const getValueMachineError = (vmJson: ValueMachineJson): string | null =>
  validateValueMachine(vmJson)
    ? null
    : validateValueMachine.errors.length ? formatErrors(validateValueMachine.errors)
    : `Invalid ValueMachine`;

type Value = {
  asset: Asset;
  amount: DecimalString;
};
const sumValue = (values: Array<Value>): Balances => {
  const totals = {} as Balances;
  if (!values?.length) return totals;
  values.forEach(value => {
    if (value?.amount && !eq(value.amount, "0")) {
      totals[value.asset] = add(totals[value.asset], value.amount);
    }
  });
  return totals;
};
export const sumTransfers = (transfers: Transfer[]): Balances => sumValue(transfers as Value[]);
export const sumChunks = (chunks: AssetChunk[]): Balances => sumValue(chunks as Value[]);

export const describeBalance = (balance: Balances): string =>
  Object.keys(balance).map(asset => `${round(balance[asset])} ${asset}`).join(" and ");

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
